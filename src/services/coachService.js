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
