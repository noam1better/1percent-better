import React, { useState, useEffect } from 'react';

export default function ChallengeSection() {
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    // בודק אם המשתמש כבר הגדיר פרופיל
    const savedProfile = localStorage.getItem('userProfile');
    if (savedProfile) {
      setUserProfile(JSON.parse(savedProfile));
    }
  }, []);

  // פונקציה לשמירת נתוני המשתמש
  const saveProfile = (goal, difficulty, time) => {
    const profile = { goal, difficulty, time };
    localStorage.setItem('userProfile', JSON.stringify(profile));
    setUserProfile(profile);
  };

  // אם אין פרופיל, מציגים את ה-Onboarding
  if (!userProfile) {
    return (
      <section className="rounded-3xl border border-dashed border-gray-700 bg-gray-900/80 p-5 shadow-xl">
        <h2 className="text-xl font-semibold text-white mb-4">בוא נתאים לך אתגר אישי</h2>
        <div className="grid grid-cols-1 gap-3">
          <button onClick={() => saveProfile('Fitness', 'Beginner', '10m')} className="bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-2xl text-sm font-semibold transition">
            כושר (10 דקות)
          </button>
          <button onClick={() => saveProfile('Nutrition', 'Beginner', '5m')} className="bg-sky-600 hover:bg-sky-500 text-white p-3 rounded-2xl text-sm font-semibold transition">
            תזונה (5 דקות)
          </button>
        </div>
      </section>
    );
  }

  // אם יש פרופיל, מציגים את האתגר היומי
  return (
    <section className="rounded-3xl border border-emerald-500/30 bg-gray-900/80 p-5 shadow-xl">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-semibold text-white">האתגר היומי שלך</h2>
        <button onClick={() => { localStorage.removeItem('userProfile'); setUserProfile(null); }} className="text-xs text-gray-500 underline">
          אפס הגדרות
        </button>
      </div>
      <p className="text-emerald-300 font-bold text-lg">
        {userProfile.goal === 'Fitness' ? 'צא להליכה של 10 דקות' : 'שתה כוס מים גדולה'}
      </p>
      <p className="text-sm text-gray-400 mt-1">מטרה: {userProfile.goal} | רמה: {userProfile.difficulty}</p>
    </section>
  );
}