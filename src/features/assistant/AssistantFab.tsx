export function AssistantFab({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open Nifty"
      className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg transition-transform active:scale-95"
    >
      <AssistantIcon />
    </button>
  )
}

function AssistantIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3c-1.5 0-2.8.8-3.5 2C6.2 5.5 4 8.1 4 11.5 4 15.6 7.2 19 11 19h1v2.5c0 .3.3.5.5.5.1 0 .2 0 .3-.1L18 18.5c1.1-.8 2-2.2 2-3.9C20 10.1 16.4 3 12 3Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="11" r="1" fill="currentColor" />
      <circle cx="12" cy="11" r="1" fill="currentColor" />
      <circle cx="15" cy="11" r="1" fill="currentColor" />
    </svg>
  )
}
