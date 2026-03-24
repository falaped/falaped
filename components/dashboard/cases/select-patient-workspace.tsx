"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { SearchIcon, UserRoundIcon } from "lucide-react"
import { toast } from "sonner"
import { createDashboardCaseWithPatientAction } from "@/actions/cases/create-dashboard-case-with-patient"
import { precheckNewDashboardCaseAction } from "@/actions/cases/precheck-new-dashboard-case"
import type { Patient } from "@/modules/patients/types"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { formatDate } from "@/lib/formatters"

function matchesSearch(patient: Patient, query: string): boolean {
  if (!query.trim()) return true
  const normalized = query.toLowerCase()
  return (
    patient.name.toLowerCase().includes(normalized) ||
    (patient.responsible ?? "").toLowerCase().includes(normalized)
  )
}

export function SelectPatientWorkspace({
  patients,
  initialPatientId,
  activeCaseByPatientId,
}: {
  patients: Patient[]
  initialPatientId: string | null
  activeCaseByPatientId: Record<string, { id: string; origin: "dashboard" | "whatsapp" }>
}) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [pendingPatientId, setPendingPatientId] = useState<string | null>(null)
  const [willCloseCurrentCaseDialogOpen, setWillCloseCurrentCaseDialogOpen] =
    useState(false)
  const [isPending, startTransition] = useTransition()

  const filteredPatients = useMemo(
    () => patients.filter((patient) => matchesSearch(patient, query)),
    [patients, query],
  )
  const selectedByQuery = useMemo(
    () => patients.find((patient) => patient.id === initialPatientId) ?? null,
    [initialPatientId, patients],
  )

  const handleCreateCase = (patientId: string) => {
    startTransition(async () => {
      const precheck = await precheckNewDashboardCaseAction()

      if (!precheck.ok && precheck.code === "whatsapp_active" && precheck.activeCaseId) {
        toast.error("Existe um caso ativo do WhatsApp.", {
          action: {
            label: "Abrir caso",
            onClick: () => router.push(`/dashboard/cases/${precheck.activeCaseId}`),
          },
        })
        return
      }

      if (!precheck.ok) {
        toast.error(precheck.error)
        return
      }

      if (precheck.willClosePriorActiveDashboardCases) {
        setPendingPatientId(patientId)
        setWillCloseCurrentCaseDialogOpen(true)
        return
      }

      const created = await createDashboardCaseWithPatientAction(patientId)
      if (!created.ok) {
        if (created.code === "whatsapp_active" && created.activeCaseId) {
          toast.error(created.error, {
            action: {
              label: "Abrir caso",
              onClick: () => router.push(`/dashboard/cases/${created.activeCaseId}`),
            },
          })
          return
        }
        toast.error(created.error)
        return
      }

      router.push(`/dashboard/cases/new/${created.caseId}`)
    })
  }

  const handleConfirmReplaceAndCreate = () => {
    if (!pendingPatientId) return

    startTransition(async () => {
      const created = await createDashboardCaseWithPatientAction(pendingPatientId)
      if (!created.ok) {
        toast.error(created.error)
        return
      }
      setWillCloseCurrentCaseDialogOpen(false)
      setPendingPatientId(null)
      router.push(`/dashboard/cases/new/${created.caseId}`)
    })
  }

  return (
    <section
      aria-label="Área de seleção de paciente para novo caso"
      className="flex flex-col gap-6"
    >
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Novo caso</h1>
        <p className="text-sm text-muted-foreground">
          Selecione um paciente para iniciar o workspace de prontuário assistido.
        </p>
      </div>

      <div className="relative max-w-xl">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Buscar paciente por nome ou responsável"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nome do paciente ou responsável"
          className="pl-9"
        />
      </div>

      {selectedByQuery ? (
        <Card className="border-primary/25 bg-primary/5">
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Paciente selecionado na tela anterior</p>
              <p className="text-sm font-medium">{selectedByQuery.name}</p>
            </div>
            {activeCaseByPatientId[selectedByQuery.id] ? (
              <Button
                variant="outline"
                onClick={() => {
                  const activeCase = activeCaseByPatientId[selectedByQuery.id]
                  if (activeCase.origin === "dashboard") {
                    router.push(`/dashboard/cases/new/${activeCase.id}`)
                    return
                  }
                  router.push(`/dashboard/cases/${activeCase.id}`)
                }}
              >
                Acessar caso ativo
              </Button>
            ) : (
              <Button disabled={isPending} onClick={() => handleCreateCase(selectedByQuery.id)}>
                Iniciar novo caso agora
              </Button>
            )}
          </CardContent>
        </Card>
      ) : null}

      {filteredPatients.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-sm font-medium">Nenhum paciente encontrado.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ajuste o filtro ou cadastre um novo paciente para iniciar um caso.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredPatients.map((patient) => (
            <Card key={patient.id} className="border-border/70">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <UserRoundIcon className="h-4 w-4 text-primary" />
                    <span className="truncate">{patient.name}</span>
                  </CardTitle>
                  {activeCaseByPatientId[patient.id] ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2.5 text-xs"
                      onClick={() => {
                        const activeCase = activeCaseByPatientId[patient.id]
                        if (activeCase.origin === "dashboard") {
                          router.push(`/dashboard/cases/new/${activeCase.id}`)
                          return
                        }
                        router.push(`/dashboard/cases/${activeCase.id}`)
                      }}
                    >
                      Acessar
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="h-7 px-2.5 text-xs"
                      onClick={() => handleCreateCase(patient.id)}
                      disabled={isPending}
                    >
                      Iniciar caso
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground">Responsável:</span>{" "}
                    {patient.responsible ?? "Não informado"}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Nascimento:</span>{" "}
                    {patient.birth_date ? formatDate(patient.birth_date) : "Não informado"}
                  </p>
                </div>
                {activeCaseByPatientId[patient.id] ? (
                  <p className="text-xs text-muted-foreground">
                    Paciente com caso ativo. Use o botão no topo direito para acessar.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog
        open={willCloseCurrentCaseDialogOpen}
        onOpenChange={setWillCloseCurrentCaseDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Substituir caso ativo do painel?</AlertDialogTitle>
            <AlertDialogDescription>
              Existe um caso ativo iniciado no painel. Ao continuar, esse caso será encerrado
              para abrir um novo atendimento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReplaceAndCreate} disabled={isPending}>
              Confirmar e continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

