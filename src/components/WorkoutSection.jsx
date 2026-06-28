import React, { useState, useEffect, useRef } from 'react'

const WORKOUTS = [
  {
    id: 'pushups',
    label: 'Push-ups',
    emoji: '💪',
    tips: [
      'Hands shoulder-width apart, fingers forward',
      'Keep core tight — no sagging hips',
      'Lower chest to 1 inch from floor',
      'Full lockout at top without locking elbows',
    ],
    timerOptions: [30, 45, 60],
    defaultReps: 10,
    defaultSets: 3,
  },
  {
    id: 'pullups',
    label: 'Pull-ups',
    emoji: '🏋️',
    tips: [
      'Dead hang start — full arm extension',
      'Pull elbows down and back, not just up',
      'Chin clears bar on every rep',
      'Lower slowly — 2-3 sec descent',
    ],
    timerOptions: [45, 60, 90],
    defaultReps: 5,
    defaultSets: 3,
  },
  {
    id: 'muaythai',
    label: 'Muay Thai',
    emoji: '🥊',
    tips: [
      'Stance: feet shoulder-width, lead foot 45°',
      'Hands up — protect chin at all times',
      'Rotate hips into every strike for power',
      'Stay on balls of feet, always moving',
    ],
    timerOptions: [60, 120, 180],
    defaultReps: null,
    defaultSets: 3,
  },
  {
    id: 'squats',
    label: 'Squats',
    emoji: '🦵',
    tips: [
      'Feet slightly wider than shoulders, toes out ~30°',
      "Knees track over toes — don't cave inward",
      'Break parallel — crease of hip below knee',
      'Drive through heels, chest tall on ascent',
    ],
    timerOptions: [30, 45, 60],
    defaultReps: 12,
    defaultSets: 3,
  },
]

export default function WorkoutSection() {
  const [phase, setPhase] = useState('idle') // 'idle' | 'pick' | 'setup' | 'active'
  const [selected, setSelected] = useState(null)
  const [timer, setTimer] = useState(null)
  const [reps, setReps] = useState(null)
  const [sets, setSets] = useState(null)

  // Active session
  const [completedSets, setCompletedSets] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const [flash, setFlash] = useState(false)
  const [tipsOpen, setTipsOpen] = useState(false)

  const intervalRef = useRef(null)

  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(intervalRef.current)
            setTimerRunning(false)
            return 0
          }
          return t - 1
        })
      }, 1000)
    }
    return () => clearInterval(intervalRef.current)
  }, [timerRunning])

  function selectWorkout(workout) {
    setSelected(workout)
    setTimer(workout.timerOptions[0])
    setReps(workout.defaultReps ?? '')
    setSets(workout.defaultSets)
    setPhase('setup')
  }

  function startSession() {
    setCompletedSets(0)
    setTimeLeft(0)
    setTimerRunning(false)
    setTipsOpen(false)
    setPhase('active')
  }

  function completeSet() {
    const next = completedSets + 1
    setCompletedSets(next)
    setFlash(true)
    setTimeout(() => setFlash(false), 600)
    if (next < Number(sets)) {
      setTimeLeft(timer)
      setTimerRunning(true)
    }
  }

  function close() {
    clearInterval(intervalRef.current)
    setPhase('idle')
    setSelected(null)
    setCompletedSets(0)
    setTimeLeft(0)
    setTimerRunning(false)
  }

  const totalSets = Number(sets)
  const workoutDone = completedSets >= totalSets && totalSets > 0

  return (
    <>
      <section className="rounded-xl border border-gray-700 bg-gray-800 bg-opacity-50 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Workouts</h2>
            <p className="text-sm text-gray-400">Begin the next routine</p>
          </div>
          <button
            type="button"
            onClick={() => setPhase('pick')}
            className="rounded-2xl bg-green-600 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-green-500"
          >
            Start Workout
          </button>
        </div>
        <div className="rounded-2xl border border-gray-700 bg-gray-900 p-4">
          <p className="text-sm text-gray-400">Next workout</p>
          <p className="mt-2 text-base text-gray-200">Choose a routine and configure your sets.</p>
        </div>
      </section>

      {phase !== 'idle' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) close() }}
        >
          <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">

            {/* Picker */}
            {phase === 'pick' && (
              <>
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Choose Workout</h3>
                  <button onClick={close} className="text-xl leading-none text-gray-500 hover:text-gray-300">×</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {WORKOUTS.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => selectWorkout(w)}
                      className="flex flex-col items-center gap-2 rounded-2xl border border-gray-700 bg-gray-800 p-4 transition hover:border-green-500 hover:bg-gray-700"
                    >
                      <span className="text-3xl">{w.emoji}</span>
                      <span className="text-sm font-semibold text-white">{w.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Setup */}
            {phase === 'setup' && selected && (
              <>
                <div className="mb-5 flex items-center justify-between">
                  <button onClick={() => setPhase('pick')} className="text-sm text-gray-400 hover:text-white">← Back</button>
                  <button onClick={close} className="text-xl leading-none text-gray-500 hover:text-gray-300">×</button>
                </div>

                <div className="mb-4 flex items-center gap-3">
                  <span className="text-3xl">{selected.emoji}</span>
                  <h3 className="text-lg font-semibold text-white">{selected.label}</h3>
                </div>

                <div className="mb-5 overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
                  <button
                    onClick={() => setTipsOpen(o => !o)}
                    className="flex w-full items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400 hover:text-white"
                  >
                    <span>Technique Tips</span>
                    <span>{tipsOpen ? '▲' : '▼'}</span>
                  </button>
                  {tipsOpen && (
                    <ul className="space-y-1 border-t border-gray-700 px-4 pb-3">
                      {selected.tips.map((tip, i) => (
                        <li key={i} className="flex gap-2 pt-1 text-sm text-gray-300">
                          <span className="text-green-500">✓</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="mb-5 space-y-4">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Rest timer (sec)</p>
                    <div className="flex gap-2">
                      {selected.timerOptions.map((t) => (
                        <button
                          key={t}
                          onClick={() => setTimer(t)}
                          className={`flex-1 rounded-xl border py-2 text-sm font-semibold transition ${
                            timer === t
                              ? 'border-green-500 bg-green-600 text-white'
                              : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500'
                          }`}
                        >
                          {t}s
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-4">
                    {selected.defaultReps !== null && (
                      <div className="flex-1">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Reps</p>
                        <input
                          type="number"
                          min="1"
                          value={reps}
                          onChange={(e) => setReps(e.target.value)}
                          className="w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-center text-white focus:border-green-500 focus:outline-none"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {selected.id === 'muaythai' ? 'Rounds' : 'Sets'}
                      </p>
                      <input
                        type="number"
                        min="1"
                        value={sets}
                        onChange={(e) => setSets(e.target.value)}
                        className="w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-center text-white focus:border-green-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={startSession}
                  className="w-full rounded-2xl bg-green-600 py-3 text-sm font-semibold text-slate-950 transition hover:bg-green-500"
                >
                  Start Session
                </button>
              </>
            )}

            {/* Active session */}
            {phase === 'active' && selected && (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{selected.emoji}</span>
                    <h3 className="text-lg font-semibold text-white">{selected.label}</h3>
                  </div>
                  <button onClick={close} className="text-xl leading-none text-gray-500 hover:text-gray-300">×</button>
                </div>

                <div className="mb-4 overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
                  <button
                    onClick={() => setTipsOpen(o => !o)}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-400 hover:text-white"
                  >
                    <span>Technique Tips</span>
                    <span>{tipsOpen ? '▲' : '▼'}</span>
                  </button>
                  {tipsOpen && (
                    <ul className="space-y-1 border-t border-gray-700 px-4 pb-3">
                      {selected.tips.map((tip, i) => (
                        <li key={i} className="flex gap-2 pt-1 text-sm text-gray-300">
                          <span className="text-green-500">✓</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {workoutDone ? (
                  <div className="py-6 text-center">
                    <div className="mb-3 text-5xl">🎉</div>
                    <div className="mb-1 text-xl font-bold text-green-400">Workout Complete!</div>
                    <div className="mb-6 text-sm text-gray-400">
                      {totalSets} {selected.id === 'muaythai' ? 'rounds' : 'sets'} done
                    </div>
                    <button
                      onClick={close}
                      className="w-full rounded-2xl bg-green-600 py-3 text-sm font-semibold text-slate-950 transition hover:bg-green-500"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mb-5 text-center">
                      <div className="mb-1 text-xs uppercase tracking-wide text-gray-500">
                        {selected.id === 'muaythai' ? 'Round' : 'Set'}
                      </div>
                      <div className="text-4xl font-bold text-white">
                        {completedSets + 1}
                        <span className="ml-1 text-2xl text-gray-600">/ {totalSets}</span>
                      </div>
                      {selected.defaultReps !== null && (
                        <div className="mt-1 text-sm text-gray-400">{reps} reps</div>
                      )}
                    </div>

                    {(timerRunning || (timeLeft > 0 && completedSets > 0)) && (
                      <div className="mb-5 rounded-xl border border-gray-700 bg-gray-800 py-4 text-center">
                        <div className="mb-1 text-xs uppercase tracking-wide text-gray-500">Rest</div>
                        <div className={`text-3xl font-bold tabular-nums ${timerRunning ? 'text-yellow-400' : 'text-green-400'}`}>
                          {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
                        </div>
                        {!timerRunning && timeLeft === 0 && (
                          <div className="mt-1 text-xs text-green-400">Ready for next set!</div>
                        )}
                      </div>
                    )}

                    <button
                      onClick={completeSet}
                      disabled={timerRunning}
                      className={`w-full rounded-2xl py-4 text-base font-bold transition-all duration-150 ${
                        flash
                          ? 'scale-95 bg-green-400 text-white'
                          : timerRunning
                            ? 'cursor-not-allowed bg-gray-700 text-gray-500'
                            : 'bg-green-600 text-slate-950 hover:bg-green-500 active:scale-95'
                      }`}
                    >
                      {flash ? '✓ Set Complete!' : timerRunning ? `Resting… ${timeLeft}s` : 'Complete Set'}
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
