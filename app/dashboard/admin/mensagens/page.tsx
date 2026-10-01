import Link from "next/link"
import {
  CreditCardIcon,
  HandIcon,
  HourglassIcon,
  LifeBuoyIcon,
  RepeatIcon,
  RotateCcwIcon,
  SendIcon,
  type LucideIcon,
} from "lucide-react"

import { requireAdmin } from "@/lib/admin-guard"
import { MESSAGE_MOMENTS, MOMENT_LABEL, type MessageMoment } from "@/lib/message-template"
import { cn } from "@/lib/utils"
import { listMessageTemplates } from "@/modules/admin/list-message-templates"
import { PageHero } from "@/components/dashboard/admin/admin-ui"
import { TemplateCards } from "@/components/dashboard/admin/template-cards"

export const metadata = { title: "Admin · Mensagens" }

const MOMENT_ICON: Record<MessageMoment, LucideIcon> = {
  convite: SendIcon,
  "follow-up": RepeatIcon,
  "boas-vindas": HandIcon,
  ajuda: LifeBuoyIcon,
  "teste-acabando": HourglassIcon,
  pagamento: CreditCardIcon,
  reativacao: RotateCcwIcon,
}

/** Com poucos envios a taxa engana: só disputa "melhor abertura" quem tem 5 ou mais. */
const MIN_SENDS = 5

export default async function AdminMessagesPage({ searchParams }: { searchParams: Promise<{ momento?: string }> }) {
  const admin = await requireAdmin()
  const { momento } = await searchParams
  const moment: MessageMoment = MESSAGE_MOMENTS.includes(momento as MessageMoment) ? (momento as MessageMoment) : "convite"
  const templates = await listMessageTemplates(admin)

  const rate = (t: (typeof templates)[number]) => t.stats.opened / t.stats.sent
  const best = templates
    .filter((t) => t.channel === "email" && t.stats.sent >= MIN_SENDS)
    .sort((a, b) => rate(b) - rate(a))[0]
  const listed = templates.filter((t) => t.moment === moment).sort((a, b) => a.channel.localeCompare(b.channel))
  const usedMoments = new Set(templates.map((t) => t.moment)).size

  return (
    <div className="flex flex-col gap-5">
      <PageHero context={`${templates.length} modelos em ${usedMoments} momentos`} title="Mensagens">
        Os textos que você manda por e-mail e WhatsApp, por momento da conversa.
        {best ? ` O que mais abre é “${best.name}”: ${Math.round(rate(best) * 100)}% de abertura em ${best.stats.sent} envios.` : ""}
      </PageHero>

      <div className="grid items-start gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav className="flex flex-col gap-0.5 rounded-2xl bg-card p-2 shadow-xs ring-1 ring-foreground/10" aria-label="Momentos">
          {MESSAGE_MOMENTS.map((m) => {
            const Icon = MOMENT_ICON[m]
            const on = m === moment
            return (
              <Link
                key={m}
                href={m === "convite" ? "/dashboard/admin/mensagens" : `/dashboard/admin/mensagens?momento=${m}`}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                  on ? "bg-primary/12 font-medium text-primary-ink" : "hover:bg-muted",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {MOMENT_LABEL[m]}
                <span className="ml-auto text-xs text-muted-foreground tabular-nums">{templates.filter((t) => t.moment === m).length}</span>
              </Link>
            )
          })}
        </nav>

        <TemplateCards templates={listed} moment={moment} bestId={best?.id ?? null} />
      </div>
    </div>
  )
}
