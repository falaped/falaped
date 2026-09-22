import { requireAdmin } from "@/lib/admin-guard"
import { listProfileUsage } from "@/modules/admin/list-profile-usage"
import { formatDate, formatRelativeTime } from "@/lib/formatters"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const metadata = { title: "Admin · Usuários" }

/** Colunas de consumo, na ordem em que aparecem na tabela. */
const USAGE_COLUMNS = [
  { key: "patients", label: "Pac.", title: "Pacientes" },
  { key: "cases", label: "Casos", title: "Casos" },
  { key: "appointments", label: "Cons.", title: "Consultas agendadas" },
  { key: "prescriptions", label: "Rec.", title: "Receitas" },
  { key: "certificates", label: "Atest.", title: "Atestados" },
  { key: "referrals", label: "Enc.", title: "Encaminhamentos" },
  { key: "reports", label: "Rel.", title: "Relatórios médicos" },
  { key: "case_reports", label: "Rel.Caso", title: "Relatórios de caso" },
  { key: "exam_requests", label: "Exames", title: "Pedidos de exame" },
  { key: "guidance", label: "Orient.", title: "Orientações" },
  { key: "vaccine_doses", label: "Vac.", title: "Doses vacinais" },
  { key: "measurements", label: "Med.", title: "Medições" },
  { key: "scales", label: "Esc.", title: "Escalas" },
  { key: "attachments", label: "Anex.", title: "Anexos" },
  { key: "financial_entries", label: "Fin.", title: "Lançamentos financeiros" },
] as const

export default async function AdminPage() {
  const admin = await requireAdmin()
  const rows = await listProfileUsage(admin)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Usuários</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {rows.length} conta{rows.length === 1 ? "" : "s"} cadastrada
          {rows.length === 1 ? "" : "s"} e o que cada uma já produziu.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-4">Usuário</TableHead>
              <TableHead className="px-4">Situação</TableHead>
              <TableHead className="px-4">Último caso</TableHead>
              {USAGE_COLUMNS.map((column) => (
                <TableHead
                  key={column.key}
                  title={column.title}
                  className="px-2 text-right whitespace-nowrap"
                >
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const name =
                [row.first_name, row.surname].filter(Boolean).join(" ").trim() ||
                "Sem nome"
              return (
                <TableRow key={row.profile_id}>
                  <TableCell className="px-4">
                    <div className="font-medium">{name}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.email ?? "—"}
                      {row.crm ? ` · CRM ${row.crm}` : ""}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Desde {formatDate(row.created_at)}
                    </div>
                  </TableCell>
                  <TableCell className="px-4">
                    <Badge variant={row.status === "paid" ? "default" : "secondary"}>
                      {row.status ?? "sem acesso"}
                    </Badge>
                    {row.whatsapp_linked_at ? (
                      <div className="mt-1 text-xs text-muted-foreground">
                        WhatsApp vinculado
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="px-4 text-sm whitespace-nowrap">
                    {row.last_case_at ? formatRelativeTime(row.last_case_at) : "—"}
                  </TableCell>
                  {USAGE_COLUMNS.map((column) => (
                    <TableCell
                      key={column.key}
                      className={
                        row[column.key] > 0
                          ? "px-2 text-right tabular-nums"
                          : "px-2 text-right tabular-nums text-muted-foreground/50"
                      }
                    >
                      {row[column.key]}
                    </TableCell>
                  ))}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
