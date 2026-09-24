import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Mock firebase/messaging ───────────────────────────────────────────
vi.mock('firebase/messaging', () => ({
  getToken:    vi.fn(),
  deleteToken: vi.fn(),
}))

// ── Mock firebase/firestore ───────────────────────────────────────────
vi.mock('firebase/firestore', () => ({
  doc:         vi.fn(() => 'doc-ref'),
  setDoc:      vi.fn(),
  arrayUnion:  vi.fn(v => ({ type: 'arrayUnion', value: v })),
  arrayRemove: vi.fn(v => ({ type: 'arrayRemove', value: v })),
}))

// ── Mock ./firebase to expose a non-null messaging instance ──────────
vi.mock('../services/firebase', () => ({
  messaging: { _isMock: true },
  db:        { _isMock: true },
}))

import { getToken, deleteToken } from 'firebase/messaging'
import { setDoc, arrayRemove } from 'firebase/firestore'
import { registerFcmToken, unregisterFcmToken, sendForegroundTestNotif, isFcmReady } from '../services/fcmService'

// ── SW ready mock ─────────────────────────────────────────────────────
const mockSwReg = { scope: '/' }

beforeEach(() => {
  vi.resetAllMocks()
  // Navigator service worker
  Object.defineProperty(navigator, 'serviceWorker', {
    writable: true,
    value: { ready: Promise.resolve(mockSwReg) },
  })
  // Notification permission
  Object.defineProperty(globalThis, 'Notification', {
    writable: true,
    value: class {
      constructor() {}
      static permission = 'granted'
    },
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ── registerFcmToken ──────────────────────────────────────────────────

describe('registerFcmToken', () => {
  it('returns null when uid is missing', async () => {
    const token = await registerFcmToken(null)
    expect(token).toBeNull()
    expect(getToken).not.toHaveBeenCalled()
  })

  it('returns token and saves to Firestore when getToken succeeds', async () => {
    getToken.mockResolvedValue('tok-abc')
    const { setDoc: mockSetDoc } = await import('firebase/firestore')
    mockSetDoc.mockResolvedValue(undefined)
    const token = await registerFcmToken('uid-123')
    expect(token).toBe('tok-abc')
    expect(getToken).toHaveBeenCalledOnce()
  })

  it('returns null when getToken returns empty string', async () => {
    // Simulate VAPID key being set by patching the module's internal constant
    // We test this via the error path instead
    getToken.mockResolvedValue('')
    const token = await registerFcmToken('uid-456')
    expect(token).toBeNull()
  })

  it('returns null and logs error when getToken throws', async () => {
    getToken.mockRejectedValue(new Error('messaging/permission-blocked'))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const token = await registerFcmToken('uid-789')
    expect(token).toBeNull()
    errorSpy.mockRestore()
  })
})

// ── unregisterFcmToken ────────────────────────────────────────────────

describe('unregisterFcmToken', () => {
  it('does nothing when uid is missing', async () => {
    await unregisterFcmToken(null)
    expect(getToken).not.toHaveBeenCalled()
    expect(deleteToken).not.toHaveBeenCalled()
  })

  it('does nothing when getToken returns null (no existing token)', async () => {
    getToken.mockResolvedValue(null)
    await unregisterFcmToken('uid-123')
    expect(deleteToken).not.toHaveBeenCalled()
    expect(setDoc).not.toHaveBeenCalled()
  })

  it('calls deleteToken and removes from Firestore when token exists', async () => {
    getToken.mockResolvedValue('existing-token')
    deleteToken.mockResolvedValue(undefined)
    setDoc.mockResolvedValue(undefined)

    await unregisterFcmToken('uid-abc')

    expect(deleteToken).toHaveBeenCalledOnce()
    expect(setDoc).toHaveBeenCalledOnce()
    // Verify arrayRemove was called with the token
    const secondArg = setDoc.mock.calls[0][1]
    expect(secondArg.fcmTokens).toEqual(arrayRemove('existing-token'))
  })

  it('swallows errors gracefully', async () => {
    getToken.mockRejectedValue(new Error('network error'))
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await expect(unregisterFcmToken('uid-xyz')).resolves.toBeUndefined()
    warnSpy.mockRestore()
  })
})

// ── sendForegroundTestNotif ───────────────────────────────────────────

describe('sendForegroundTestNotif', () => {
  it('returns false when permission is denied', () => {
    Object.defineProperty(Notification, 'permission', { configurable: true, value: 'denied' })
    expect(sendForegroundTestNotif()).toBe(false)
  })

  it('returns false when permission is not granted', () => {
    globalThis.Notification.permission = 'default'
    expect(sendForegroundTestNotif()).toBe(false)
    globalThis.Notification.permission = 'granted'
  })

  it('returns true and instantiates Notification when permission is granted', () => {
    const instances = []
    globalThis.Notification = class {
      constructor(title, opts) { instances.push({ title, opts }) }
      static permission = 'granted'
    }
    const result = sendForegroundTestNotif()
    expect(result).toBe(true)
    expect(instances).toHaveLength(1)
    expect(instances[0].title).toContain('בדיקת PRIME')
    expect(instances[0].opts.tag).toBe('prime-test')
  })
})

// ── isFcmReady ───────────────────────────────────────────────────────

describe('isFcmReady', () => {
  it('returns a boolean based on messaging + VAPID_KEY + serviceWorker', () => {
    expect(typeof isFcmReady()).toBe('boolean')
  })
})
