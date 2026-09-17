import CombatPathScreen from '../combat/CombatPathScreen'
import { MT_LEVELS, MT_L1_TECHNIQUES } from '../../data/muayThaiPath'
import { getMuayThaiState, muayThaiEngine } from '../../utils/muayThaiProgress'

export default function MuayThaiPathScreen({
  profile,
  onStartWorkout,
  onFreeTraining,
  onClose,
  onQuickLegWork,
  onQuickHandsElbows,
  quickDuration,
}) {
  const state = getMuayThaiState(profile)
  return (
    <CombatPathScreen
      title="🦵 מואי תאי — מהיסודות ללוחם"
      levels={MT_LEVELS}
      levelOneTechniques={MT_L1_TECHNIQUES}
      state={state}
      engine={muayThaiEngine}
      freePracticeLabel="תרגול חופשי 🦵"
      allCompletedLabel="השלמת את כל תכנית המואי תאי!"
      onStartWorkout={onStartWorkout}
      onFreeTraining={onFreeTraining}
      onClose={onClose}
      onQuickLegWork={onQuickLegWork}
      onQuickHandsElbows={onQuickHandsElbows}
      quickDuration={quickDuration}
    />
  )
}
