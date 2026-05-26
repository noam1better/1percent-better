// In-memory store for the current growth package, mirroring websiteStore pattern.

let _pending = null

export function setGrowthStore(pkg) { _pending = pkg }
export function getGrowthStore() { const p = _pending; _pending = null; return p }
export function peekGrowthStore() { return _pending }
