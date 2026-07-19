"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { toast } from "sonner"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { UserPlus, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MedicalCertificatePatientPickerSheet } from "@/components/dashboard/medical-certificates/medical-certificate-patient-picker-sheet"
import { computePediatricAge } from "@/lib/compute-pediatric-age"
import { formatPediatricAge } from "@/lib/format-pediatric-age"
import { generateGuidanceAction } from "@/actions"
import type { Patient } from "@/modules/patients/types"
import type {
  GuidanceDocumentPayload,
  GuidanceTemplate,
} from "@/modules/guidance/types"

type GuidanceWizardProfile = {
  id: string
  first_name: string | null
  surname: string | null
  crm: string | null
  rqe?: string | null
  default_location_state?: string | null
  default_location_city?: string | null
}

type GuidanceWizardProps = {
  patients: Patient[]
  profile: GuidanceWizardProfile
  templates: GuidanceTemplate[]
  /** When set, pre-selects this patient (e.g. from `?patientId=`). */
  initialPatientId?: string | null
  /** When set, associates the generated guidance with this case (`?caseId=`). */
  initialCaseId?: string | null
}

const NEW_GUIDANCE_PATH = "/dashboard/guidance/new"

export function GuidanceWizard({
  patients,
  templates,
  initialPatientId = null,
  initialCaseId = null,
}: GuidanceWizardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const prevPathnameRef = useRef(pathname)
  const initialPatientFromUrlApplied = useRef(false)

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>("")
  const [body, setBody] = useState("")
  const [issuedAt] = useState(format(new Date(), "yyyy-MM-dd"))
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    const isOnNewPage = pathname === NEW_GUIDANCE_PATH
    const wasOnOtherPage = prevPathnameRef.current !== NEW_GUIDANCE_PATH
    if (isOnNewPage && wasOnOtherPage) {
      setSelectedPatient(null)
      setPickerOpen(false)
      setSelectedMilestoneId("")
      setBody("")
      initialPatientFromUrlApplied.current = false
    }
    prevPathnameRef.current = pathname
  }, [pathname])

  useEffect(() => {
    const id = initialPatientId?.trim()
    if (!id || patients.length === 0 || initialPatientFromUrlApplied.current)
      return
    const patient = patients.find((p) => p.id === id)
    if (!patient) return
    initialPatientFromUrlApplied.current = true
    setSelectedPatient(patient)
    setPickerOpen(false)
  }, [initialPatientId, patients])

  function handleSelectPatient(patient: Patient) {
    setSelectedPatient(patient)
    setPickerOpen(false)
  }

  function handleRemovePatient() {
    setSelectedPatient(null)
  }

  function handleSelectMilestone(id: string) {
    setSelectedMilestoneId(id)
    const template = templates.find((t) => t.id === id)
    setBody(template?.body ?? "")
  }

  function buildPayload(milestoneLabel: string): GuidanceDocumentPayload {
    return {
      patientName: selectedPatient?.name?.trim() || undefined,
      birthDate: selectedPatient?.birth_date?.trim() || undefined,
      milestone: milestoneLabel,
      body: body.trim(),
    }
  }

  function handleGenerate() {
    const template = templates.find((t) => t.id === selectedMilestoneId)
    if (!template) {
      toast.error("Selecione um marco.")
      return
    }
    if (!body.trim()) {
      toast.error("Informe o texto da orientação.")
      return
    }
    const payload = buildPayload(template.milestone)
    setGenerating(true)
    generateGuidanceAction({
      payload,
      issuedAt: issuedAt
        ? new Date(issuedAt + "T12:00:00").toISOString().slice(0, 10)
        : undefined,
      patientId: selectedPatient?.id ?? null,
      caseId: initialCaseId?.trim() || null,
    })
      .then((result) => {
        if (result.ok) {
          const blob = new Blob(
            [Uint8Array.from(atob(result.pdfBase64), (c) => c.charCodeAt(0))],
            { type: "application/pdf" },
          )
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = result.filename
          a.click()
          URL.revokeObjectURL(url)
          toast.success("Orientação gerada. Download iniciado.")
          router.push("/dashboard/guidance")
          router.refresh()
        } else {
          toast.error(getFriendlyToastMessage(result.error))
        }
      })
      .finally(() => setGenerating(false))
  }

  const ageLabel = selectedPatient
    ? formatPediatricAge(computePediatricAge(selectedPatient.birth_date))
    : ""

  return (
    <>
      <div className="space-y-6">
        {/* Passo 1 — Associar paciente */}
        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">
                Passo 1 — Associar paciente
              </CardTitle>
              <CardDescription className="mt-1">
                Selecione o paciente para preencher o cabeçalho da orientação.
              </CardDescription>
            </div>
            {!selectedPatient ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => setPickerOpen(true)}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Associar paciente
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            {selectedPatient ? (
              <div className="rounded-lg border border-border bg-muted/30 px-5 py-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <p className="font-semibold text-foreground">
                      {selectedPatient.name}
                    </p>
                    <span className="text-muted-foreground">·</span>
                    <p className="text-sm text-muted-foreground">
                      {selectedPatient.birth_date
                        ? format(
                            new Date(selectedPatient.birth_date + "T12:00:00"),
                            "dd/MM/yyyy",
                            { locale: ptBR },
                          )
                        : "Data de nascimento não informada"}
                    </p>
                    {ageLabel ? (
                      <>
                        <span className="text-muted-foreground">·</span>
                        <p className="text-sm text-muted-foreground">
                          {ageLabel}
                        </p>
                      </>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleRemovePatient}
                  >
                    Remover paciente
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Passo 2 — Marco e texto */}
        {selectedPatient ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Passo 2 — Marco e texto da orientação
              </CardTitle>
              <CardDescription className="mt-1">
                Selecione o marco; o texto carrega editável no preview antes de
                gerar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field>
                <FieldLabel>Marco</FieldLabel>
                <FieldContent>
                  <Select
                    value={selectedMilestoneId}
                    onValueChange={handleSelectMilestone}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um marco" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.milestone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldContent>
              </Field>

              {selectedMilestoneId ? (
                <Field>
                  <FieldLabel>Texto da orientação</FieldLabel>
                  <FieldContent>
                    <Textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={8}
                    />
                  </FieldContent>
                </Field>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </div>

      {selectedPatient ? (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Button onClick={handleGenerate} disabled={generating}>
            <BookOpen className="mr-2 h-4 w-4" />
            {generating ? "Gerando…" : "Gerar orientação"}
          </Button>
        </div>
      ) : null}

      <MedicalCertificatePatientPickerSheet
        patients={patients}
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handleSelectPatient}
      />
    </>
  )
}
