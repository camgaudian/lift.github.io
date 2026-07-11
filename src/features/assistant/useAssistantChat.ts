import { useCallback, useRef, useState } from 'react'
import {
  friendlyAssistantError,
  streamAssistantReply,
  type AssistantChatMessage,
  type WorkoutContextPayload,
} from './assistantApi'

export function useAssistantChat(workoutContext?: WorkoutContextPayload) {
  const [messages, setMessages] = useState<AssistantChatMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const reset = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setMessages([])
    setStreaming(false)
    setError(null)
  }, [])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setStreaming(false)
  }, [])

  const send = useCallback(
    async (content: string, includeUserData: boolean) => {
      const trimmed = content.trim()
      if (!trimmed || streaming) return

      setError(null)
      const userMessage: AssistantChatMessage = { role: 'user', content: trimmed }
      const nextMessages = [...messages, userMessage]
      setMessages(nextMessages)
      setStreaming(true)

      const assistantIndex = nextMessages.length
      setMessages([...nextMessages, { role: 'assistant', content: '' }])

      const controller = new AbortController()
      abortRef.current = controller

      try {
        await streamAssistantReply({
          messages: nextMessages,
          includeUserData,
          workoutContext: includeUserData ? workoutContext : undefined,
          signal: controller.signal,
          onToken: (text) => {
            setMessages((prev) => {
              const copy = [...prev]
              const current = copy[assistantIndex]
              if (!current || current.role !== 'assistant') return prev
              copy[assistantIndex] = { ...current, content: current.content + text }
              return copy
            })
          },
          onDone: (meta) => {
            setMessages((prev) => {
              const copy = [...prev]
              const current = copy[assistantIndex]
              if (!current || current.role !== 'assistant') return prev
              copy[assistantIndex] = { ...current, formRagUsed: meta.formRagUsed }
              return copy
            })
            setStreaming(false)
            abortRef.current = null
          },
          onError: (err) => {
            if (controller.signal.aborted) return
            setError(friendlyAssistantError(err.code, err.message))
            setMessages((prev) => {
              const copy = [...prev]
              const current = copy[assistantIndex]
              if (current?.role === 'assistant' && !current.content) {
                copy.pop()
              }
              return copy
            })
            setStreaming(false)
            abortRef.current = null
          },
        })
      } catch (err) {
        if (controller.signal.aborted) return
        setError(err instanceof Error ? err.message : 'Something went wrong')
        setStreaming(false)
        abortRef.current = null
      }
    },
    [messages, streaming, workoutContext],
  )

  return { messages, streaming, error, send, cancel, reset, setError }
}
