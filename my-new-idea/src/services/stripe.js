/**
 * Stripe integration stubs.
 * Replace with real Stripe SDK calls when subscriptions are ready.
 *
 * Architecture:
 *   - Frontend calls createCheckoutSession() → redirects to Stripe Checkout
 *   - Stripe webhook calls /api/stripe/webhook → updates user plan in Firestore
 *   - Frontend reads plan from user Firestore doc
 */

export const PLANS = {
  free: {
    id: 'free',
    label: 'חינמי',
    price: 0,
    credits: 30,
    websites: 1,
    leads: 50,
    features: ['אתר אחד', '30 קרדיטים', '50 לידים/חודש', 'BusinessBuilder credit'],
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    priceMonthly: 49,
    priceId: import.meta.env.VITE_STRIPE_PRO_PRICE_ID || 'price_placeholder',
    credits: 200,
    websites: 10,
    leads: -1, // unlimited
    features: ['10 אתרים', '200 קרדיטים', 'לידים ללא הגבלה', 'דומיין מותאם', 'ללא credit', 'עדיפות תמיכה'],
  },
  agency: {
    id: 'agency',
    label: 'Agency',
    priceMonthly: 199,
    priceId: import.meta.env.VITE_STRIPE_AGENCY_PRICE_ID || 'price_placeholder',
    credits: 1000,
    websites: -1,
    leads: -1,
    features: ['אתרים ללא הגבלה', '1000 קרדיטים', 'White label', 'Team accounts', 'API access'],
  },
}

export async function createCheckoutSession(priceId, userId) {
  // TODO: call your backend API: POST /api/stripe/create-checkout
  // const res = await fetch('/api/stripe/create-checkout', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ priceId, userId }),
  // })
  // const { url } = await res.json()
  // window.location.href = url
  console.log('[Stripe] createCheckoutSession stub — priceId:', priceId, 'userId:', userId)
  alert('Stripe integration coming soon! 🚀')
}

export async function createPortalSession(customerId) {
  // TODO: call your backend API: POST /api/stripe/portal
  console.log('[Stripe] createPortalSession stub — customerId:', customerId)
}

export function getUserPlan(user) {
  // TODO: read from Firestore user doc
  return 'free'
}
