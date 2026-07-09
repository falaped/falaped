import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { GrowthIndicator } from "@/lib/growth-reference"
import type { Patient } from "@/modules/patients/types"
import type { Measurement } from "@/modules/patient-growth/types"

import { GrowthChart } from "./growth-chart"
import { MeasurementForm } from "./measurement-form"
import { MeasurementHistoryTable } from "./measurement-history-table"

const INDICATOR_TABS: { value: GrowthIndicator; label: string }[] = [
  { value: "weight-for-age", label: "Peso/idade" },
  { value: "height-for-age", label: "Estatura/idade" },
  { value: "bmi-for-age", label: "IMC/idade" },
  { value: "head-circumference-for-age", label: "PC/idade" },
]

export function GrowthSection({
  patient,
  measurements = [],
}: {
  patient: Patient
  measurements?: Measurement[]
}) {
  const hasMeasurements = measurements.length > 0

  return (
    <section className="space-y-6" aria-labelledby="patient-growth-heading">
      <div>
        <h2
          id="patient-growth-heading"
          className="text-lg font-semibold tracking-tight text-foreground"
        >
          Curva de crescimento
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Registre as medições ao longo do tempo e acompanhe a curva por idade
          sobre a referência da OMS.
        </p>
      </div>

      <MeasurementForm patientId={patient.id} />

      {hasMeasurements ? (
        <MeasurementHistoryTable measurements={measurements} />
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-muted/5 p-8 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            Nenhuma medição registrada
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Registre a primeira medição (peso, comprimento/estatura ou perímetro
            cefálico) para montar o histórico e ver a curva. Você pode usar datas
            passadas.
          </p>
        </div>
      )}

      <Tabs defaultValue="weight-for-age" className="gap-4">
        <TabsList>
          {INDICATOR_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {INDICATOR_TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <GrowthChart
              indicator={tab.value}
              patient={patient}
              measurements={measurements}
            />
          </TabsContent>
        ))}
      </Tabs>
    </section>
  )
}
