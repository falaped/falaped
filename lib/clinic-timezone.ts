/**
 * Fuso fixo único da clínica (decisão travada v1.1).
 *
 * Single source of truth do fuso usado em TODA aritmética de calendário da agenda
 * (expansão de slots, Phase 6) e, futuramente, buckets de ganhos (Phase 10). NÃO
 * é lido de env: é uma constante de código para garantir determinismo e evitar que
 * o TZ do host (Vercel = UTC) vaze para o cálculo.
 *
 * Usar sempre o named zone (nunca offset fixo `-03:00` cabeado): SP não tem DST
 * desde 2019, mas teve entre 1985–2019; o named zone é correto para datas
 * históricas. Consumido via `@date-fns/tz` no context `{ in: tz(CLINIC_TIME_ZONE) }`.
 */
export const CLINIC_TIME_ZONE = "America/Sao_Paulo"
