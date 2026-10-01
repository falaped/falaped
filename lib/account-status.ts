export type AuthenticatedUserStatus = "paid" | "unpaid" | "blocked"

/** Quantos dias de teste grátis a conta ganha no cadastro (o trigger usa o mesmo número). */
export const TRIAL_DAYS = 15

/**
 * Status que os gates enxergam: conta `unpaid` com trial em andamento conta como `paid`.
 * `blocked` nunca é liberado pelo trial.
 */
export function effectiveStatus(
  status: string | null | undefined,
  trialEndsAt: string | null | undefined,
  now: Date = new Date(),
): string | null {
  if (status === "unpaid" && isInTrial(trialEndsAt, now)) return "paid"
  return status ?? null
}

/** Verdadeiro enquanto a data de fim do trial ainda não passou. */
export function isInTrial(trialEndsAt: string | null | undefined, now: Date = new Date()): boolean {
  return !!trialEndsAt && new Date(trialEndsAt).getTime() > now.getTime()
}
