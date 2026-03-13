"use client"

import { useEffect, useRef, useState } from "react"
import { CalendarIcon, ChevronDownIcon, ClockIcon, MessageCircleIcon, PencilIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Separator } from "@/components/ui/separator"
import { ChatMessageList, type ChatMessage } from "@/components/dashboard/chat-message-list"
import { DiscussionDetailActions } from "@/components/dashboard/discussions/discussion-detail-actions"
import { DiscussionEditTitleDialog } from "@/components/dashboard/discussions/discussion-edit-title-dialog"
import { formatDate, formatRelativeTime } from "@/lib/formatters"
import type { DiscussionWithMessages } from "@/modules/discussions/get-discussions-by-profile-id"

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

function StatusBadge({ status }: { status: "active" | "closed" }) {
  if (status === "active") {
    return (
      <Badge variant="default" className="gap-1.5">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-foreground opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary-foreground" />
        </span>
        Ativa
      </Badge>
    )
  }

  return <Badge variant="secondary">Encerrada</Badge>
}

function MessagesEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <p className="text-sm text-muted-foreground">Nenhuma mensagem nesta discussão.</p>
    </div>
  )
}

export function DiscussionCard({ discussion }: { discussion: DiscussionWithMessages }) {
  const [open, setOpen] = useState(false)
  const [editTitleOpen, setEditTitleOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open || !scrollRef.current || discussion.messages.length === 0) return

    const timer = setTimeout(() => {
      if (scrollRef.current) {
        smoothScrollToBottom(scrollRef.current)
      }
    }, 150)

    return () => clearTimeout(timer)
  }, [open, discussion.messages.length])

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="group relative rounded-xl border border-border/60 bg-card transition-all duration-200 hover:border-border hover:bg-accent/30 hover:shadow-md"
    >
      <CollapsibleTrigger
        className={cn(
          "flex w-full flex-col gap-0 px-5 py-4 text-left",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        )}
      >
        <div className="flex w-full items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h3 className="truncate text-lg font-semibold tracking-tight">
                {discussion.title?.trim()
                  ? `Discussão – ${discussion.title}`
                  : `Discussão – ${formatDate(discussion.started_at)}`}
              </h3>
              <StatusBadge status={discussion.status} />
            </div>
          </div>
          <ChevronDownIcon className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300 group-data-[state=open]:rotate-180" />
        </div>

        <Separator className="my-3" />

        <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1.5 ">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
              {formatDate(discussion.started_at)}
            </span>
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <ClockIcon className="h-3.5 w-3.5 shrink-0" />
              {formatRelativeTime(discussion.started_at)}
            </span>
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MessageCircleIcon className="h-3.5 w-3.5 shrink-0" />
              {discussion.messages.length}{" "}
              {discussion.messages.length === 1 ? "mensagem" : "mensagens"}
            </span>
          </div>
          <div
            className="flex flex-wrap items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setEditTitleOpen(true)}
              aria-label="Editar título"
            >
              <PencilIcon className="h-4 w-4" />
              Editar título
            </Button>
            <DiscussionDetailActions discussionId={discussion.id} status={discussion.status} />
          </div>

        </div>

      </CollapsibleTrigger>



      <DiscussionEditTitleDialog
        open={editTitleOpen}
        onOpenChange={setEditTitleOpen}
        discussionId={discussion.id}
        initialTitle={discussion.title}
      />

      <CollapsibleContent>
        <div className="border-t border-border">
          <div
            ref={scrollRef}
            className="flex max-h-[420px] flex-col gap-4 overflow-y-auto px-5 py-4"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, hsl(var(--muted)) 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
          >
            <ChatMessageList
              messages={discussion.messages as ChatMessage[]}
              emptyNode={<MessagesEmpty />}
            />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
