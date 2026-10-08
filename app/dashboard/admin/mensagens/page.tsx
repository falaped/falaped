import { requireAdmin } from "@/lib/admin-guard"
import { listMessageTemplates } from "@/modules/admin/list-message-templates"
import { PageHero } from "@/components/dashboard/admin/admin-ui"
import { TemplateGroups } from "@/components/dashboard/admin/template-groups"

export const metadata = { title: "Admin · Mensagens" }

/** Com poucos envios a taxa engana: só disputa "melhor abertura" quem tem 5 ou mais. */
const MIN_SENDS = 5

export default async function AdminMessagesPage() {
  const admin = await requireAdmin()
  const templates = await listMessageTemplates(admin)

  const rate = (t: (typeof templates)[number]) => t.stats.opened / t.stats.sent
  const best = templates
    .filter((t) => t.channel === "email" && t.stats.sent >= MIN_SENDS)
    .sort((a, b) => rate(b) - rate(a))[0]

  return (
    <div className="flex flex-col gap-6">
      <PageHero title="Mensagens" subtitle="Os textos prontos de cada momento, para e-mail e WhatsApp" />
      <TemplateGroups templates={templates} bestId={best?.id ?? null} />
    </div>
  )
}
