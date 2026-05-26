import EditableSection from './EditableSection'
import { PALETTES, FONTS } from '../../engine/websiteSchema'
import { recordWAClick } from '../../services/analyticsService'

export default function WebsitePreview({
  website, editMode = false,
  onSectionEdit, onSectionMove, onSectionDelete, onSectionToggle, onSectionRegen,
  regenningId,
}) {
  const palette  = PALETTES[website.theme?.palette] || PALETTES.dark
  const fontKey  = website.theme?.font || 'heebo'
  const fontCss  = FONTS[fontKey]?.css || "'Heebo', sans-serif"

  const cssVars = {
    '--ws-bg':     palette.bg,
    '--ws-accent': palette.accent,
    '--ws-text':   palette.text,
    '--ws-sub':    palette.sub,
    '--ws-border': palette.border,
    '--ws-card':   palette.card,
    '--ws-font':   fontCss,
  }

  const sections = website.sections || []

  const rawPhone = website.contact?.phone    || ''
  const rawWA    = website.contact?.whatsapp || rawPhone
  const waNum    = rawWA.replace(/\D/g,'').replace(/^0/,'972')
  const waHref   = waNum
    ? `https://wa.me/${waNum}?text=${encodeURIComponent('שלום, אני מעוניין בפרטים נוספים')}`
    : null
  const phoneHref = rawPhone ? `tel:${rawPhone}` : null

  return (
    <div className="ws-root" data-biz={website.bizType || 'default'} style={cssVars} dir="rtl">
      {sections.map((section, idx) => (
        <EditableSection
          key={section.id}
          section={section}
          website={website}
          index={idx}
          total={sections.length}
          editMode={editMode}
          regenning={regenningId === section.id}
          onEdit={()     => onSectionEdit?.(section)}
          onMoveUp={()   => onSectionMove?.(section.id, 'up')}
          onMoveDown={()  => onSectionMove?.(section.id, 'down')}
          onDelete={()   => onSectionDelete?.(section.id)}
          onToggle={()   => onSectionToggle?.(section.id)}
          onRegen={onSectionRegen}
        />
      ))}

      {/* Floating contact buttons — sticky within scrollable viewport */}
      {(waHref || phoneHref) && !editMode && (
        <div style={{ position: 'sticky', bottom: 0, height: 0, overflow: 'visible', zIndex: 999 }}>
          <div style={{
            position: 'absolute', bottom: 24, right: 24,
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            {waHref && (
              <a
                href={waHref}
                target="_blank"
                rel="noreferrer"
                onClick={() => website?.id && recordWAClick(website.id)}
                style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: '#25d366', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, textDecoration: 'none',
                  boxShadow: '0 4px 24px rgba(37,211,102,.55)',
                  transition: 'transform .2s',
                }}
                title="WhatsApp"
              >💬</a>
            )}
            {phoneHref && (
              <a
                href={phoneHref}
                style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: 'var(--ws-accent)', color: '#000',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, textDecoration: 'none',
                  boxShadow: '0 4px 24px color-mix(in srgb,var(--ws-accent) 48%,transparent)',
                  transition: 'transform .2s',
                }}
                title="חייג"
              >📞</a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
