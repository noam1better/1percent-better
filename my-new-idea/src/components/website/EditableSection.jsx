import { useState } from 'react'
import SectionRenderer from './SectionRenderer'
import { SECTION_META } from '../../engine/websiteSchema'

export default function EditableSection({
  section, website, index, total,
  onEdit, onMoveUp, onMoveDown, onDelete, onToggle, onRegen,
  editMode, regenning,
}) {
  const [hovered, setHovered] = useState(false)
  const meta = SECTION_META[section.type] || {}
  const hidden = !section.visible

  return (
    <div
      className={`es-wrap ${hovered && editMode ? 'es-hovered' : ''} ${hidden ? 'es-hidden' : ''} ${regenning ? 'es-regenning' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {editMode && (hovered || hidden) && (
        <div className="es-toolbar">
          <span className="es-type-label">{meta.icon} {meta.label}</span>
          <div className="es-actions">
            <button className="es-btn" onClick={onToggle}  title={hidden ? 'הצג' : 'הסתר'}>
              {hidden ? '👁️' : '🙈'}
            </button>
            <button className="es-btn" onClick={onMoveUp}   disabled={index === 0}     title="העלה">↑</button>
            <button className="es-btn" onClick={onMoveDown} disabled={index >= total-1} title="הורד">↓</button>
            {onRegen && (
              <button className="es-btn es-regen-btn" onClick={() => onRegen(section)} disabled={regenning} title="שפר עם AI">
                {regenning ? <span className="es-regen-spin" /> : '✨'}
              </button>
            )}
            <button className="es-btn es-edit-btn" onClick={onEdit} title="ערוך">✏️ ערוך</button>
            <button className="es-btn es-del-btn"  onClick={onDelete} title="מחק">🗑️</button>
          </div>
        </div>
      )}
      <div className={`es-content ${hidden ? 'es-content-hidden' : ''}`}>
        {hidden && editMode && (
          <div className="es-hidden-overlay">
            <span>{meta.icon} {meta.label} — מוסתר</span>
            <button className="es-show-btn" onClick={onToggle}>הצג בדף</button>
          </div>
        )}
        <SectionRenderer section={section} website={website} />
      </div>
    </div>
  )
}
