import { StethoscopeIcon, BotIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { formatDate, formatTime } from "@/lib/formatters"

export type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  created_at: string
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isPediatrician = message.role === "user"

  return (
    <div
      className={cn(
        "flex gap-2.5",
        isPediatrician ? "flex-row-reverse" : "flex-row",
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isPediatrician ? "bg-primary/10" : "bg-muted",
        )}
      >
        {isPediatrician ? (
          <StethoscopeIcon className="h-4 w-4 text-primary" />
        ) : (
          <BotIcon className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      <div className={cn("max-w-[75%] space-y-1", isPediatrician ? "items-end" : "items-start")}>
        <div className={cn("flex items-center gap-2", isPediatrician ? "flex-row-reverse" : "flex-row")}>
          <span className="text-xs font-semibold">
            {isPediatrician ? "Pediatra" : "@falaped"}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatTime(message.created_at)}
          </span>
        </div>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isPediatrician
              ? "rounded-tr-sm bg-primary text-primary-foreground"
              : "rounded-tl-sm bg-muted text-foreground",
          )}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    </div>
  )
}

function DateSeparator({ date }: { date: string }) {
  return (
    <div className="flex items-center justify-center py-2">
      <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
        {date}
      </span>
    </div>
  )
}

function groupMessagesByDate(messages: ChatMessage[]): Map<string, ChatMessage[]> {
  const groups = new Map<string, ChatMessage[]>()
  for (const msg of messages) {
    const dateKey = formatDate(msg.created_at)
    const existing = groups.get(dateKey)
    if (existing) {
      existing.push(msg)
    } else {
      groups.set(dateKey, [msg])
    }
  }
  return groups
}

export function ChatMessageList({
  messages,
  emptyNode,
}: {
  messages: ChatMessage[]
  emptyNode?: React.ReactNode
}) {
  if (messages.length === 0) {
    return <>{emptyNode ?? null}</>
  }

  const grouped = groupMessagesByDate(messages)

  return (
    <>
      {Array.from(grouped.entries()).map(([dateLabel, dayMessages]) => (
        <div key={dateLabel} className="space-y-3">
          <DateSeparator date={dateLabel} />
          {dayMessages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}
        </div>
      ))}
    </>
  )
}
