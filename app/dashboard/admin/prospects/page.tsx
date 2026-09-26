import { SendIcon } from "lucide-react"

import { requireAdmin } from "@/lib/admin-guard"
import { listProspects } from "@/modules/admin/list-prospects"
import { AdminProspectsBoard } from "@/components/dashboard/admin/admin-prospects-board"

export const metadata = { title: "Admin · Prospecção" }

export default async function AdminProspectsPage() {
  const admin = await requireAdmin()
  const prospects = await listProspects(admin)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2.5">
          <SendIcon className="h-5 w-5 text-muted-foreground" aria-hidden />
          <h1 className="text-2xl font-semibold tracking-tight">Prospecção</h1>
        </div>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Pediatras de Minas captados na Doctoralia e no Google Maps. Filtre quem tem e-mail ou
          WhatsApp, abra o card e mande o convite de 15 dias grátis. Depois, registre cada toque
          e acompanhe quem venceu em “A contatar”.
        </p>
      </div>

      <AdminProspectsBoard prospects={prospects} />
    </div>
  )
}
