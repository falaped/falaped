import Link from "next/link"
import { ChevronRightIcon, MailIcon, MessageCircleIcon } from "lucide-react"

import type { AdminTask } from "@/lib/admin-tasks"
import { cn } from "@/lib/utils"
import { Initials, Pill, WHATSAPP_BUTTON } from "@/components/dashboard/admin/admin-ui"
import { Button } from "@/components/ui/button"

/** Uma pendência: quem, por quê (com o número em negrito) e o botão da ação certa. */
export function TaskRow({ task, primary }: { task: AdminTask; primary?: boolean }) {
  const ActionIcon = task.action?.kind === "email" ? MailIcon : MessageCircleIcon
  return (
    <li className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3.5 border-t px-5 py-3 transition-colors hover:bg-muted/30">
      <Initials name={task.name} dim={task.group === "prospeccao"} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={task.href} className="font-medium hover:underline">
            {task.name}
          </Link>
          <Pill tone={task.pill.tone} dot={task.pill.tone !== "gray"}>
            {task.pill.label}
          </Pill>
        </div>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          {task.why.map((part, i) =>
            typeof part === "string" ? part : <strong key={i} className="font-medium text-foreground">{part.b}</strong>,
          )}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        {task.action ? (
          <Button asChild variant={primary && task.action.kind === "whatsapp" ? "default" : "outline"} className={cn(primary && task.action.kind === "whatsapp" && WHATSAPP_BUTTON)}>
            <a href={task.action.href} target="_blank" rel="noreferrer">
              <ActionIcon className={cn(!(primary && task.action.kind === "whatsapp") && task.action.kind === "whatsapp" && "text-[#1faa59]")} aria-hidden />
              {task.action.label}
            </a>
          </Button>
        ) : null}
        <Button asChild variant="ghost" size="icon" aria-label={`Abrir ${task.name}`}>
          <Link href={task.href}>
            <ChevronRightIcon aria-hidden />
          </Link>
        </Button>
      </div>
    </li>
  )
}
