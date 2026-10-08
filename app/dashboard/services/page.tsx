import { Suspense } from "react"

import { DocumentsContent } from "@/components/dashboard/documents/documents-content"
import { PatientsLoading } from "@/components/dashboard/patients/patients-loading"

export const metadata = { title: "Documentos" }

export default function DocumentsPage() {
  return (
    <Suspense fallback={<PatientsLoading label="Carregando documentos" />}>
      <DocumentsContent />
    </Suspense>
  )
}
