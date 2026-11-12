import { ReactNode } from 'react'

// Shared pieces for fields whose label lifts into a notch in the top border.
//
// Usage: render the control first with the `peer` class, then <NotchedOutline>
// and <FloatingLabel> as later siblings inside a `relative` wrapper.
//
// `floated="auto"` lifts the label on focus or once the control has a value,
// using CSS only (`:focus`, `:not(:placeholder-shown)`, `:autofill`), so
// browser autofill works before React sees a change. The control must have a
// non-empty placeholder for this (use " " if it has none).
// `floated="always"` keeps the label lifted (dropdowns, date/time fields).
//
// Class names are written out in full so Tailwind's scanner can find them.

export type FloatMode = 'auto' | 'always'

const EASE = 'ease-[cubic-bezier(0.33,0.55,0.2,1)]'

// The legend sits inside the fieldset (a sibling of the control), so it needs a
// descendant-of-sibling selector rather than plain `peer-*`.
const NOTCH_OPEN_AUTO =
  '[.peer:focus~*_&]:max-w-full [.peer:not(:placeholder-shown)~*_&]:max-w-full [.peer:autofill~*_&]:max-w-full'

const LABEL_FLOATED_AUTO =
  'peer-focus:top-0 peer-focus:text-xs ' +
  'peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs ' +
  'peer-autofill:top-0 peer-autofill:text-xs'

/** Base classes for the control itself: sits under the outline, no border of its own. */
export const notchedControlClass =
  'peer relative z-0 block w-full min-w-0 rounded-xl bg-surface px-4 text-base text-text focus:outline-none disabled:cursor-not-allowed'

/**
 * Hides a real placeholder until the label has lifted out of the way, so the two
 * never overlap. `:placeholder-shown` still works because it ignores color.
 */
export const deferredPlaceholderClass =
  'placeholder:text-transparent focus:placeholder:text-text-secondary'

export function NotchedOutline({
  label,
  floated,
  error = false,
}: {
  label: string
  floated: FloatMode
  error?: boolean
}) {
  return (
    <fieldset
      aria-hidden
      className={[
        // Drawn above the control so autofill backgrounds can never cover the border.
        'pointer-events-none absolute inset-x-0 -top-[7px] bottom-0 z-10 m-0 min-w-0 rounded-xl border px-3',
        // No focus ring: a box-shadow can't follow the notch and would cut through the label.
        `transition-[border-color] duration-200 ${EASE} motion-reduce:transition-none`,
        error ? 'border-danger' : 'border-border peer-focus:border-accent',
      ].join(' ')}
    >
      <legend
        className={[
          'invisible block h-[14px] whitespace-nowrap p-0 text-xs leading-none',
          floated === 'always'
            ? 'max-w-full'
            : `max-w-[0.01px] transition-[max-width] duration-150 ${EASE} motion-reduce:transition-none ${NOTCH_OPEN_AUTO}`,
        ].join(' ')}
      >
        <span className="inline-block px-1">{label}</span>
      </legend>
    </fieldset>
  )
}

export function FloatingLabel({
  htmlFor,
  floated,
  error = false,
  restClass = 'top-1/2',
  children,
}: {
  htmlFor: string
  floated: FloatMode
  error?: boolean
  /** Vertical position while resting inside the field (auto mode only). */
  restClass?: string
  children: ReactNode
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={[
        'pointer-events-none absolute left-4 z-20 max-w-[calc(100%-2rem)] -translate-y-1/2 truncate leading-none',
        floated === 'always'
          ? 'top-0 text-xs'
          : `${restClass} text-base transition-[top,font-size,color] duration-200 ${EASE} motion-reduce:transition-none ${LABEL_FLOATED_AUTO}`,
        error ? 'text-danger' : 'text-text-secondary peer-focus:text-accent',
      ].join(' ')}
    >
      {children}
    </label>
  )
}
