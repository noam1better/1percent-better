// In-memory store for passing a generated website between pages.
// Avoids JSON.stringify/JSON.parse round-trip bugs with sessionStorage.
// Falls back to sessionStorage only as secondary persistence.

let _pending = null

export function setWebsiteStore(website) {
  _pending = website
}

export function getWebsiteStore() {
  const w = _pending
  _pending = null
  return w
}

export function peekWebsiteStore() {
  return _pending
}
