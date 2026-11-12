const LINE_EM = 1.5

function RaysIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="rays-spin shrink-0" aria-hidden>
      {Array.from({ length: 8 }, (_, i) => (
        <line
          key={i}
          x1="12"
          y1="3"
          x2="12"
          y2="7"
          opacity={0.3 + (i / 8) * 0.7}
          transform={`rotate(${i * 45} 12 12)`}
        />
      ))}
    </svg>
  )
}

/**
 * A "working on it" status: spinning rays and a label that rolls up to the
 * next step as `activeIndex` advances.
 */
export function RollingSteps({ steps, activeIndex }: { steps: string[]; activeIndex: number }) {
  const index = Math.min(Math.max(activeIndex, 0), steps.length - 1)

  return (
    <span className="inline-flex items-center gap-2 font-semibold" role="status">
      <RaysIcon />
      <span className="relative block overflow-hidden" style={{ height: `${LINE_EM}em` }}>
        <span
          className="rolling-steps-column flex flex-col"
          style={{ transform: `translateY(-${index * LINE_EM}em)` }}
          aria-hidden
        >
          {steps.map((step) => (
            <span key={step} className="block whitespace-nowrap" style={{ lineHeight: `${LINE_EM}em` }}>
              {step}…
            </span>
          ))}
        </span>
        <span className="sr-only">{steps[index]}</span>
      </span>
    </span>
  )
}
