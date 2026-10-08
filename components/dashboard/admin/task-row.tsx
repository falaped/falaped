import Link from "next/link"
import { ChevronRightIcon, MailIcon } from "lucide-react"

import type { AdminTask } from "@/lib/admin-tasks"
import { Initials, Pill, WhatsappIcon } from "@/components/dashboard/admin/admin-ui"
import { Button } from "@/components/ui/button"

/** Uma pendência: quem, por quê (com o número em negrito) e o botão da ação certa. */
export function TaskRow({ task }: { task: AdminTask }) {
  return (
    <li className="grid min-h-16 grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-4 px-5 py-3 hover:bg-accent/40">
      <Initials name={task.name} dim={task.group === "prospeccao"} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={task.href} className="font-semibold hover:underline">
            {task.name}
          </Link>
          <Pill tone={task.pill.tone}>{task.pill.label}</Pill>
        </div>
        <p className="text-caption text-muted-foreground">
          {task.why.map((part, i) =>
            typeof part === "string" ? part : <strong key={i} className="font-semibold text-foreground">{part.b}</strong>,
          )}
        </p>
      </div>
      <div className="flex items-center gap-1">
        {task.action ? (
          <Button asChild variant="outline" size="sm">
            <a href={task.action.href} target="_blank" rel="noreferrer">
              {task.action.kind === "email" ? <MailIcon aria-hidden /> : <WhatsappIcon />}
              {task.action.label}
            </a>
          </Button>
        ) : null}
        <Button asChild variant="ghost" size="icon-sm" aria-label={`Abrir ${task.name}`}>
          <Link href={task.href}>
            <ChevronRightIcon aria-hidden />
          </Link>
        </Button>
      </div>
    </li>
  )
}
