"use client"

import { useEffect, useRef, useState } from "react"
import { SendIcon, MessagesSquareIcon, ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
        Mensagens registradas no sistema para este caso aparecem aqui.
      </p>
    </div>
  )
}

function ConversationHeader({
  messageCount,
  collapsible,
  isOpen,
  onToggle,
}: {
  messageCount: number
  collapsible: boolean
  isOpen: boolean
  onToggle: () => void
}) {
  const label = (
    <div className="flex items-center gap-2">
      <MessagesSquareIcon className="h-4 w-4 text-muted-foreground" aria-hidden />
      <span className="text-base font-semibold tracking-tight">Conversa</span>
      <span className="text-xs text-muted-foreground">
        ({messageCount}{" "}
        {messageCount === 1 ? "mensagem" : "mensagens"})
      </span>
    </div>
  )

  if (!collapsible) {
    return (
      <CardHeader className="border-b border-border py-3">
        {label}
      </CardHeader>
    )
  }

  return (
    <CardHeader className="border-b border-border p-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/40"
      >
        {label}
        <ChevronDownIcon
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>
    </CardHeader>
  )
}

type CaseChatProps = {
  messages: CaseMessage[]
  isActive: boolean
  /** When omitted, defaults to expanded for active cases and collapsed when closed. */
  initiallyOpen?: boolean
  /** When true, conversation is always visible (no accordion). */
  alwaysExpanded?: boolean
}

export function CaseChat({
  messages,
  isActive,
  initiallyOpen,
  alwaysExpanded = false,
}: CaseChatProps) {
  const defaultOpen = initiallyOpen === undefined ? isActive : initiallyOpen
  const [isOpen, setIsOpen] = useState(alwaysExpanded || defaultOpen)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (alwaysExpanded) return
    if (!isOpen || !scrollRef.current) return
    const el = scrollRef.current
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight
    })
  }, [alwaysExpanded, isOpen, messages.length])

  useEffect(() => {
    if (!alwaysExpanded || !scrollRef.current) return
    const el = scrollRef.current
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight
    })
  }, [alwaysExpanded, messages.length])

  const hasMessages = messages.length > 0

  const body = (
    <CardContent className="space-y-0 p-0">
      <div
        ref={scrollRef}
        className="flex max-h-[min(480px,55vh)] min-h-[240px] flex-col gap-4 overflow-y-auto bg-muted/20 px-4 py-4"
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
    </CardContent>
  )

  if (alwaysExpanded) {
    return (
      <Card className="flex flex-col overflow-hidden border-border">
        <ConversationHeader
          messageCount={messages.length}
          collapsible={false}
          isOpen
          onToggle={() => {}}
        />
        {body}
      </Card>
    )
  }

  return (
    <Card className="flex flex-col overflow-hidden border-border">
      <ConversationHeader
        messageCount={messages.length}
        collapsible
        isOpen={isOpen}
        onToggle={() => setIsOpen((open) => !open)}
      />
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">{body}</div>
      </div>
    </Card>
  )
}
