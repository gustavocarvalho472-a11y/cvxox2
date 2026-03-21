/**
 * BradescoGrafismo — listras diagonais da identidade visual Bradesco.
 * Posicionado absolutamente nos cantos da tela.
 */
interface Props {
  position?: 'top-right' | 'bottom-left'
  opacity?: number
}

export function BradescoGrafismo({ position = 'top-right', opacity = 1 }: Props) {
  const isTopRight = position === 'top-right'

  const style: React.CSSProperties = {
    position: 'absolute',
    opacity,
    pointerEvents: 'none',
    zIndex: 0,
    ...(isTopRight
      ? { top: 0, right: 0 }
      : { bottom: 0, left: 0 }),
  }

  return (
    <svg
      width="200"
      height="200"
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={style}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={`grad-${position}`}
          x1="0%" y1="100%"
          x2="100%" y2="0%"
        >
          <stop offset="0%"   stopColor="#8B0A1E" />
          <stop offset="45%"  stopColor="#CC092F" />
          <stop offset="100%" stopColor="#CC1060" />
        </linearGradient>
      </defs>

      {/* Linha grossa */}
      <line
        x1="200" y1="60"
        x2="60"  y2="200"
        stroke={`url(#grad-${position})`}
        strokeWidth="30"
        strokeLinecap="butt"
      />
      {/* Linha fina */}
      <line
        x1="200" y1="20"
        x2="20"  y2="200"
        stroke={`url(#grad-${position})`}
        strokeWidth="10"
        strokeLinecap="butt"
      />
    </svg>
  )
}
