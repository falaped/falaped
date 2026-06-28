"use client"

import { useEffect, useReducer } from "react"

import {
  computeElapsedMs,
  type ComputeElapsedMsOptions,
} from "@/lib/compute-elapsed-ms"

/**
 * Client hook returning the live elapsed consultation time in milliseconds.
 *
 * The timer is drift-free: every render recomputes the elapsed value from the
 * persisted timestamps via {@link computeElapsedMs}. The `setInterval` only
 * forces a repaint every second while the consultation is running — it is NOT
 * an incrementing counter, so reload/navigation never resets the value.
 *
 * @param opts persisted timer state (startedAt/endedAt/pausedMs/pausedAt)
 * @returns current elapsed milliseconds (non-negative)
 */
export function useConsultationTimer(opts: ComputeElapsedMsOptions): number {
  const [, forceRepaint] = useReducer((n: number) => n + 1, 0)

  const running = !opts.endedAt && !opts.pausedAt

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => forceRepaint(), 1000)
    return () => window.clearInterval(id)
  }, [running])

  return computeElapsedMs(opts, Date.now())
}
