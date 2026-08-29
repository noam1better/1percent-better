import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { computeHobbyResults, HOBBY_DAYS } from '../data/hobbyDiscovery'
import HobbyDiscoveryProgress from '../components/HobbyDiscoveryProgress'

// ── computeHobbyResults unit tests ────────────────────────────────

describe('computeHobbyResults', () => {
  it('returns empty results when responses is empty', () => {
    const result = computeHobbyResults({})
    expect(result.top).toEqual([])
    expect(result.loved).toEqual([])
    expect(result.noped).toEqual([])
    expect(result.recommended).toBeNull()
  })

  it('returns empty results when responses is undefined', () => {
    const result = computeHobbyResults()
    expect(result.top).toEqual([])
    expect(result.loved).toEqual([])
  })

  it('counts single loved response correctly', () => {
    const result = computeHobbyResults({ '1': 'loved' })
    // day 1 = photography, score 2
    expect(result.top).toContain('photography')
    expect(result.loved).toContain('צילום')
  })

  it('counts ok response as score 1, nope as score 0', () => {
    const result = computeHobbyResults({ '1': 'loved', '2': 'ok', '3': 'nope' })
    // photography=2, drawing=1, writing=0 → only photography and drawing in top
    expect(result.top[0]).toBe('photography')
    expect(result.top).toContain('drawing')
    expect(result.top).not.toContain('writing')
    expect(result.noped).toContain('כתיבה')
  })

  it('returns top 3 hobbies maximum', () => {
    const responses = {}
    HOBBY_DAYS.forEach(d => { responses[String(d.day)] = 'loved' })
    const result = computeHobbyResults(responses)
    expect(result.top.length).toBeLessThanOrEqual(3)
  })

  it('handles tied scores — returns up to 3, all with equal score', () => {
    // All loved → all score 2 → top 3 returned
    const responses = {}
    HOBBY_DAYS.forEach(d => { responses[String(d.day)] = 'loved' })
    const result = computeHobbyResults(responses)
    expect(result.top.length).toBe(3)
    // All loved labels should be present
    expect(result.loved.length).toBe(HOBBY_DAYS.length)
  })

  it('handles missing day keys as score 0 — does not throw', () => {
    // Only days 5 and 10 answered
    const result = computeHobbyResults({ '5': 'loved', '10': 'ok' })
    expect(result.top[0]).toBe('music')  // loved=2
    expect(result.top).toContain('language')  // ok=1
    expect(() => computeHobbyResults({ '99': 'loved' })).not.toThrow()
  })

  it('handles malformed response values gracefully', () => {
    // Invalid response values → treated as 0 (same as nope/missing)
    const result = computeHobbyResults({ '1': 'maybe', '2': null, '3': 123 })
    expect(result.top).toEqual([])
    expect(result.loved).toEqual([])
  })

  it('does not mutate the input responses object', () => {
    const responses = { '1': 'loved', '3': 'ok' }
    const originalKeys = Object.keys(responses)
    const originalValues = Object.values(responses)
    computeHobbyResults(responses)
    expect(Object.keys(responses)).toEqual(originalKeys)
    expect(Object.values(responses)).toEqual(originalValues)
    expect(responses['1']).toBe('loved')
    expect(responses['3']).toBe('ok')
  })

  it('does not mutate HOBBY_DAYS during calculation', () => {
    const originalFirstDay = { ...HOBBY_DAYS[0] }
    computeHobbyResults({ '1': 'loved' })
    expect(HOBBY_DAYS[0]).toEqual(originalFirstDay)
  })

  it('recommended is null when no top hobby', () => {
    const result = computeHobbyResults({ '1': 'nope' })
    expect(result.recommended).toBeNull()
  })

  it('recommended is set when top hobby exists', () => {
    const result = computeHobbyResults({ '1': 'loved' })
    expect(result.recommended).not.toBeNull()
    expect(result.recommended).toHaveProperty('label')
    expect(result.recommended).toHaveProperty('id')
  })

  it('partial responses (fewer than 14 days) produce correct partial results', () => {
    // Days 1-3 only
    const result = computeHobbyResults({ '1': 'loved', '2': 'ok', '3': 'nope' })
    expect(result.top.length).toBeGreaterThan(0)
    expect(result.loved).toEqual(['צילום'])
    expect(result.noped).toEqual(['כתיבה'])
  })
})

// ── HobbyDiscoveryProgress component tests ────────────────────────

describe('HobbyDiscoveryProgress', () => {
  it('renders nothing when hobby discovery was never started', () => {
    const { container } = render(
      <HobbyDiscoveryProgress hobbyDiscovery={null} challenges={{}} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing with undefined props (never started)', () => {
    const { container } = render(
      <HobbyDiscoveryProgress />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when daysCompleted is 0 and no responses', () => {
    const { container } = render(
      <HobbyDiscoveryProgress
        hobbyDiscovery={{ responses: {} }}
        challenges={{ 'hobby-discovery': { daysCompleted: 0 } }}
      />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders in-progress view when daysCompleted > 0 and < 14', () => {
    render(
      <HobbyDiscoveryProgress
        hobbyDiscovery={{ responses: { '1': 'loved', '2': 'ok' } }}
        challenges={{ 'hobby-discovery': { daysCompleted: 3 } }}
      />
    )
    expect(screen.getByTestId('hobby-inprogress')).toBeInTheDocument()
    expect(screen.getByText(/יום 3 מתוך 14/)).toBeInTheDocument()
  })

  it('shows correct progress percentage', () => {
    render(
      <HobbyDiscoveryProgress
        hobbyDiscovery={{ responses: {} }}
        challenges={{ 'hobby-discovery': { daysCompleted: 7 } }}
      />
    )
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('does not show leading interests with fewer than 5 responses', () => {
    render(
      <HobbyDiscoveryProgress
        hobbyDiscovery={{ responses: { '1': 'loved', '2': 'loved' } }}
        challenges={{ 'hobby-discovery': { daysCompleted: 4 } }}
      />
    )
    expect(screen.queryByText(/מתחיל להתגבש/)).not.toBeInTheDocument()
  })

  it('shows leading interests with 5 or more responses', () => {
    render(
      <HobbyDiscoveryProgress
        hobbyDiscovery={{ responses: { '1': 'loved', '2': 'loved', '3': 'loved', '4': 'ok', '5': 'ok' } }}
        challenges={{ 'hobby-discovery': { daysCompleted: 7 } }}
      />
    )
    expect(screen.getByText(/מתחיל להתגבש/)).toBeInTheDocument()
  })

  it('renders completed view when daysCompleted >= 14', () => {
    const responses = {}
    HOBBY_DAYS.forEach(d => { responses[String(d.day)] = 'loved' })
    render(
      <HobbyDiscoveryProgress
        hobbyDiscovery={{ responses }}
        challenges={{ 'hobby-discovery': { daysCompleted: 14 } }}
      />
    )
    expect(screen.getByTestId('hobby-completed')).toBeInTheDocument()
    expect(screen.getByText(/תוצאות גילוי התחביב/)).toBeInTheDocument()
  })

  it('renders insufficient-data view when completed but < 3 responses', () => {
    render(
      <HobbyDiscoveryProgress
        hobbyDiscovery={{ responses: { '1': 'loved' } }}
        challenges={{ 'hobby-discovery': { daysCompleted: 14 } }}
      />
    )
    expect(screen.getByTestId('hobby-completed-insufficient')).toBeInTheDocument()
  })

  it('renders insufficient-data view when completed with no responses', () => {
    render(
      <HobbyDiscoveryProgress
        hobbyDiscovery={{ responses: {} }}
        challenges={{ 'hobby-discovery': { daysCompleted: 14 } }}
      />
    )
    expect(screen.getByTestId('hobby-completed-insufficient')).toBeInTheDocument()
  })

  it('renders partially — visible with just daysCompleted, no response data', () => {
    render(
      <HobbyDiscoveryProgress
        hobbyDiscovery={null}
        challenges={{ 'hobby-discovery': { daysCompleted: 2 } }}
      />
    )
    expect(screen.getByTestId('hobby-inprogress')).toBeInTheDocument()
  })

  it('shows disclaimer text in completed view', () => {
    const responses = {}
    HOBBY_DAYS.forEach(d => { responses[String(d.day)] = 'ok' })
    render(
      <HobbyDiscoveryProgress
        hobbyDiscovery={{ responses }}
        challenges={{ 'hobby-discovery': { daysCompleted: 14 } }}
      />
    )
    expect(screen.getByText(/ההמלצה מבוססת על הפעילויות/)).toBeInTheDocument()
    expect(screen.getByText(/זו נקודת פתיחה, לא אבחנה/)).toBeInTheDocument()
  })

  it('handles malformed responses object gracefully', () => {
    render(
      <HobbyDiscoveryProgress
        hobbyDiscovery={{ responses: 'invalid' }}
        challenges={{ 'hobby-discovery': { daysCompleted: 5 } }}
      />
    )
    // Should still show in-progress (daysCompleted > 0)
    expect(screen.getByTestId('hobby-inprogress')).toBeInTheDocument()
  })

  it('handles array responses object gracefully', () => {
    render(
      <HobbyDiscoveryProgress
        hobbyDiscovery={{ responses: ['loved', 'ok'] }}
        challenges={{ 'hobby-discovery': { daysCompleted: 3 } }}
      />
    )
    expect(screen.getByTestId('hobby-inprogress')).toBeInTheDocument()
  })
})
