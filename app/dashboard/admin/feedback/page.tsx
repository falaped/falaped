import Link from "next/link"

import { requireAdmin } from "@/lib/admin-guard"
import { accountDisplayName } from "@/lib/account-health"
import { FEEDBACK_KIND_LABEL, FEEDBACK_STATUSES, FEEDBACK_STATUS_LABEL, feedbackPageLabel, type FeedbackStatus } from "@/lib/feedback"
import { formatRelativeTime } from "@/lib/formatters"
import { listFeedback } from "@/modules/admin/list-feedback"
import { Initials, LinkTab, PageHero, Pill } from "@/components/dashboard/admin/admin-ui"
import { FeedbackStatusButtons } from "@/components/dashboard/admin/feedback-status-buttons"

export const metadata = { title: "Admin · Feedback" }

const KIND_TONE = { sugestao: "blue", problema: "red", elogio: "green" } as const
const TABS: { key: FeedbackStatus | "todos"; label: string }[] = [
  ...FEEDBACK_STATUSES.map((s) => ({ key: s, label: s === "novo" ? "Novos" : s === "feito" ? "Feitos" : FEEDBACK_STATUS_LABEL[s] })),
  { key: "todos", label: "Todos" },
]

/** Aba Feedback (protótipo h8): o que os pediatras enviaram pelo menu, por status. */
export default async function AdminFeedbackPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const admin = await requireAdmin()
  const { status } = await searchParams
  const tab = TABS.some((t) => t.key === status) ? (status as FeedbackStatus | "todos") : "novo"
  const all = await listFeedback(admin)
  const count = (key: (typeof TABS)[number]["key"]) => (key === "todos" ? all.length : all.filter((f) => f.status === key).length)
  const visible = tab === "todos" ? all : all.filter((f) => f.status === tab)

  return (
    <div className="flex flex-col gap-6">
      <PageHero title="Feedback" subtitle="O que os pediatras pedem, reclamam e elogiam" />

      <section className="rounded-xl border border-border bg-card">
        <div className="flex gap-5 border-b border-border px-5 pt-4">
          {TABS.map((t) => (
            <LinkTab
              key={t.key}
              href={t.key === "novo" ? "/dashboard/admin/feedback" : `/dashboard/admin/feedback?status=${t.key}`}
              active={tab === t.key}
              count={count(t.key)}
              warn={t.key === "novo"}
            >
              {t.label}
            </LinkTab>
          ))}
        </div>

        {visible.length === 0 ? (
          <p className="px-5 py-12 text-center text-muted-foreground">
            {all.length === 0 ? "Nenhum feedback ainda. Ele chega pelo item Enviar feedback do menu." : "Nada neste status."}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((f) => {
              const name = f.profile ? accountDisplayName(f.profile) : "Conta removida"
              return (
                <li key={f.id} className="grid grid-cols-[36px_minmax(0,1fr)_auto] gap-4 px-5 py-4 hover:bg-accent/40">
                  <Initials name={name} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/dashboard/admin/users/${f.profile_id}`} className="font-semibold hover:underline">
                        {name}
                      </Link>
                      <Pill tone={KIND_TONE[f.kind]}>{FEEDBACK_KIND_LABEL[f.kind]}</Pill>
                      <span className="text-caption text-subtle-foreground">
                        {feedbackPageLabel(f.page)} · {formatRelativeTime(f.created_at)}
                      </span>
                    </div>
                    <p className="mt-1 text-read whitespace-pre-line">{f.message}</p>
                  </div>
                  <FeedbackStatusButtons id={f.id} status={f.status} />
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
