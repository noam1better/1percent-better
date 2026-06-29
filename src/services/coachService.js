import { GoogleGenerativeAI } from '@google/generative-ai'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''
const genAI   = new GoogleGenerativeAI(API_KEY)

export function coachConfigured() {
  return !!API_KEY && API_KEY !== 'YOUR_KEY_HERE'
}

const EXERCISE_PROMPTS = {
  pushups: 'The user is performing push-ups. Analyze: hand placement width, body alignment (straight line head to heels), core engagement, elbow angle and flare at the bottom, neck position, and hip sag.',
  pullups: 'The user is performing pull-ups. Analyze: grip width and type, shoulder blade engagement (scapular retraction), chin height relative to bar, body swing or kipping, and lat activation.',
  dips:    'The user is performing dips. Analyze: elbow flare, forward lean angle (chest dips vs tricep dips), shoulder depression and stability, wrist alignment, and depth of the movement.',
  squats:  'The user is performing squats. Analyze: knee tracking over toes, squat depth, spine neutrality and back angle, foot stance width and toe angle, heel contact with ground, and chest position.',
  boxing:  'The user is performing boxing or Muay Thai. Analyze: stance width and weight distribution, guard position and chin tuck, shoulder protection, hip rotation and power generation, and overall defensive posture.',
}

const GOAL_CONTEXT = {
  fitness:  'Focus on exercise form, muscle engagement, body alignment, and movement technique.',
  trading:  'Focus on desk ergonomics, sitting posture, and eye-level for a productive trading session.',
  work:     'Focus on desk posture, shoulder position, screen distance, and workspace ergonomics.',
  mindful:  'Focus on meditation posture, body alignment, breathing position, and relaxed but upright form.',
  learning: 'Focus on study posture, head position, and desk setup for sustained focus.',
  creative: 'Focus on body posture, arm position, and workspace setup for creative flow.',
}

const EXERCISE_NAMES_HE = {
  pushups: 'שכיבות שמיכה',
  pullups: 'מתח',
  dips:    'מקבילים',
  squats:  'סקוואטים',
  boxing:  'אגרוף / מואי תאי',
}

export async function analyzeForm(base64Image, exercise, focusGoal) {
  const context = exercise
    ? EXERCISE_PROMPTS[exercise]
    : (GOAL_CONTEXT[focusGoal] || 'Analyze posture, form, and body alignment.')

  const prompt =
    `You are an expert fitness and biomechanics coach. ${context} ` +
    `Look at this image carefully and give specific, actionable coaching feedback. ` +
    `Be encouraging but precise. Keep your response to 2–4 sentences. Plain text only, no markdown.`

  const model  = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  const result = await model.generateContent({
    contents: [{
      parts: [
        { text: prompt },
        { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
      ],
    }],
  })
  return result.response.text()
}

export async function verifyDayCompletion(challengeTitle, dayNum, taskDesc, userText) {
  if (!API_KEY || API_KEY === 'YOUR_KEY_HERE') {
    // No key — approve if answer is at least 25 chars
    const ok = userText.trim().length >= 25
    return { approved: ok, feedback: ok ? 'Great work! Keep it up.' : 'Please write at least a sentence describing what you did.' }
  }

  const model  = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  const prompt =
    `You are a strict accountability coach for the "${challengeTitle}" challenge.\n` +
    `Today is Day ${dayNum}. The task was: "${taskDesc}".\n` +
    `The user wrote: "${userText.trim()}"\n\n` +
    `Rules:\n` +
    `- Minimum 20 characters\n` +
    `- Must describe a real action taken, not just "I did it"\n` +
    `- Should be at least loosely related to the challenge theme\n\n` +
    `Reply ONLY with valid JSON (no markdown): {"approved": true/false, "feedback": "one short sentence"}`

  try {
    const result = await model.generateContent(prompt)
    const raw    = result.response.text().trim().replace(/```json|```/g, '')
    const match  = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('no json')
    return JSON.parse(match[0])
  } catch {
    const ok = userText.trim().length >= 20
    return { approved: ok, feedback: ok ? 'Good effort — keep going!' : 'Add more detail about what you actually did today.' }
  }
}

export async function getFocusTip(taskTitle) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: 'You are a professional focus coach. Provide a single, punchy, actionable sentence on how to start this specific task immediately. Be motivating but direct.',
  })
  const result = await model.generateContent(`Task: ${taskTitle}`)
  return result.response.text().trim()
}

const CHALLENGE_FALLBACK = {
  trading:  'deal-closer',
  fitness:  'self-discipline',
  learning: 'ai-beginners',
  mindful:  'business-soul',
  work:     'business-mind',
  creative: 'product-builder',
}

const VALID_IDS = ['ai-beginners','business-mind','product-builder','deal-closer','ai-pioneer','business-soul','self-discipline']

export async function suggestChallenge(energy, timeAvail, focusGoal) {
  const fallback = CHALLENGE_FALLBACK[focusGoal] || 'ai-beginners'
  if (!API_KEY || API_KEY === 'YOUR_KEY_HERE') return fallback

  const model  = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  const prompt =
    `You are a personal growth coach. Pick the single best challenge track for this user.\n` +
    `Energy level: ${energy}\n` +
    `Daily time available: ${timeAvail} minutes\n` +
    `Main focus area: ${focusGoal}\n\n` +
    `Available track IDs: ${VALID_IDS.join(', ')}\n\n` +
    `Rules:\n` +
    `- Low energy → prefer self-discipline or business-soul\n` +
    `- High energy + 60+ min → prefer ai-pioneer or product-builder\n` +
    `- trading/work focus → deal-closer or business-mind\n` +
    `- fitness focus → self-discipline\n` +
    `- learning focus → ai-beginners or ai-pioneer\n` +
    `- mindful/creative → business-soul or product-builder\n\n` +
    `Reply with ONLY the track ID. No explanation, no punctuation.`

  try {
    const result = await model.generateContent(prompt)
    const id     = result.response.text().trim().toLowerCase().replace(/[^a-z-]/g, '')
    return VALID_IDS.includes(id) ? id : fallback
  } catch {
    return fallback
  }
}

export async function analyzeSession(exercise, { reps, duration, formScore }) {
  const name     = EXERCISE_NAMES_HE[exercise] || exercise
  const repLabel = exercise === 'boxing' ? 'אגרופים' : 'חזרות'

  const prompt =
    `אתה מאמן כושר ובמיומינות ביומכניקה מנוסה. המשתמש סיים סשן אימון עם ניתוח AI בזמן אמת:\n` +
    `תרגיל: ${name}\n` +
    `משך: ${duration} שניות\n` +
    `${repLabel}: ${reps}\n` +
    `ציון נוכחות בפריים (איכות זיהוי): ${formScore}/100\n\n` +
    `כתוב משוב מאמן בעברית בלבד. 3-4 משפטים. היה מעודד וספציפי. ` +
    `ציין מה הלך טוב ו-1-2 נקודות לשיפור על סמך הנתונים. טקסט רגיל בלבד, ללא markdown.`

  const model  = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  const result = await model.generateContent(prompt)
  return result.response.text()
}
