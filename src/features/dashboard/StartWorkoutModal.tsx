import { Card } from '@/components/Card'
import { BottomSheet } from '@/components/BottomSheet'
import { formatExercisePreview } from '@/lib/format'
import { sectionHeadingClass } from '@/lib/ui'
import type { WorkoutTemplate } from '@/lib/types'

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  )
}

function TemplateIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" strokeLinecap="round" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function StartWorkoutModal({
  templates,
  onClose,
  onStart,
}: {
  templates: WorkoutTemplate[]
  onClose: () => void
  onStart: (templateId?: string) => void
}) {
  return (
    <BottomSheet title="Start workout" onClose={onClose} showCloseButton>
      <p className="text-sm text-text-secondary">
        Pick a saved template or start with a blank slate.
      </p>

      <button
        type="button"
        onClick={() => onStart()}
        className="mt-4 w-full rounded-2xl border border-accent/30 bg-accent/5 p-3.5 text-left transition-colors hover:border-accent/50 hover:bg-accent/10"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-white shadow-sm">
            <PlusIcon />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium">Empty workout</p>
            <p className="text-sm text-text-secondary">Add exercises as you go</p>
          </div>
          <span className="shrink-0 text-accent">
            <ChevronRightIcon />
          </span>
        </div>
      </button>

      {templates.length > 0 ? (
        <div className="mt-4 flex flex-col gap-2">
          <h3 className={sectionHeadingClass}>Templates</h3>
          <div className="flex max-h-56 flex-col gap-2 overflow-y-auto pr-0.5">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => onStart(template.id)}
                className="w-full rounded-2xl border border-border bg-surface-secondary/40 p-3.5 text-left transition-colors hover:border-accent/40 hover:bg-surface-secondary"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-accent">
                    <TemplateIcon />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{template.name}</p>
                    <p className="truncate text-sm text-text-secondary">
                      {template.exercise_names?.length
                        ? formatExercisePreview(template.exercise_names)
                        : 'No exercises yet'}
                    </p>
                  </div>
                  <span className="shrink-0 text-text-secondary">
                    <ChevronRightIcon />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <Card padding="sm" className="mt-4 bg-surface-secondary/40">
          <p className="text-sm text-text-secondary">
            No templates yet. Build one in the Library tab to start workouts faster.
          </p>
        </Card>
      )}
    </BottomSheet>
  )
}
