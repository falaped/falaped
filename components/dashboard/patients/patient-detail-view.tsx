"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { Trash2Icon } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { PatientForm } from "@/components/dashboard/patients/patient-form"
import { deletePatientAction } from "@/actions"
import { formatDate, formatBrazilianPhone } from "@/lib/formatters"
import type { Patient } from "@/modules/patients/types"
import type { CaseForPatient } from "@/modules/cases/get-cases-by-patient-id"
import { MessageSquareIcon } from "lucide-react"

function formatSexForDisplay(sex: string | null | undefined): string {
  if (!sex?.trim()) return ""
  const v = sex.trim()
  if (v === "M") return "Masculino"
  if (v === "F") return "Feminino"
  return v
}

export function PatientDetailView({
  patient,
  cases = [],
}: {
  patient: Patient
  cases?: CaseForPatient[]
}) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  function handleUpdateSuccess() {
    router.refresh()
    setIsEditing(false)
  }

  async function handleConfirmDelete() {
    setDeleteLoading(true)
    try {
      const result = await deletePatientAction(patient.id)
      if (result.ok) {
        toast.success("Paciente excluído.")
        router.push("/dashboard/patients")
      } else {
        toast.error(result.error)
      }
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {patient.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Dados do paciente
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/patients">Voltar</Link>
          </Button>
          {!isEditing && (
            <>
              <Button onClick={() => setIsEditing(true)}>Editar</Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="icon" aria-label="Excluir paciente">
                    <Trash2Icon className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-md">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir paciente?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. O paciente será removido e os casos vinculados a ele ficarão sem paciente associado.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleteLoading}>
                      Cancelar
                    </AlertDialogCancel>
                    <Button
                      variant="destructive"
                      onClick={handleConfirmDelete}
                      disabled={deleteLoading}
                    >
                      {deleteLoading ? "Excluindo..." : "Excluir"}
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <PatientForm
          mode="edit"
          patient={patient}
          onUpdateSuccess={handleUpdateSuccess}
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-1">
          <Card>
            <CardHeader>
              <CardTitle>Dados pessoais</CardTitle>
              <CardDescription>Identificação e contato</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="font-medium text-muted-foreground">Nome</span>
                <p className="mt-0.5">{patient.name}</p>
              </div>
              {patient.birth_date && (
                <div>
                  <span className="font-medium text-muted-foreground">
                    Data de nascimento
                  </span>
                  <p className="mt-0.5">
                    {formatDate(patient.birth_date)}
                  </p>
                </div>
              )}
              {patient.sex && (
                <div>
                  <span className="font-medium text-muted-foreground">Sexo</span>
                  <p className="mt-0.5">{formatSexForDisplay(patient.sex)}</p>
                </div>
              )}
              {patient.responsible && (
                <div>
                  <span className="font-medium text-muted-foreground">
                    Responsável
                  </span>
                  <p className="mt-0.5">{patient.responsible}</p>
                </div>
              )}
              {patient.contact_phone && (
                <div>
                  <span className="font-medium text-muted-foreground">
                    Telefone de contato
                  </span>
                  <p className="mt-0.5">
                    <a
                      href={`tel:${patient.contact_phone}`}
                      className="text-primary hover:underline"
                    >
                      {formatBrazilianPhone(patient.contact_phone)}
                    </a>
                  </p>
                </div>
              )}
              {patient.legal_guardian && (
                <div>
                  <span className="font-medium text-muted-foreground">
                    Responsável legal
                  </span>
                  <p className="mt-0.5">{patient.legal_guardian}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dados clínicos</CardTitle>
              <CardDescription>Informações médicas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {patient.blood_type && (
                <div>
                  <span className="font-medium text-muted-foreground">
                    Tipo sanguíneo
                  </span>
                  <p className="mt-0.5">{patient.blood_type}</p>
                </div>
              )}
              {(patient.weight ||
                patient.height ||
                patient.head_circumference) && (
                  <div className="flex flex-wrap gap-4">
                    {patient.weight && (
                      <div>
                        <span className="font-medium text-muted-foreground">
                          Peso
                        </span>
                        <p className="mt-0.5">{patient.weight} kg</p>
                      </div>
                    )}
                    {patient.height && (
                      <div>
                        <span className="font-medium text-muted-foreground">
                          Altura
                        </span>
                        <p className="mt-0.5">{patient.height} cm</p>
                      </div>
                    )}
                    {patient.head_circumference && (
                      <div>
                        <span className="font-medium text-muted-foreground">
                          Perímetro cefálico
                        </span>
                        <p className="mt-0.5">
                          {patient.head_circumference} cm
                        </p>
                      </div>
                    )}
                  </div>
                )}
              {patient.allergies && (
                <div>
                  <span className="font-medium text-muted-foreground">
                    Alergias
                  </span>
                  <p className="mt-0.5 whitespace-pre-wrap">
                    {patient.allergies}
                  </p>
                </div>
              )}
              {patient.current_medications && (
                <div>
                  <span className="font-medium text-muted-foreground">
                    Medicamentos em uso
                  </span>
                  <p className="mt-0.5 whitespace-pre-wrap">
                    {patient.current_medications}
                  </p>
                </div>
              )}
              {patient.medical_history && (
                <div>
                  <span className="font-medium text-muted-foreground">
                    Histórico médico
                  </span>
                  <p className="mt-0.5 whitespace-pre-wrap">
                    {patient.medical_history}
                  </p>
                </div>
              )}
              {!patient.blood_type &&
                !patient.weight &&
                !patient.height &&
                !patient.head_circumference &&
                !patient.allergies &&
                !patient.current_medications &&
                !patient.medical_history && (
                  <p className="text-muted-foreground">
                    Nenhum dado clínico cadastrado.
                  </p>
                )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquareIcon className="h-5 w-5" />
                Casos associados
              </CardTitle>
              <CardDescription>
                Atendimentos vinculados a este paciente
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cases.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum caso associado a este paciente.
                </p>
              ) : (
                <ul className="space-y-2">
                  {cases.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/dashboard/cases/${c.id}`}
                        className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                      >
                        <span>
                          {c.status === "active" ? "Ativo" : "Encerrado"} ·{" "}
                          {formatDate(c.started_at)}
                        </span>
                        <span className="text-muted-foreground">
                          Ver atendimento →
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
