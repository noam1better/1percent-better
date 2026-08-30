// Curated surprise mission library — 15+ missions per category, all in Hebrew
// Safety: no violence, no illegal, no spend-required, no public embarrassment
// Dating category is disabled by default and requires explicit opt-in

export const SURPRISE_CATEGORIES = [
  { id: 'fitness',    label: 'כושר',       emoji: '💪', defaultOn: true  },
  { id: 'creativity', label: 'יצירתיות',   emoji: '🎨', defaultOn: true  },
  { id: 'social',     label: 'חברתי',      emoji: '🤝', defaultOn: true  },
  { id: 'mindset',    label: 'חשיבה',      emoji: '🧠', defaultOn: true  },
  { id: 'learning',   label: 'למידה',      emoji: '📚', defaultOn: true  },
  { id: 'community',  label: 'קהילה',      emoji: '🌍', defaultOn: true  },
  { id: 'adventure',  label: 'הרפתקה',     emoji: '🎲', defaultOn: true  },
  { id: 'dating',     label: 'דייטינג',    emoji: '❤️', defaultOn: false },
]

export const DEFAULT_ENABLED_CATEGORIES = SURPRISE_CATEGORIES
  .filter(c => c.defaultOn)
  .map(c => c.id)

const MISSIONS = {
  fitness: [
    { id: 'fitness_1',  text: 'עשה 100 שכיבות סמיכה — מחולק איך שנוח לך, פרוס על כל היום' },
    { id: 'fitness_2',  text: 'צא להליכה של 30 דקות בלי טלפון — רק אתה והדרך' },
    { id: 'fitness_3',  text: 'עשה 5 דקות מתיחות מיד אחרי שאתה קם מהכיסא — בצע עכשיו' },
    { id: 'fitness_4',  text: 'תרגל 10 דקות איגרוף צל מול מראה — קצב + תנועה' },
    { id: 'fitness_5',  text: 'עשה 3 סטים של פלאנק — 45 שניות כל אחד, 30 שניות מנוחה ביניהם' },
    { id: 'fitness_6',  text: 'צא לריצה של 2 ק"מ — לא חשוב הקצב, חשוב שתצא' },
    { id: 'fitness_7',  text: 'עשה 50 ברפי — פרוס אותם איך שנוח לך על פני שעה' },
    { id: 'fitness_8',  text: 'תרגל 5 דקות תנועות מואי תאי בסיסיות: ג׳אב, קרוס, בעיטה' },
    { id: 'fitness_9',  text: 'עשה 20 מתחים — חלק ל-4 סטים של 5 עם מנוחה ביניהם' },
    { id: 'fitness_10', text: 'עשה 10 דקות של קפיצות חבל — נסה לא להפסיק יותר מפעמיים' },
    { id: 'fitness_11', text: 'עשה 4 סטים של 12 סקוואטים עם עצירה של 2 שניות בתחתית' },
    { id: 'fitness_12', text: 'תרגל 5 דקות של שיווי משקל על רגל אחת — 30 שניות לכל רגל, 5 פעמים' },
    { id: 'fitness_13', text: 'עשה round מלא: 10 שכיבות, 10 סקוואטים, 5 מתחים — חזור 3 פעמים' },
    { id: 'fitness_14', text: 'שחה 20 דקות — כל סגנון שנוח לך, העיקר שאתה בתנועה' },
    { id: 'fitness_15', text: 'עשה 15 דקות yoga flow בסיסי: ילד, לוחם, כלב הפוך' },
    { id: 'fitness_16', text: 'עשה cold shower — לפחות 2 דקות מים קרים, מלא' },
    { id: 'fitness_17', text: 'עשה sprint intervals: 30 שניות ריצה מהירה, 90 שניות הליכה — חזור 6 פעמים' },
  ],

  creativity: [
    { id: 'creativity_1',  text: 'כתוב שיר קצר של 4 שורות — על משהו שקרה היום, לא חשוב כמה טוב' },
    { id: 'creativity_2',  text: 'צייר משהו ב-10 דקות — עם עיפרון וניר, לא באפליקציה' },
    { id: 'creativity_3',  text: 'צלם 5 תמונות של דברים שמצאו חן בעיניך היום — בלי לחשוב יותר מדי' },
    { id: 'creativity_4',  text: 'כתוב פתק לעצמך לעתיד — שמור אותו לפתיחה בעוד שנה' },
    { id: 'creativity_5',  text: 'הלחן מנגינה של 8 תווים בכל אמצעי שיש לך — ואפילו רק בפה' },
    { id: 'creativity_6',  text: 'בנה משהו מניירות שיש לך — origami, מגדל, כל מה שעולה בראשך' },
    { id: 'creativity_7',  text: 'כתוב 200 מילים על חוויה שאתה רוצה לזכור — בפירוט חושי' },
    { id: 'creativity_8',  text: 'צור playlist של 7 שירים שמסכמים את השנה שלך — עם כותרת לkplaylist' },
    { id: 'creativity_9',  text: 'כתוב recipe מלא של המנה האהובה עליך — כאילו לספר בישול' },
    { id: 'creativity_10', text: 'צייר מפה של השכונה שגדלת בה מזיכרון — ללא google maps' },
    { id: 'creativity_11', text: 'כתוב 10 כינויים שהיית רוצה שיאמרו עליך בעוד 10 שנים' },
    { id: 'creativity_12', text: 'צלם "יום בחיים" — 10 תמונות שמספרות מה קרה היום' },
    { id: 'creativity_13', text: 'כתוב monologue של 150 מילים מנקודת מבט של דמות שאתה מעריץ' },
    { id: 'creativity_14', text: 'שנה משהו אחד בחדר שלך — הזז, הסר, הוסף, שנה — משהו שיגרום לך להסתכל אחרת' },
    { id: 'creativity_15', text: 'כתוב את 3 הרעיונות הכי "מטורפים" שיש לך כרגע — ללא ביקורת' },
    { id: 'creativity_16', text: 'קח תמונה אחת ותאר אותה ב-50 מילים — כאילו לאדם עיוור' },
  ],

  social: [
    { id: 'social_1',  text: 'שלח הודעה לאדם שלא דיברת איתו 3 חודשים — שאל מה שלומו, שאלה אחת אמיתית' },
    { id: 'social_2',  text: 'אמור תודה אמיתית לאדם אחד היום עם הסבר למה — לא בהודעה, בפנים' },
    { id: 'social_3',  text: 'שתף סיפור אישי אמיתי עם מישהו שאתה בוטח בו — משהו שלא סיפרת עדיין' },
    { id: 'social_4',  text: 'עשה מחמאה ספציפית ואמיתית לאדם שעבד קשה היום — לא "כל הכבוד" כללי' },
    { id: 'social_5',  text: 'הציע עזרה קונקרטית למישהו — לא "אם צריך", אלא "אני עושה X בשבילך"' },
    { id: 'social_6',  text: 'שלח voice note לאדם שמשמעותי לך — הגד לו מה אתה מעריך בו, בקול' },
    { id: 'social_7',  text: 'הזמן מישהו לפגישה ספציפית — קפה ב__, שעה __ — תיאם עכשיו ותקבל אישור' },
    { id: 'social_8',  text: 'שתף משהו שלמדת לאחרונה עם אדם שזה יכול לעזור לו — בהודעה, עם הקשר' },
    { id: 'social_9',  text: 'עשה אחד על אחד של 20 דקות עם אחד הקרובים לך — ללא מסכים' },
    { id: 'social_10', text: 'שתף תמונה ישנה עם מישהו שמופיע בה — ועם זיכרון ממנה בהודעה' },
    { id: 'social_11', text: 'שאל אדם אחד: "מה הכי אתגר אותך השבוע?" — ותשמע בלי לשפוט' },
    { id: 'social_12', text: 'שלח הודעה לאחד ההורים שלך: רק "חשבתי עליך היום" — ללא ריצוי' },
    { id: 'social_13', text: 'כתוב ביקורת אמיתית לעסק קטן שאהבת — עם פרטים ספציפיים' },
    { id: 'social_14', text: 'הצטרף לשיחה שאתה בדרך כלל נמנע ממנה — ותרום נקודת מבט אחת' },
    { id: 'social_15', text: 'שלח לינק לתוכן שעזר לך לחבר שרלוונטי לו — עם הסבר קצר למה' },
    { id: 'social_16', text: 'הגד "אני מתגעגע אליך" לאדם אחד — ותגדיר מתי אתם נפגשים' },
  ],

  mindset: [
    { id: 'mindset_1',  text: 'כתוב 5 דברים שאתה מודה עליהם — בפירוט: לא "הבריאות שלי", אלא מה בדיוק ולמה' },
    { id: 'mindset_2',  text: 'בלה 10 דקות ללא כל מסך — שב, לא תרגול, רק מחשבות בלי להדוף אותן' },
    { id: 'mindset_3',  text: 'כתוב על הפחד שהכי מעכב אותך כרגע — ואז כתוב מה המקרה הגרוע ביותר שיכול לקרות' },
    { id: 'mindset_4',  text: 'תרגל נשימת box: שאף 4, עצור 4, נשוף 4, עצור 4 — חזור 8 פעמים' },
    { id: 'mindset_5',  text: 'כתוב מכתב לעצמך מ-5 שנים קדימה — מה היית רוצה שתדע היום' },
    { id: 'mindset_6',  text: 'קבע כוונה אחת לשבוע — לא מטרה, כוונה: "אני מתכוון להיות __, גם כש__"' },
    { id: 'mindset_7',  text: 'עשה 5 דקות סריקת גוף: שב בשקט, סרוק מהראש לכפות הרגליים, שים לב בלי לשנות' },
    { id: 'mindset_8',  text: 'כתוב 3 החלטות שקיבלת השבוע שאתה גאה בהן — גם קטנות נחשבות' },
    { id: 'mindset_9',  text: 'קבע גבול אחד שנמנעת ממנו — אמור "לא" לדבר אחד היום' },
    { id: 'mindset_10', text: 'כתוב על גרסת עצמך שאתה שואף אליה ביום רגיל ממוצע — לא בהישגים, בהתנהגות' },
    { id: 'mindset_11', text: 'כתוב 5 דברים שמוציאים אותך מאזור הנוחות — ודרג אותם מ-1 עד 5 לפי פחד' },
    { id: 'mindset_12', text: 'כתוב על דבר אחד שכישלת בו לאחרונה — ומה למדת, ללא הגנתיות' },
    { id: 'mindset_13', text: 'בצע דמיון מודרך של 5 דקות: דמיין את היום המושלם שלך בעוד שנה — בפרטים חושיים' },
    { id: 'mindset_14', text: 'כתוב "ego statement": מה אתה לא מוכן לוותר עליו בשום מצב — ולמה זה מגדיר אותך' },
    { id: 'mindset_15', text: 'קרא ציטוט שמדבר אליך ושב איתו 5 דקות — לא scroll, לא הפרעות, רק המחשבה הזו' },
    { id: 'mindset_16', text: 'כתוב מה אתה מסיח את דעתך ממנו לאחרונה — ואז כתוב את הדבר הנדחה עצמו' },
  ],

  learning: [
    { id: 'learning_1',  text: 'קרא פרק אחד מספר שקנית ולא פתחת — ולו רק 15 דקות' },
    { id: 'learning_2',  text: 'ראה סרטון YouTube (15-20 דקות) על נושא שאתה לא מבין — ולא בתחום שלך' },
    { id: 'learning_3',  text: 'למד 5 מילים בשפה שאתה רוצה לדעת — וחזור עליהן 3 פעמים לפני שאתה ישן' },
    { id: 'learning_4',  text: 'קרא מאמר אחד בנושא שאתה בדרך כלל נמנע ממנו — פוליטיקה, מדע, פילוסופיה' },
    { id: 'learning_5',  text: 'כתוב סיכום של שיעור אחד שלמדת השבוע — כאילו אתה מסביר לאדם שלא מכיר את התחום' },
    { id: 'learning_6',  text: 'קרא ביוגרפיה של אדם שאתה מעריץ ב-Wikipedia — עד הסוף, בלי לדלג' },
    { id: 'learning_7',  text: 'שמע podcast episode אחד שלא הקשבת מאז נרשמת — בנהיגה או בהליכה' },
    { id: 'learning_8',  text: 'ראה TED Talk אחד ואז כתוב 3 נקודות שתקח ממנו' },
    { id: 'learning_9',  text: 'קרא about page של חברה שאתה מעריץ — הבן את הסיפור והמשימה שלהם' },
    { id: 'learning_10', text: 'כתוב 5 שאלות שאתה רוצה לדעת את התשובה שלהן עד סוף השנה' },
    { id: 'learning_11', text: 'למד לעשות דבר אחד שלא ידעת — 20 דקות עם YouTube, אחד, קטן, ספציפי' },
    { id: 'learning_12', text: 'שמע לאלבום מוזיקה שלם שלא הכרת — בקשב מלא, ללא multitasking' },
    { id: 'learning_13', text: 'בצע שיעור אחד מcourse שהתחלת ולא סיימת — היום, עכשיו' },
    { id: 'learning_14', text: 'קרא thread אחד ב-X/Twitter בנושא שאתה לא מסכים איתו — נסה להבין את הטיעון' },
    { id: 'learning_15', text: 'שאל עמית שלך שאלה אחת על תחום שלו — והקשב לתשובה כדי ללמוד, לא לענות' },
    { id: 'learning_16', text: 'גלה תחום אחד שאתה מתעניין בו על ידי חיפוש "intro to __ in 10 minutes"' },
  ],

  community: [
    { id: 'community_1',  text: 'התנדב שעה אחת — מקוון או פיזי, כל עמותה, כל עזרה' },
    { id: 'community_2',  text: 'שתף תוכן שמישהו מוכשר יצר — עם קרדיט אמיתי ומשפט אחד למה זה שווה' },
    { id: 'community_3',  text: 'עזור לאדם זר עם שאלה אחת — Reddit, Facebook group, כל פורום, תשובה מפורטת' },
    { id: 'community_4',  text: 'הצע mentor session חינמי של 30 דקות בנושא שאתה יודע — פרסם בלינקדאין או ישירות' },
    { id: 'community_5',  text: 'הצטרף לaircraft מקומי — Meetup, שיעור, workshop, אירוע — רשום עכשיו' },
    { id: 'community_6',  text: 'הגב בצורה בונה ומשמעותית לפוסט של מישהו שאתה לא מכיר' },
    { id: 'community_7',  text: 'שתף הצלחה קטנה שלך בפומבי — לא להתהדר, אלא לעורר אחרים' },
    { id: 'community_8',  text: 'הצטרף ל-discord או forum אחד בנושא שאתה מתעניין בו — כתוב פוסט היכרות' },
    { id: 'community_9',  text: 'כתוב ביקורת של 5 כוכבים לעסק קטן שממש אהבת — עם פירוט ספציפי' },
    { id: 'community_10', text: 'הצב עצמך לאחריות בפומבי: "עד __ אני אעשה __" — פרסם אותו' },
    { id: 'community_11', text: 'צרף אדם אחד לdiscipline routine, אפליקציה, או שיטה שעזרה לך' },
    { id: 'community_12', text: 'עזור לאדם אחד ללמוד משהו שאתה יודע — בזמן אמת, 20 דקות' },
    { id: 'community_13', text: 'שתף לינק מאמר שעזר לך לקבוצה שזה רלוונטי לה — עם הסבר לך' },
    { id: 'community_14', text: 'כתוב כללים שהיית רוצה שיהיו בקהילה שאתה חלק ממנה — 5 כללים' },
    { id: 'community_15', text: 'בקש משוב על עבודה שלך ממישהו שתכבד את דעתו — ותשמע בלי להגן' },
    { id: 'community_16', text: 'ארגן gathering קטן — 3-5 אנשים, נושא שמעניין אתכם, שעה, תאם היום' },
  ],

  adventure: [
    { id: 'adventure_1',  text: 'לך למסעדה שמעולם לא ניסית — הזמן ללא ביקורות, בטן גוברת' },
    { id: 'adventure_2',  text: 'תפוס תחבורה ציבורית לתחנה שלא ביקרת בה — וחקור את הסביבה שעה' },
    { id: 'adventure_3',  text: 'נסה פעילות ספורטיבית אחת שמעולם לא עשית — היום, לא "פעם"' },
    { id: 'adventure_4',  text: 'אכול ארוחה אחת לבד במקום ציבורי — ללא טלפון, רק מבט ומחשבות' },
    { id: 'adventure_5',  text: 'היכנס לחנות ספרים ותקנה את הספר הראשון שמשך את עינך — ללא מחקר' },
    { id: 'adventure_6',  text: 'דבר עם אדם זר היום — שאל אותו שאלה אחת אמיתית על חייו' },
    { id: 'adventure_7',  text: 'שנה את המסלול שלך היום לכל יעד — הלך דרך שלא הלכת, גלה משהו חדש' },
    { id: 'adventure_8',  text: 'לך לישון שעה מוקדם יותר מהרגיל — ללא מסכים שעה לפני השינה' },
    { id: 'adventure_9',  text: 'בשל ארוחה ממתכון שמעולם לא ניסית — בדיוק כפי שכתוב, ללא שינויים' },
    { id: 'adventure_10', text: 'בלה שעה בטבע — ים, ביער, פארק — ללא מוזיקה, רק קשב לסביבה' },
    { id: 'adventure_11', text: 'כתוב 5 הדברים שדחית הכי הרבה — ועשה את הקל שביניהם עכשיו' },
    { id: 'adventure_12', text: 'שב בבית קפה לבד שעה — ללא טלפון, רק עם מחברת, שים לב לאנשים' },
    { id: 'adventure_13', text: 'קנה ספר ישן מחנות יד שנייה — שנשמע מוזר או לא רלוונטי לך' },
    { id: 'adventure_14', text: 'עשה משהו ספונטני לפני השינה — לך לים, לפארק, לחנות 24/7, שבר שגרה' },
    { id: 'adventure_15', text: 'הצטלם מחוץ לגדר הנוחות שלך — תמונה שהייתה מפתיעה אותך לפני שנה' },
    { id: 'adventure_16', text: 'כתוב bucket list של 10 דברים — ואז בחר אחד ותקבע תאריך לעשות אותו' },
  ],

  dating: [
    { id: 'dating_1',  text: 'שלח הודעה לאדם שאוהד אותו: "שמח שאנחנו בקשר" — ושאל שאלה אחת אמיתית' },
    { id: 'dating_2',  text: 'הצע פגישה ספציפית: "קפה ביום __, שעה __" — לא "אולי פעם", תאריך ושעה' },
    { id: 'dating_3',  text: 'כתוב 5 דברים שאתה רוצה בשותף/ה — בכנות מלאה לעצמך, לא מה שנשמע טוב' },
    { id: 'dating_4',  text: 'שדרג פרופיל dating אחד שלך — תמונה חדשה + bio חדש שמשקף אותך היום' },
    { id: 'dating_5',  text: 'שלח הודעה ל-3 אנשים ב-apps עם opener אמיתי — לא "היי", אלא שאלה ספציפית' },
    { id: 'dating_6',  text: 'תרגל שיחה קטנה: דבר עם אדם זר בסופר, בבית קפה — שאלה אחת, קשר של רגע' },
    { id: 'dating_7',  text: 'כתוב מה את/ה מחפש ב-relationship — ואז כתוב מה את/ה נותן — שתי רשימות' },
    { id: 'dating_8',  text: 'עשה first move אחד שפחדת לעשות — הודעה, שיחה, הצעה — היום, לא מחר' },
    { id: 'dating_9',  text: 'כתוב על ה-date הכי טוב שהיה לך — ומה בדיוק עשה אותו מיוחד' },
    { id: 'dating_10', text: 'שמע podcast episode אחד על relationships/dating — עם כוונה ללמוד, לא לשפוט' },
    { id: 'dating_11', text: 'צלם תמונה חדשה שלך שאתה אוהב — לא selfie, תמונה טבעית, שתייצג אותך' },
    { id: 'dating_12', text: 'הצטרף לאירוע חברתי שיש בו סיכוי להכיר אנשים חדשים — תרשם עכשיו' },
    { id: 'dating_13', text: 'אמור "כן" להצעה חברתית שהיית דוחה — תן לה ממד ולא לצפות לכלום' },
    { id: 'dating_14', text: 'כתוב green flags רשימה — דברים שמראים שמישהו מתאים לך באמת' },
    { id: 'dating_15', text: 'חשוב על הדרך שאתה מציג את עצמך בפגישה ראשונה — מה הייתה רוצה לשנות?' },
    { id: 'dating_16', text: 'שלח הודעה ספונטנית לאדם שמעניין אותך — ללא plan, ללא תסריט' },
  ],
}

export function getAllMissions() {
  return Object.values(MISSIONS).flat()
}

export function getMissionsForCategories(enabledCategoryIds) {
  return enabledCategoryIds.flatMap(id => MISSIONS[id] || [])
}

export function pickRandomMission(enabledCategoryIds, excludeIds = []) {
  const pool = getMissionsForCategories(enabledCategoryIds)
    .filter(m => !excludeIds.includes(m.id))
  if (pool.length === 0) {
    // fallback: ignore excludeIds
    const fallback = getMissionsForCategories(enabledCategoryIds)
    if (fallback.length === 0) return null
    return fallback[Math.floor(Math.random() * fallback.length)]
  }
  return pool[Math.floor(Math.random() * pool.length)]
}

export function getCategoryLabel(categoryId) {
  return SURPRISE_CATEGORIES.find(c => c.id === categoryId)?.label || categoryId
}

export function getCategoryEmoji(categoryId) {
  return SURPRISE_CATEGORIES.find(c => c.id === categoryId)?.emoji || '🎲'
}

// Metadata for missions that can be converted to repeatable habits
// Keys are mission IDs — only missions listed here show "הפוך להרגל"
export const REPEATABLE_MISSIONS = {
  fitness_2:   { pillar: 'body',       suggestedHabitTitleHe: 'הליכה ללא טלפון',        suggestedTriggerHe: 'אחרי העבודה' },
  fitness_3:   { pillar: 'body',       suggestedHabitTitleHe: 'מתיחות 5 דקות',           suggestedTriggerHe: 'אחרי שעה ישיבה' },
  fitness_4:   { pillar: 'body',       suggestedHabitTitleHe: 'איגרוף צל 10 דקות',       suggestedTriggerHe: 'אחרי ארוחת הבוקר' },
  fitness_5:   { pillar: 'body',       suggestedHabitTitleHe: 'פלאנק 45 שניות',          suggestedTriggerHe: 'אחרי ארוחת הבוקר' },
  creativity_1:{ pillar: 'life',       suggestedHabitTitleHe: 'כתוב שיר קצר',            suggestedTriggerHe: 'לפני השינה' },
  creativity_3:{ pillar: 'life',       suggestedHabitTitleHe: 'צלם תמונה אחת שאהבת',    suggestedTriggerHe: 'כשאני בחוץ' },
  creativity_7:{ pillar: 'life',       suggestedHabitTitleHe: 'כתוב 200 מילים על חוויה', suggestedTriggerHe: 'לפני השינה' },
  social_1:    { pillar: 'people',     suggestedHabitTitleHe: 'שלח הודעה לחבר ישן',      suggestedTriggerHe: 'לפני השינה' },
  social_2:    { pillar: 'people',     suggestedHabitTitleHe: 'תן תודה אמיתית',          suggestedTriggerHe: 'בכל אינטראקציה' },
  social_6:    { pillar: 'people',     suggestedHabitTitleHe: 'שלח voice note לקרוב',     suggestedTriggerHe: 'לפני השינה' },
  social_11:   { pillar: 'people',     suggestedHabitTitleHe: 'שאל שאלה עמוקה',          suggestedTriggerHe: 'בכל שיחה' },
  mindset_1:   { pillar: 'discipline', suggestedHabitTitleHe: 'כתוב 5 דברי הכרת תודה',  suggestedTriggerHe: 'כשאני מתעורר' },
  mindset_4:   { pillar: 'discipline', suggestedHabitTitleHe: 'נשימת box 3 דקות',        suggestedTriggerHe: 'לפני שאני פותח את הטלפון' },
  mindset_7:   { pillar: 'discipline', suggestedHabitTitleHe: 'סריקת גוף 5 דקות',        suggestedTriggerHe: 'כשאני מתעורר' },
  mindset_9:   { pillar: 'discipline', suggestedHabitTitleHe: 'אמור "לא" לדבר אחד',     suggestedTriggerHe: 'בכל יום' },
  learning_1:  { pillar: 'growth',     suggestedHabitTitleHe: 'קרא פרק אחד',             suggestedTriggerHe: 'לפני השינה' },
  learning_3:  { pillar: 'growth',     suggestedHabitTitleHe: 'למד 5 מילים בשפה זרה',   suggestedTriggerHe: 'אחרי ארוחת הבוקר' },
  learning_8:  { pillar: 'growth',     suggestedHabitTitleHe: 'ראה TED Talk וכתוב 3 נקודות', suggestedTriggerHe: 'בצהריים' },
  community_9: { pillar: 'people',     suggestedHabitTitleHe: 'כתוב ביקורת לעסק טוב',    suggestedTriggerHe: 'אחרי ביקור' },
  adventure_8: { pillar: 'discipline', suggestedHabitTitleHe: 'ללא מסכים שעה לפני שינה', suggestedTriggerHe: 'שעה לפני השינה' },
}

export function getMissionMeta(missionId) {
  return REPEATABLE_MISSIONS[missionId] || null
}

// Category preference weight — stored in localStorage
const PREF_WEIGHT_KEY = 'prime_surprise_cat_weights'

export function bumpCategoryWeight(categoryId) {
  try {
    const w = JSON.parse(localStorage.getItem(PREF_WEIGHT_KEY) || '{}')
    w[categoryId] = (w[categoryId] || 0) + 1
    localStorage.setItem(PREF_WEIGHT_KEY, JSON.stringify(w))
  } catch {}
}

export function getCategoryWeights() {
  try { return JSON.parse(localStorage.getItem(PREF_WEIGHT_KEY) || '{}') } catch { return {} }
}
