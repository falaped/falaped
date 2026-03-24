import { redirect } from "next/navigation"

export default function NewCasePage() {
  redirect("/dashboard/cases/select-patient")
}

