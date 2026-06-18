type SegmentedControlProps<T extends string> = {
  tabs: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}

export function SegmentedControl<T extends string>({
  tabs,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const activeIndex = tabs.findIndex(t => t.value === value)
  const count = tabs.length

  return (
    <div className="liquid-glass-pill rounded-full p-1">
      <div className="relative flex">
        {activeIndex >= 0 && (
          <div
            aria-hidden="true"
            className="liquid-glass-indicator absolute top-0 bottom-0 rounded-full"
            style={{
              width: `calc(${100 / count}% - 2px)`,
              height: '100%',
              left: `calc(${activeIndex * (100 / count)}% + 1px)`,
              transition: 'left 280ms cubic-bezier(0.34, 1.4, 0.64, 1)',
            }}
          />
        )}
        {tabs.map(({ value: tabValue, label }) => (
          <button
            key={tabValue}
            type="button"
            onClick={() => onChange(tabValue)}
            className={[
              'relative z-10 flex-1 rounded-full py-2 text-sm font-medium transition-colors duration-150',
              value === tabValue ? 'text-text' : 'text-text-secondary',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
