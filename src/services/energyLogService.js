const KEY = 'prime_energy_log'

export const ENERGY_TAGS = [
  { id: 'electric', label: '⚡ אלקטרי', color: '#fbbf24' },
  { id: 'focused',  label: '🎯 ממוקד',  color: '#818cf8' },
  { id: 'drained',  label: '😮‍💨 מרוקן',  color: '#94a3b8' },
]

export function logEnergy(tag) {
  try {
    const all   = JSON.parse(localStorage.getItem(KEY) || '[]')
    const today = new Date().toISOString().slice(0, 10)
    const rest  = all.filter(e => e.date !== today)
    localStorage.setItem(KEY, JSON.stringify([{ date: today, tag, ts: Date.now() }, ...rest].slice(0, 30)))
  } catch {}
}

export function getTodayEnergy() {
  try {
    const all   = JSON.parse(localStorage.getItem(KEY) || '[]')
    const today = new Date().toISOString().slice(0, 10)
    return all.find(e => e.date === today)?.tag || null
  } catch { return null }
}

export function getEnergyLog(days = 7) {
  try {
    const all    = JSON.parse(localStorage.getItem(KEY) || '[]')
    const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)
    return all.filter(e => e.date >= cutoff)
  } catch { return [] }
}
