import { MagnetIcon } from "lucide-react"

import { requireAdmin } from "@/lib/admin-guard"
import { listLeads, type LeadOrigin } from "@/modules/admin/list-leads"
import { AdminLeadsGrid } from "@/components/dashboard/admin/admin-leads-grid"
import { StatTile } from "@/components/dashboard/admin/stat-tile"

export const metadata = { title: "Admin · Leads" }

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

export default async function AdminLeadsPage() {
  const admin = await requireAdmin()
  const leads = await listLeads(admin)

  const countOf = (origin: LeadOrigin) =>
    leads.filter((lead) => lead.origin === origin).length
  const cutoff = Date.now() - THIRTY_DAYS_MS
  const recentCount = leads.filter(
    (lead) => new Date(lead.created_at).getTime() >= cutoff,
  ).length

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2.5">
          <MagnetIcon className="h-5 w-5 text-muted-foreground" aria-hidden />
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
        </div>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Quem deixou contato nas landings e quem escreveu no WhatsApp sem ter conta.
          Clique num card para ver tudo e abrir a conversa.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Total"
          value={leads.length}
          hint={`${recentCount} nos últimos 30 dias`}
        />
        <StatTile label="Landing" value={countOf("site")} />
        <StatTile label="Livros" value={countOf("books")} />
        <StatTile label="WhatsApp" value={countOf("whatsapp")} />
      </div>

      <AdminLeadsGrid leads={leads} />
    </div>
  )
}
