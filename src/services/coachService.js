import { callGemini, geminiAvailable } from './geminiClient'

export function coachConfigured() {
  return geminiAvailable()
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
  pushups: 'שכיבות סמיכה',
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

  return callGemini({ prompt, imageBase64: base64Image, imageMimeType: 'image/jpeg' })
}

export async function verifyDayCompletion(challengeTitle, dayNum, taskDesc, userText) {
  if (!geminiAvailable()) {
    const ok = userText.trim().length >= 25
    return { approved: ok, feedback: ok ? 'Great work! Keep it up.' : 'Please write at least a sentence describing what you did.' }
  }

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
    const raw    = (await callGemini({ prompt })).replace(/```json|```/g, '').trim()
    const start  = raw.indexOf('{')
    const end    = raw.lastIndexOf('}')
    if (start === -1 || end === -1) throw new Error('no json')
    const parsed = JSON.parse(raw.slice(start, end + 1))
    if (typeof parsed.approved !== 'boolean') throw new Error('bad schema')
    return parsed
  } catch (err) {
    console.error('[verifyDayCompletion] fallback:', err?.message)
    const ok = userText.trim().length >= 25
    return { approved: ok, feedback: ok ? 'Good effort — keep going!' : 'Add more detail about what you actually did today.' }
  }
}

export async function getFocusTip(taskTitle) {
  return callGemini({
    prompt: `Task: ${taskTitle}`,
    systemInstruction: 'You are a professional focus coach. Provide a single, punchy, actionable sentence on how to start this specific task immediately. Be motivating but direct.',
  })
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
  if (!geminiAvailable()) return fallback

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
    const id = (await callGemini({ prompt })).toLowerCase().replace(/[^a-z-]/g, '')
    return VALID_IDS.includes(id) ? id : fallback
  } catch {
    return fallback
  }
}

export async function analyzeVideoForm(base64Frame, exerciseName) {
  if (!geminiAvailable()) return null

  const prompt =
    `You are an expert strength and conditioning coach. Analyze the provided workout image for the exercise: ${exerciseName}.\n` +
    `Respond ONLY in Hebrew. Give exactly 3 numbered lines with NO markdown:\n` +
    `1. הערכת חזרות — estimate the rep count or stage of movement based on body position\n` +
    `2. ביקורת טכניקה — a specific critique on form (e.g., back alignment, range of motion, joint position)\n` +
    `3. שיפור לסט הבא — one actionable improvement for the next set\n` +
    `Be direct and specific. Plain text only — no asterisks, no bold, no bullet symbols.`

  try {
    return await callGemini({ prompt, imageBase64: base64Frame, imageMimeType: 'image/jpeg' })
  } catch {
    return null
  }
}

export async function getDisciplineCoachMessage({ goalMinutes, activity, streak, completed, minutesDone, history }) {
  const historyLines = history.slice(0, 7)
    .map(h => `${h.date}: ${h.completed ? `✓ ${h.minutesDone} דקות` : '✗ לא הושלם'}`)
    .join('\n')

  const levelUpTrigger    = completed && streak > 0 && streak % 3 === 0
  const newGoalSuggestion = goalMinutes + 5

  const prompt =
    `אתה מאמן משמעת סמכותי. היה תמציתי, ישיר, ממוקד בעקביות — לא רך ולא מפנק.\n\n` +
    `מטרה יומית נוכחית: ${goalMinutes} דקות ${activity}\n` +
    `רצף ימים: ${streak}\n` +
    `היום: ${completed ? `הושלם ✓ (${minutesDone} דקות)` : 'לא הושלם ✗'}\n` +
    `היסטוריה (7 ימים אחרונים):\n${historyLines}\n\n` +
    `${levelUpTrigger
      ? `המשתמש השלים ${streak} ימים ברצף. זו הישג אמיתי. הצע לשדרג את המטרה ל-${newGoalSuggestion} דקות ${activity} מחר.`
      : completed
        ? `המשתמש עמד במטרה היום. חזק אותו בקצרה וזרז אותו להמשיך מחר.`
        : `המשתמש לא עמד במטרה היום. תן לו משוב ישיר וקשוח — אל תפנק. נתח מה כנראה השתבש ואיך לתקן מחר.`
    }\n\n` +
    `השב בעברית בלבד. 2–3 משפטים. ללא markdown. ישיר ומוטיבציוני.`

  try {
    return await callGemini({ prompt })
  } catch {
    return completed
      ? 'כל הכבוד על ההשלמה. שמור על הקצב — המשמעת בנויה יום אחד בכל פעם.'
      : 'לא השלמת היום. אנחנו לא מתנצלים ולא מסבירים — חוזרים מחר ועושים.'
  }
}

export async function getFutureSelfReminder(currentXP, projectedXP, streak) {
  const MESSAGES = [
    `ה-XP שלך יהיה ${projectedXP.toLocaleString()} בעוד 30 יום. הגרסה העתידית שלך בונה את הבסיס עכשיו — מה אתה עושה בשבילה היום?`,
    `רצף של ${streak} ימים. בעוד 30 יום, האדם שאתה הופך אליו יסתכל אחורה על היום הזה. תבחר נכון.`,
    `מ-${currentXP} XP ל-${projectedXP.toLocaleString()} XP — זה מה שנראה עכשיו אם תמשיך. כל יום שאתה מחמיץ הוא XP שלך שנשאר על השולחן.`,
    `העצמי העתידי שלך מסתכל עלייך עכשיו. הוא לא מחכה לתנאים מושלמים — הוא מסתכל אם אתה פועל בלעדיהם.`,
    `30 ימים מהיום: ${projectedXP.toLocaleString()} XP, רמה ${Math.floor(projectedXP / 100) + 1}. זה לא חלום — זו מתמטיקה. הצעד הבא שלך קובע.`,
  ]
  const idx = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % MESSAGES.length
  if (!geminiAvailable()) return MESSAGES[idx]

  try {
    const prompt =
      `You are a psychological performance coach speaking directly to the user in Hebrew.\n` +
      `Current XP: ${currentXP}, Projected XP in 30 days: ${projectedXP}, Streak: ${streak} days.\n` +
      `Write ONE punchy, direct Hebrew sentence (max 25 words) that makes them feel the gap between their current self and future self.\n` +
      `Be motivating but visceral — not fluffy. Plain text only.`
    return await callGemini({ prompt })
  } catch {
    return MESSAGES[idx]
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

  return callGemini({ prompt })
}
