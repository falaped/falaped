/** Sem nada salvo na consulta por este tempo, ela conta como esquecida. */
export const IDLE_LIMIT_MS = 150 * 60_000

export type IdleSummary = {
  /** Soma dos intervalos parados (> limite) entre uma atividade e a seguinte. */
  gapsMs: number
  /** Última atividade (ou o início) quando a consulta está parada agora; null se viva. */
  idleSince: string | null
}

/**
 * Tempo parado da consulta, derivado só das datas do que foi salvo nela (mensagens,
 * documentos, medidas...). Nada é gravado: a cada render o cálculo refaz tudo, e uma
 * atividade nova depois de um intervalo parado transforma esse intervalo em pausa.
 */
export function summarizeIdle(startedAt: string, activityAts: string[], now: number): IdleSummary {
  const start = Date.parse(startedAt)
  const points = activityAts
    .map((iso) => Date.parse(iso))
    .filter((t) => t >= start && t <= now)
    .sort((a, b) => a - b)
  let prev = start
  let gapsMs = 0
  for (const t of points) {
    if (t - prev > IDLE_LIMIT_MS) gapsMs += t - prev
    prev = t
  }
  return { gapsMs, idleSince: now - prev > IDLE_LIMIT_MS ? new Date(prev).toISOString() : null }
}

type Timer = { startedAt: string; pausedMs: number; pausedAt: string | null }

/**
 * Pausa manual seguida de algo salvo na consulta: a médica voltou, então a pausa termina
 * nessa atividade. Se a pausa caiu num intervalo parado (> limite), ele já é descontado
 * como intervalo e a pausa só some, sem contar duas vezes. Null quando nada muda.
 */
export function resumeByActivity(timer: Timer, activityAts: string[]): { pausedMs: number; pausedAt: null } | null {
  if (!timer.pausedAt) return null
  const pausedAt = Date.parse(timer.pausedAt)
  const points = activityAts.map((iso) => Date.parse(iso)).sort((a, b) => a - b)
  const after = points.find((t) => t > pausedAt)
  if (after === undefined) return null
  const before = Math.max(Date.parse(timer.startedAt), ...points.filter((t) => t <= pausedAt))
  const insideGap = after - before > IDLE_LIMIT_MS
  return { pausedMs: timer.pausedMs + (insideGap ? 0 : after - pausedAt), pausedAt: null }
}

const settle = (timer: Timer, activityAts: string[]): Timer => ({ ...timer, ...resumeByActivity(timer, activityAts) })

/**
 * Fim e pausa a gravar ao encerrar: a consulta esquecida termina na última atividade,
 * os intervalos parados viram pausa, e uma pausa manual aberta fecha onde começou.
 * `endedAt` é o horário que a médica informou, quando informou.
 */
export function closeTiming(
  timer: { startedAt: string; pausedMs: number; pausedAt: string | null },
  activityAts: string[],
  now: number,
  endedAt?: string,
): { endedAt: string; pausedMs: number } {
  timer = settle(timer, activityAts)
  const start = Date.parse(timer.startedAt)
  const end = endedAt ? Math.max(start, Date.parse(endedAt)) : timer.pausedAt ? Date.parse(timer.pausedAt) : now
  const { gapsMs, idleSince } = summarizeIdle(timer.startedAt, activityAts, end)
  const finalEnd = !endedAt && idleSince ? Date.parse(idleSince) : end
  // ponytail: uma pausa manual dentro de um intervalo parado conta duas vezes; o teto
  // abaixo só evita duração negativa. Guardar os intervalos de pausa se isso aparecer.
  const pausedMs = Math.min(timer.pausedMs + gapsMs, Math.max(0, finalEnd - start))
  return { endedAt: new Date(finalEnd).toISOString(), pausedMs }
}

/**
 * Tempo da consulta aberta para mostrar na tela: desconta pausas e intervalos parados,
 * e congela na última atividade quando ela está parada (`idleSince`). Pausada à mão
 * depois de 2h30 sem nada salvo também conta como esquecida: a pausa veio tarde.
 */
export function consultClock(
  timer: { startedAt: string; pausedMs: number; pausedAt: string | null },
  activityAts: string[],
  now: number,
): { elapsedMs: number; idleSince: string | null; paused: boolean } {
  timer = settle(timer, activityAts)
  const end = timer.pausedAt ? Date.parse(timer.pausedAt) : now
  const { gapsMs, idleSince } = summarizeIdle(timer.startedAt, activityAts, end)
  const stop = idleSince ? Date.parse(idleSince) : end
  return {
    elapsedMs: Math.max(0, stop - Date.parse(timer.startedAt) - timer.pausedMs - gapsMs),
    idleSince,
    paused: timer.pausedAt != null && !idleSince,
  }
}
