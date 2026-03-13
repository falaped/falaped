"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { SendIcon, MessagesSquareIcon, ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ChatMessageList, type ChatMessage } from "@/components/dashboard/chat-message-list"
import type { CaseMessage } from "@/modules/cases/get-case-by-id"

function ChatEmpty() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <MessagesSquareIcon className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="mt-4 text-sm font-medium text-muted-foreground">
        Nenhuma mensagem neste caso.
      </p>
      <p className="mt-1 text-xs text-muted-foreground/70">
        As mensagens trocadas pelo WhatsApp aparecerão aqui.
      </p>
    </div>
  )
}

const SCROLL_DURATION_MS = 1200

function smoothScrollToBottom(element: HTMLDivElement) {
  const start = element.scrollTop
  const target = element.scrollHeight - element.clientHeight
  const distance = target - start

  if (distance <= 0) return

  let startTime: number | null = null

  function easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3)
  }

  function step(timestamp: number) {
    if (!startTime) startTime = timestamp
    const elapsed = timestamp - startTime
    const progress = Math.min(elapsed / SCROLL_DURATION_MS, 1)
    const eased = easeOutCubic(progress)

    element.scrollTop = start + distance * eased

    if (progress < 1) {
      requestAnimationFrame(step)
    }
  }

  requestAnimationFrame(step)
}

export function CaseChat({
  messages,
  isActive,
}: {
  messages: CaseMessage[]
  isActive: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const handleOpen = useCallback(() => {
    setIsOpen(true)
  }, [])

  useEffect(() => {
    if (!isOpen || !scrollRef.current) return

    const timer = setTimeout(() => {
      if (scrollRef.current) {
        smoothScrollToBottom(scrollRef.current)
      }
    }, 150)

    return () => clearTimeout(timer)
  }, [isOpen])

  const hasMessages = messages.length > 0

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={isOpen ? () => setIsOpen(false) : handleOpen}
        className="flex w-full items-center justify-between px-5 py-3 transition-colors hover:bg-muted/40"
      >
        <div className="flex items-center gap-2">
          <MessagesSquareIcon className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">Conversa</h2>
          <span className="text-xs text-muted-foreground">
            ({messages.length} {messages.length === 1 ? "mensagem" : "mensagens"})
          </span>
        </div>
        <ChevronDownIcon
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-300",
            isOpen && "rotate-180",
          )}
        />
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-500 ease-in-out",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border">
            <div
              ref={scrollRef}
              className="flex h-[480px] flex-col gap-4 overflow-y-auto px-5 py-4"
              style={{
                backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--muted)) 1px, transparent 0)",
                backgroundSize: "24px 24px",
              }}
            >
              {!hasMessages ? (
                <ChatEmpty />
              ) : (
                <ChatMessageList messages={messages as ChatMessage[]} />
              )}
            </div>

            <div className="border-t border-border bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-2">
                <Input
                  placeholder={
                    isActive
                      ? "Responder ao caso... (em breve)"
                      : "Caso encerrado"
                  }
                  disabled
                  className="flex-1 bg-background"
                />
                <Button size="icon" disabled className="shrink-0">
                  <SendIcon className="h-4 w-4" />
                  <span className="sr-only">Enviar</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
