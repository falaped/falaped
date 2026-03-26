import type { StoredDataItem } from "@/modules/falaped-assistant/contracts/assistant-types"
import { normalizeText } from "@/modules/falaped-assistant/lib/normalize-text"
import {
  parseWeightHeightForBmi,
  stripNeonatalBirthMeasuresFromParsedAnthropometrics,
  computePediatricBmi,
} from "@/lib/parse-anthropometrics-for-bmi"

export function extractStoredData(message: string): StoredDataItem[] {
  const data: StoredDataItem[] = []
  const normalized = normalizeText(message).replace(",", ".")

  if (normalized.includes("conduta")) {
    data.push({
      section: "CONDUTA",
      label: "Conduta informada",
      value: message.trim(),
      status: "confirmado",
    })
  }

  const parsed = stripNeonatalBirthMeasuresFromParsedAnthropometrics(
    message,
    parseWeightHeightForBmi(message),
  )
  if (parsed.weightKg) {
    data.push({
      section: "DADOS_ANTROPOMETRICOS",
      label: "Peso",
      value: `${parsed.weightKg.toFixed(3).replace(/\.?0+$/, "")} kg`,
      status: "confirmado",
    })
  }
  if (parsed.heightM) {
    data.push({
      section: "DADOS_ANTROPOMETRICOS",
      label: "Comprimento / altura",
      value: `${(parsed.heightM * 100).toFixed(1)} cm`,
      status: "confirmado",
    })
  }

  if (parsed.weightKg && parsed.heightM) {
    const bmiResult = computePediatricBmi(parsed.weightKg, parsed.heightM)
    if (bmiResult.ok) {
      data.push({
        section: "DADOS_ANTROPOMETRICOS",
        label: "IMC estimado",
        value: bmiResult.bmi.toFixed(1),
        status: "pendente_de_confirmacao",
      })
    }
  }

  return data
}

export function buildBmiStoredData(params: {
  weightKg: number
  heightM: number
  bmi: number
}): StoredDataItem[] {
  const heightMetersRounded = params.heightM.toFixed(3)
  const heightSquared = (params.heightM * params.heightM).toFixed(5)
  const weightRounded = params.weightKg.toFixed(3)
  const heightCmDisplay = (params.heightM * 100).toFixed(1)

  const details = [
    "Fórmula: peso (kg) ÷ altura (m)².",
    `Conta: ${weightRounded} kg ÷ (${heightMetersRounded} m)² = ${weightRounded} ÷ ${heightSquared} ≈ ${params.bmi.toFixed(1)}.`,
    `Dados utilizados neste cálculo: peso ${weightRounded} kg e comprimento/altura ${heightCmDisplay} cm (altura em metros: ${heightMetersRounded} m).`,
    "Confirme se esses valores estão corretos antes de registrar.",
  ].join("\n")

  return [
    {
      section: "DADOS_ANTROPOMETRICOS",
      label: "Peso",
      value: `${weightRounded.replace(/\.?0+$/, "")} kg`,
      status: "confirmado",
    },
    {
      section: "DADOS_ANTROPOMETRICOS",
      label: "Comprimento / altura",
      value: `${heightCmDisplay} cm`,
      status: "confirmado",
    },
    {
      section: "DADOS_ANTROPOMETRICOS",
      label: "IMC estimado",
      value: params.bmi.toFixed(1),
      status: "pendente_de_confirmacao",
    },
    {
      section: "CALCULO_IMC",
      label: "Detalhes do cálculo",
      value: details,
      status: "pendente_de_confirmacao",
    },
  ]
}
