import { redirect } from "next/navigation"

import type { ConsultDoctor } from "@/components/dashboard/cases/consult-prescription-panel"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

/** Sessão, gate de assinatura e o cabeçalho do médico para a prévia das páginas de modelo. */
export async function loadTemplatePage() {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) redirect("/auth/login")
  if (profile.status !== "paid") redirect("/dashboard/link-whatsapp")
  const doctor: ConsultDoctor = {
    first_name: profile.first_name,
    surname: profile.surname,
    crm: profile.crm,
    rqe: profile.rqe,
    default_location_state: profile.default_location_state,
    default_location_city: profile.default_location_city,
  }
  return { supabase, profileId: profile.id, doctor }
}
