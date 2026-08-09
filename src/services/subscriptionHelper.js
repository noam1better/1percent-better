export function isPro(profile) {
  return profile?.tier === 'pro'
}

export function isFree(profile) {
  return !isPro(profile)
}
