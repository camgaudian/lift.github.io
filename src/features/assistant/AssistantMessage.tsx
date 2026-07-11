import type { AssistantChatMessage } from './assistantApi'

const FORM_DISCLAIMER =
  "Form guidance is for education only and isn't medical advice. Consult a qualified coach or clinician for injuries or pain."

export function AssistantMessage({ message }: { message: AssistantChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={[
          'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
          isUser ? 'bg-accent text-white' : 'bg-surface border border-border text-text',
        ].join(' ')}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {!isUser && message.formRagUsed && (
          <p className="mt-2 border-t border-border/60 pt-2 text-xs text-text-secondary">
            {FORM_DISCLAIMER}
          </p>
        )}
      </div>
    </div>
  )
}

export { FORM_DISCLAIMER }
