import { useCountUp } from '@/hooks/useCountUp'

/**
 * Renders a number that counts up to `value` (when `animate` is set), formatting
 * each frame via `format`. The intermediate value is rounded so formatters that
 * expect integers behave correctly.
 */
export function CountUp({
  value,
  format,
  animate = false,
}: {
  value: number
  format: (n: number) => string
  animate?: boolean
}) {
  const current = useCountUp(value, { enabled: animate })
  return <>{format(Math.round(current))}</>
}
