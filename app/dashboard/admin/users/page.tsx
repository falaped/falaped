import { UsersIcon } from "lucide-react"

import { requireAdmin } from "@/lib/admin-guard"
import { listProfileUsage } from "@/modules/admin/list-profile-usage"
import {
  AdminUsersGrid,
  documentsTotal,
} from "@/components/dashboard/admin/admin-users-grid"
import { StatTile } from "@/components/dashboard/admin/stat-tile"

export const metadata = { title: "Admin · Usuários" }

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export default async function AdminUsersPage() {
  const admin = await requireAdmin()
  const rows = await listProfileUsage(admin)

  const cutoff = Date.now() - SEVEN_DAYS_MS
  const activeCount = rows.filter(
    (row) => row.last_case_at !== null && new Date(row.last_case_at).getTime() >= cutoff,
  ).length
  const dormantCount = rows.filter((row) => row.last_case_at === null).length
  const sum = (pick: (row: (typeof rows)[number]) => number) =>
    rows.reduce((total, row) => total + pick(row), 0)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2.5">
          <UsersIcon className="h-5 w-5 text-muted-foreground" aria-hidden />
          <h1 className="text-2xl font-semibold tracking-tight">Usuários</h1>
        </div>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Toda conta cadastrada e o que ela já produziu. Clique num card para ver o
          consumo detalhado.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Contas"
          value={rows.length}
          hint={`${dormantCount} nunca abriram um caso`}
        />
        <StatTile
          label="Ativas em 7 dias"
          value={activeCount}
          hint="com caso aberto na última semana"
        />
        <StatTile label="Pacientes cadastrados" value={sum((row) => row.patients)} />
        <StatTile label="Documentos emitidos" value={sum(documentsTotal)} />
      </div>

      <AdminUsersGrid rows={rows} />
    </div>
  )
}
