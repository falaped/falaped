import Link from "next/link"
import { redirect } from "next/navigation"
import { UserPlusIcon } from "lucide-react"

import { PatientsList } from "@/components/dashboard/patients/patients-list"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getPatientsByProfileId } from "@/modules/patients/get-patients-by-profile-id"
import { getPatientsOverview } from "@/modules/patients/get-patients-overview"
import { getPatientsPhotoSignedUrls } from "@/modules/patients/get-patients-photo-signed-urls"

// TTL um pouco maior para a lista (still private) — Pitfall 1: planner discretion.
const LIST_SIGNED_URL_EXPIRY_SECONDS = 300

/**
 * Pacientes (protótipo b4), no padrão do Início: topo em destaque e a lista com abas.
 */
export async function PatientsContent() {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) redirect("/auth/login")
  if (profile.status !== "paid") redirect("/dashboard/link-whatsapp")

  const patients = await getPatientsByProfileId(supabase, profile.id)

  // Uma única chamada em lote (sem N+1 na lista — RESEARCH Pattern 3).
  const paths = patients.map((p) => p.photo_path).filter((p): p is string => Boolean(p))
  const [overview, urlByPath] = await Promise.all([
    getPatientsOverview(supabase, patients, profile.id),
    getPatientsPhotoSignedUrls(supabase, paths, LIST_SIGNED_URL_EXPIRY_SECONDS),
  ])

  return (
    <div className="flex w-full max-w-[1440px] flex-col gap-6">
      <section className="flex items-center gap-6 rounded-xl border border-primary-soft-border bg-highlight px-8 py-7 shadow-sm">
        <div>
          <h1 className="font-display text-display font-semibold">Seus pacientes</h1>
          <p className="mt-1 text-read text-muted-foreground">Crianças que você acompanha, das atendidas por último às mais antigas</p>
        </div>
        <Button asChild size="lg" variant="outline" className="ml-auto">
          <Link href="/dashboard/patients/new">
            <UserPlusIcon data-icon="inline-start" />
            Cadastrar paciente
          </Link>
        </Button>
      </section>

      <PatientsList
        rows={overview.rows.map((row) => ({
          ...row,
          photoUrl: row.patient.photo_path ? (urlByPath.get(row.patient.photo_path) ?? null) : null,
        }))}
        activeCase={overview.activeCase}
        nowIso={new Date().toISOString()}
      />
    </div>
  )
}
