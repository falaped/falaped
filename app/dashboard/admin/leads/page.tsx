import { requireAdmin } from "@/lib/admin-guard"
import { listLeads, type LeadOrigin } from "@/modules/admin/list-leads"
import { formatDateTime } from "@/lib/formatters"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const metadata = { title: "Admin · Leads" }

const ORIGIN_LABEL: Record<LeadOrigin, string> = {
  site: "Landing",
  books: "Livros",
  whatsapp: "WhatsApp",
}

export default async function AdminLeadsPage() {
  const admin = await requireAdmin()
  const leads = await listLeads(admin)

  const byOrigin = (origin: LeadOrigin) =>
    leads.filter((lead) => lead.origin === origin).length

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {leads.length} lead{leads.length === 1 ? "" : "s"} — {byOrigin("site")} da
          landing, {byOrigin("books")} dos livros, {byOrigin("whatsapp")} do WhatsApp.
        </p>
      </div>

      {leads.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm font-medium">Nenhum lead ainda.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Os cadastros das landings aparecem aqui assim que chegam.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4">Origem</TableHead>
                <TableHead className="px-4">Nome</TableHead>
                <TableHead className="px-4">E-mail</TableHead>
                <TableHead className="px-4">WhatsApp</TableHead>
                <TableHead className="px-4">Detalhe</TableHead>
                <TableHead className="px-4">Entrada</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={`${lead.origin}-${lead.id}`}>
                  <TableCell className="px-4">
                    <Badge variant="secondary">{ORIGIN_LABEL[lead.origin]}</Badge>
                  </TableCell>
                  <TableCell className="px-4 font-medium">{lead.name || "—"}</TableCell>
                  <TableCell className="px-4">{lead.email || "—"}</TableCell>
                  <TableCell className="px-4 whitespace-nowrap">
                    {lead.phone || "—"}
                  </TableCell>
                  <TableCell className="px-4 text-sm text-muted-foreground">
                    {lead.detail || "—"}
                  </TableCell>
                  <TableCell className="px-4 text-sm whitespace-nowrap">
                    {formatDateTime(lead.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
