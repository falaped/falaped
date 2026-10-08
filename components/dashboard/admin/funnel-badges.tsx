import { STAGE_LABEL, TEMPERATURE_LABEL, type FunnelStage, type Temperature } from "@/lib/funnel"
import type { Tone } from "@/lib/admin-tasks"
import { Pill } from "@/components/dashboard/admin/admin-ui"

export const STAGE_TONE: Record<FunnelStage, Tone> = {
  novo: "gray",
  contatado: "amber",
  respondeu: "green",
  "em-teste": "blue",
  cliente: "blue",
  perdido: "red",
}

export const STAGE_DOT: Record<FunnelStage, string> = {
  novo: "bg-border-strong",
  contatado: "bg-warning",
  respondeu: "bg-success",
  "em-teste": "bg-primary",
  cliente: "bg-primary-ink",
  perdido: "bg-danger-text",
}

const TEMP_TONE: Record<Temperature, Tone> = { quente: "red", morno: "amber", frio: "gray" }

export function StagePill({ stage }: { stage: FunnelStage }) {
  return <Pill tone={STAGE_TONE[stage]}>{STAGE_LABEL[stage]}</Pill>
}

export function TemperaturePill({ temp }: { temp: Temperature }) {
  return <Pill tone={TEMP_TONE[temp]}>{TEMPERATURE_LABEL[temp]}</Pill>
}
