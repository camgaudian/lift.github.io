import { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'sm' | 'md' | 'lg'
}

const paddingMap = { sm: 'p-3', md: 'p-4', lg: 'p-5' }

export function Card({ padding = 'md', className = '', children, ...props }: CardProps) {
  return (
    <div
      className={[
        'min-w-0 max-w-full rounded-2xl border border-border shadow-sm',
        paddingMap[padding],
        className.includes('bg-') ? '' : 'bg-surface',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}
