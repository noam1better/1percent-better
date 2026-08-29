// Five PRIME life pillars — content taxonomy and recommendation axis
export const PILLARS = [
  {
    id: 'body',
    label: 'גוף',
    emoji: '💪',
    color: '#10b981',
    desc: 'כושר, תנועה, שינה, תזונה, אנרגיה',
  },
  {
    id: 'discipline',
    label: 'משמעת',
    emoji: '🧠',
    color: '#6366f1',
    desc: 'פוקוס, עקביות, שגרה, ניהול זמן',
  },
  {
    id: 'growth',
    label: 'התפתחות',
    emoji: '📚',
    color: '#f59e0b',
    desc: 'קריאה, לימוד, מיומנויות, סקרנות',
  },
  {
    id: 'people',
    label: 'אנשים',
    emoji: '🤝',
    color: '#ec4899',
    desc: 'חברויות, משפחה, תקשורת, ביטחון',
  },
  {
    id: 'life',
    label: 'חיים ויצירה',
    emoji: '🎨',
    color: '#a78bfa',
    desc: 'תחביבים, יצירתיות, חוויות חדשות, אמנות',
  },
]

export const DEFAULT_PILLARS = ['discipline', 'body']

export function getPillar(id) {
  return PILLARS.find(p => p.id === id) || null
}

// Map surprise-mission categories to pillars for recommendations
export const CATEGORY_TO_PILLAR = {
  fitness:    'body',
  creativity: 'life',
  social:     'people',
  mindset:    'discipline',
  learning:   'growth',
  community:  'people',
  adventure:  'life',
  dating:     'people',
}
