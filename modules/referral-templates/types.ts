import type { ReferralUrgency } from "@/modules/referrals/types"

export type ReferralTemplateSnapshot = {
  specialty?: string
  reason?: string
  clinicalSummary?: string
  urgency?: ReferralUrgency
}

export type ReferralTemplate = {
  id: string
  profile_id: string
  name: string
  snapshot: ReferralTemplateSnapshot
  created_at: string
  updated_at: string
}

export type ReferralTemplateOption = {
  id: string
  name: string
  created_at: string
  snapshot: ReferralTemplateSnapshot
}
