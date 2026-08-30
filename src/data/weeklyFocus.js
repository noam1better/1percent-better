// Weekly pillar rotation — shifts daily emphasis to break monotony
export const WEEKLY_FOCUS = [
  { day: 0, label: 'התאוששות', emoji: '🧘', desc: 'מנוחה פעילה — מתיחות, נשימה, וסקירת השבוע' },
  { day: 1, label: 'משמעת',   emoji: '⚡', desc: 'הרגלי ליבה, שגרת בוקר, ואפס דחיינות' },
  { day: 2, label: 'לחימה',   emoji: '🥊', desc: 'פרוטוקולי לחימה, איגרוף צל, ותנועה אינטנסיבית' },
  { day: 3, label: 'כוח',     emoji: '💪', desc: 'אימון כוח, משקל גוף, ופלאנק יומי' },
  { day: 4, label: 'חשיבה',   emoji: '🧠', desc: 'קריאה, לימוד ממוקד, ומדיטציה' },
  { day: 5, label: 'עסקים',   emoji: '📈', desc: 'קוד, מוצר, ובניית מיומנות כלכלית' },
  { day: 6, label: 'סיבולת',  emoji: '🏃', desc: 'ריצה, סיבולת לב-ריאה, ושהייה בחוץ' },
]

export function getTodayFocus() {
  return WEEKLY_FOCUS[new Date().getDay()]
}
