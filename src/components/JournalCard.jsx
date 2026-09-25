import { ChevronLeft } from 'lucide-react'

// Small Home card that opens the Journal. Sits right below My Tasks.
export default function JournalCard({ onOpen }) {
  return (
    <button
      onClick={onOpen}
      style={{
        width: '100%', boxSizing: 'border-box', minHeight: 52,
        display: 'flex', alignItems: 'center', gap: '0.65rem',
        background: '#111317', border: '1px solid rgba(255,255,255,0.06)', borderRight: '3px solid rgba(217,179,76,0.55)', borderRadius: 14,
        padding: '0.8rem 1rem', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'right', direction: 'rtl',
      }}
    >
      <span style={{ flex: 1, color: '#F4F1E8', fontSize: '0.88rem', fontWeight: 800 }}>מה בראש שלך?</span>
      <ChevronLeft size={18} color="#71717A" />
    </button>
  )
}
