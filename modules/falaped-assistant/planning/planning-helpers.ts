import {
  parseWeightHeightForBmi,
  stripNeonatalBirthMeasuresFromParsedAnthropometrics,
} from "@/lib/parse-anthropometrics-for-bmi"
import {
  buildClinicalAlertItemsFromUserMessage,
  hasExplicitGuardianQuotedOrShoutSignal,
} from "@/modules/falaped-assistant/clinical-alert-from-user-message"

export function hasAnthropometricDivergence(
  userMessage: string,
  patientMetrics?: { weight: number | null; height: number | null },
): { diverges: boolean; hasInput: boolean } {
  const parsed = stripNeonatalBirthMeasuresFromParsedAnthropometrics(
    userMessage,
    parseWeightHeightForBmi(userMessage),
  )
  const hasInput = parsed.weightKg != null || parsed.heightM != null
  if (!hasInput) return { diverges: false, hasInput: false }

  const weightDiffers =
    parsed.weightKg != null &&
    patientMetrics?.weight != null &&
    Math.abs(parsed.weightKg - patientMetrics.weight) >= 0.05
  const heightDiffers =
    parsed.heightM != null &&
    patientMetrics?.height != null &&
    Math.abs(parsed.heightM - patientMetrics.height) >= 0.005

  return { diverges: weightDiffers || heightDiffers, hasInput: true }
}

export function shouldInjectGuardianAlertReview(userMessage: string): boolean {
  if (hasExplicitGuardianQuotedOrShoutSignal(userMessage)) return true
  return buildClinicalAlertItemsFromUserMessage(userMessage).length > 0
}
