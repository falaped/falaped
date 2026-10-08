import { redirect } from "next/navigation"

/** Antiga seção "Atendimentos": o menu agora tem Consultas e Pacientes direto. */
export default function AppointmentsPage() {
  redirect("/dashboard/cases")
}
