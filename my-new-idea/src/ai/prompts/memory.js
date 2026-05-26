// Builds memory context string to inject into prompts

export function buildMemoryContext(memory) {
  if (!memory?.sessions?.length) return ''
  const parts = []
  const recent = memory.sessions.slice(-3)
  if (recent.length) {
    parts.push('Previous generations this session:')
    recent.forEach((s, i) => {
      parts.push(`${i + 1}. ${s.bizType} in ${s.city || 'unknown'} — palette:${s.palette} — "${(s.prompt || '').slice(0, 60)}"`)
    })
  }
  if (memory.preferences?.preferredPalette)
    parts.push(`User preferred palette: ${memory.preferences.preferredPalette}`)
  if (memory.preferences?.preferredTone)
    parts.push(`User preferred tone: ${memory.preferences.preferredTone}`)
  return parts.length ? '\n\nContext:\n' + parts.join('\n') : ''
}

export function buildEnrichedUserPrompt(rawPrompt, parsed, memory) {
  const ctx = buildMemoryContext(memory)
  const detected = [
    `Type: ${parsed.bizType}`,
    parsed.city    ? `City: ${parsed.city}`           : null,
    `Palette: ${parsed.palette}`,
    parsed.phone   ? `Phone: ${parsed.phone}`          : null,
    Object.entries(parsed.features).filter(([,v]) => v).length
      ? `Features: ${Object.entries(parsed.features).filter(([,v]) => v).map(([k]) => k).join(', ')}`
      : null,
  ].filter(Boolean).join(' | ')
  return `${rawPrompt}\n\nDetected: ${detected}${ctx}`
}
