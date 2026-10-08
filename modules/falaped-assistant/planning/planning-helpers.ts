import {
  parseWeightHeightForBmi,
  stripNeonatalBirthMeasuresFromParsedAnthropometrics,
} from "@/lib/parse-anthropometrics-for-bmi"
import { parseHeadCircumferenceCmFromMessage } from "@/modules/falaped-assistant/lib/patient-profile-parsers"
import {
  buildClinicalAlertItemsFromUserMessage,
  hasExplicitGuardianQuotedOrShoutSignal,
} from "@/modules/falaped-assistant/clinical-alert-from-user-message"

export function hasAnthropometricDivergence(
  userMessage: string,
  patientMetrics?: { weight: number | null; height: number | null; headCircumference?: number | null },
): { diverges: boolean; hasInput: boolean } {
  const parsed = stripNeonatalBirthMeasuresFromParsedAnthropometrics(
    userMessage,
    parseWeightHeightForBmi(userMessage),
  )
  const headCm = parseHeadCircumferenceCmFromMessage(userMessage)
  const hasInput = parsed.weightKg != null || parsed.heightM != null || headCm != null
  if (!hasInput) return { diverges: false, hasInput: false }

  const weightDiffers =
    parsed.weightKg != null &&
    patientMetrics?.weight != null &&
    Math.abs(parsed.weightKg - patientMetrics.weight) >= 0.05
  const heightDiffers =
    parsed.heightM != null &&
    patientMetrics?.height != null &&
    Math.abs(parsed.heightM - patientMetrics.height) >= 0.005

  const headDiffers =
    headCm != null &&
    patientMetrics?.headCircumference != null &&
    Math.abs(headCm - patientMetrics.headCircumference) >= 0.1

  return { diverges: weightDiffers || heightDiffers || headDiffers, hasInput: true }
}

export function shouldInjectGuardianAlertReview(userMessage: string): boolean {
  if (hasExplicitGuardianQuotedOrShoutSignal(userMessage)) return true
  return buildClinicalAlertItemsFromUserMessage(userMessage).length > 0
}
