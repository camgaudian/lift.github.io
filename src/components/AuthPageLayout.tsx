import { ReactNode } from 'react'

export function AuthPageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col justify-center px-4 py-8 safe-top safe-bottom">
      <div className="mx-auto w-full max-w-lg">{children}</div>
    </div>
  )
}
