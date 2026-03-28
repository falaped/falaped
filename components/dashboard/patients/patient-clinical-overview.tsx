import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { ActivityIcon, CircleDotIcon, HistoryIcon, RulerIcon, WeightIcon } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getPatientChartBmiPresentation } from "@/lib/patient-bmi-ui-status"
import type { PatientBmiUiStatus } from "@/lib/patient-bmi-ui-status"
import type { Patient } from "@/modules/patients/types"

import { PatientClinicalAlertPanel } from "@/components/dashboard/patients/patient-clinical-alert-panel"
import { cn } from "@/lib/utils"

function MetricTile({
  icon: Icon,
  label,
  value,
  unit,
  className,
}: {
  icon: LucideIcon
  label: string
  value: string
  unit: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border border-border bg-muted/15 p-4 transition-colors hover:bg-muted/25",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums text-foreground">
        {value}
      </p>
      <p className="mt-0.5 text-sm text-muted-foreground">{unit}</p>
    </div>
  )
}

function bmiCardClass(status: PatientBmiUiStatus | "invalid"): string {
  if (status === "invalid") {
    return "border-destructive/50 bg-destructive/10"
  }
  if (status === "good") {
    return "border-chart-2/50 bg-chart-2/10"
  }
  if (status === "warn") {
    return "border-chart-4/55 bg-chart-4/10"
  }
  return "border-destructive/50 bg-destructive/10"
}

type PatientClinicalOverviewProps = {
  patient: Patient
}

export function PatientClinicalOverview({ patient }: PatientClinicalOverviewProps) {
  const bmiPresentation = getPatientChartBmiPresentation(patient)
  const hasAnthro =
    Boolean(patient.weight?.trim()) ||
    Boolean(patient.height?.trim()) ||
    Boolean(patient.head_circumference?.trim())
  const hasHistory = Boolean(patient.medical_history?.trim())
  const showBmiCard =
    bmiPresentation.kind === "value" || bmiPresentation.kind === "invalid"

  const anthroTiles: ReactNode[] = []
  if (patient.weight?.trim()) {
    anthroTiles.push(
      <MetricTile
        key="w"
        icon={WeightIcon}
        label="Peso"
        value={patient.weight.trim()}
        unit="quilogramas"
      />,
    )
  }
  if (patient.height?.trim()) {
    anthroTiles.push(
      <MetricTile
        key="h"
        icon={RulerIcon}
        label="Comprimento / altura"
        value={patient.height.trim()}
        unit="centímetros"
      />,
    )
  }
  if (patient.head_circumference?.trim()) {
    anthroTiles.push(
      <MetricTile
        key="pc"
        icon={CircleDotIcon}
        label="Perímetro cefálico"
        value={patient.head_circumference.trim()}
        unit="centímetros"
      />,
    )
  }

  const showEmptyClinical =
    !hasAnthro &&
    !hasHistory &&
    !patient.allergies?.trim() &&
    !patient.current_medications?.trim()

  return (
    <section className="space-y-6" aria-labelledby="patient-clinical-heading">
      <PatientClinicalAlertPanel patient={patient} />

      <div>
        <h2
          id="patient-clinical-heading"
          className="text-lg font-semibold tracking-tight text-foreground"
        >
          Medidas e histórico
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Antropometria e IMC estimado; faixas de cor são referência simplificada para triagem na
          tela, não substituem curvas de crescimento.
        </p>
      </div>

      {hasAnthro || showBmiCard ? (
        <div
          className={cn(
            "grid gap-3",
            showBmiCard && anthroTiles.length > 0
              ? "sm:grid-cols-2 lg:grid-cols-4"
              : "sm:grid-cols-2 lg:grid-cols-3",
          )}
        >
          {anthroTiles}
          {showBmiCard ? (
            <div
              className={cn(
                "flex flex-col rounded-lg border-2 p-4 transition-colors",
                bmiPresentation.kind === "value"
                  ? bmiCardClass(bmiPresentation.status)
                  : bmiCardClass("invalid"),
              )}
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <ActivityIcon className="h-4 w-4 shrink-0" aria-hidden />
                <span className="text-xs font-medium uppercase tracking-wide">IMC estimado</span>
              </div>
              {bmiPresentation.kind === "value" ? (
                <>
                  <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums text-foreground">
                    {bmiPresentation.label}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">kg/m²</p>
                  <p className="mt-3 text-xs leading-snug text-muted-foreground">
                    {bmiPresentation.status === "good"
                      ? "Dentro de uma faixa usual para a idade (referência simplificada)."
                      : bmiPresentation.status === "warn"
                        ? "Fora da faixa usual — confira medidas e curvas na consulta."
                        : "Valor muito fora do esperado — confira peso, altura e idade cadastrados."}
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-3 text-sm font-medium text-foreground">Não calculado</p>
                  <p className="mt-2 text-xs leading-snug text-muted-foreground">
                    {bmiPresentation.message}
                  </p>
                </>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {hasHistory ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <HistoryIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              Histórico médico
            </CardTitle>
            <CardDescription>Notas livres cadastradas na ficha</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {patient.medical_history}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {showEmptyClinical ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/5 p-8 text-center">
          <p className="text-sm font-medium text-muted-foreground">Nenhuma medida ou histórico</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastre peso, altura ou notas clínicas ao editar o paciente para enriquecer esta seção.
          </p>
        </div>
      ) : null}
    </section>
  )
}
