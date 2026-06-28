export type ComputeElapsedMsOptions = {
  /** ISO timestamp when the consultation started (timer anchor). */
  startedAt: string
  /** ISO timestamp when the consultation ended, or null while ongoing. */
  endedAt: string | null
  /** Accumulated paused milliseconds across prior pause intervals. */
  pausedMs: number
  /** ISO timestamp of the current (open) pause, or null when running. */
  pausedAt: string | null
}

/**
 * Computes elapsed consultation time in milliseconds, derived purely from the
 * persisted timestamps so the value is drift-free and survives reloads.
 *
 * The "end" anchor is, in priority order:
 *  - `endedAt` (case closed → final duration),
 *  - else `pausedAt` (currently paused → frozen at the pause moment),
 *  - else `now` (running → grows live).
 *
 * Already-accumulated paused time (`pausedMs`) is always subtracted. The result
 * is clamped at 0 so tampering or clock skew can never yield a negative value.
 *
 * @param opts persisted timer state (startedAt/endedAt/pausedMs/pausedAt)
 * @param now current epoch milliseconds (`Date.now()`), passed in for determinism
 * @returns non-negative elapsed milliseconds
 */
export function computeElapsedMs(
  opts: ComputeElapsedMsOptions,
  now: number,
): number {
  const anchor = new Date(opts.startedAt).getTime()
  const end = opts.endedAt
    ? new Date(opts.endedAt).getTime()
    : opts.pausedAt
      ? new Date(opts.pausedAt).getTime()
      : now

  return Math.max(0, end - anchor - opts.pausedMs)
}
