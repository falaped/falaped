import type { SupabaseClient } from "@supabase/supabase-js"

import { isAdminEmail } from "@/lib/admin"
import { aiCost } from "@/lib/ai-pricing"
import type { AiFeature } from "@/modules/groq/groq-client"

const DAY_MS = 24 * 60 * 60 * 1000
const WEEKS = 6

/** Funcionalidades medidas pelas tabelas clínicas: o que conta como "usou" em cada uma. */
const FEATURES = [
  { key: "cases", label: "Atendimentos", table: "cases", at: "started_at", document: false },
  { key: "patients", label: "Pacientes cadastrados", table: "patients", at: "created_at", document: false },
  { key: "prescriptions", label: "Receitas", table: "prescriptions", at: "created_at", document: true },
  { key: "certificates", label: "Atestados", table: "medical_certificates", at: "created_at", document: true },
  { key: "reports", label: "Laudos e relatórios", table: "medical_reports", at: "created_at", document: true },
  { key: "case_reports", label: "Relatórios de caso", table: "case_reports", at: "created_at", document: true },
  { key: "exam_requests", label: "Pedidos de exame", table: "exam_requests", at: "created_at", document: true },
  { key: "referrals", label: "Encaminhamentos", table: "referrals", at: "created_at", document: true },
  { key: "guidance", label: "Orientações", table: "guidance_documents", at: "created_at", document: true },
  { key: "exam_readings", label: "Leitura de exames", table: "case_exam_readings", at: "created_at", document: false },
  { key: "vaccines", label: "Vacinas", table: "patient_vaccine_doses", at: "created_at", document: false },
  { key: "measurements", label: "Crescimento", table: "patient_measurements", at: "created_at", document: false },
  { key: "scales", label: "Escalas", table: "patient_scale_results", at: "created_at", document: false },
  { key: "attachments", label: "Anexos", table: "patient_attachments", at: "created_at", document: false },
  { key: "appointments", label: "Agenda", table: "appointments", at: "created_at", document: false },
  { key: "discussions", label: "Discussões", table: "discussions", at: "started_at", document: false },
  { key: "financial", label: "Financeiro", table: "financial_entries", at: "created_at", document: false },
] as const

export type ProductFeatureKey = (typeof FEATURES)[number]["key"]

export const AI_FEATURE_LABEL: Record<AiFeature, string> = {
  "case-chat": "Chat do caso",
  "classify-question": "Classificação de perguntas",
  "clinical-summary": "Resumo clínico",
  "guardian-questions": "Perguntas aos responsáveis",
  "polish-reply": "Revisão de respostas",
  "carryover-summary": "Resumo para o retorno",
  "exam-report": "Relatório de exames",
  "exam-pages": "Leitura de exames",
  "report-sections": "Seções de relatório",
  "improve-section": "Melhorar seção",
  transcription: "Transcrição",
  "assistant-actions": "Ações do assistente",
  "books-story": "Books",
  "message-draft": "Mensagens do admin",
}

export type ProductUsage = {
  ai: {
    cost: number
    prevCost: number
    calls: number
    tokens: number
    audioMinutes: number
    byFeature: { feature: string; label: string; cost: number; calls: number }[]
    /** Modelos que apareceram no mês sem preço na tabela: o custo deles ficou de fora. */
    unpricedModels: string[]
  }
  accounts: number
  activeThisMonth: number
  adoption: { label: string; count: number }[]
  /** Últimos 30 dias contra os 30 anteriores, com 6 semanas para o gráfico (mais antiga primeiro). */
  features: { key: ProductFeatureKey; label: string; accounts: number; volume: number; prevVolume: number; weeks: number[] }[]
  documents30: number
}

/** 1º dia do mês em Brasília (sem horário de verão desde 2019, então UTC−3 fixo). */
function monthStart(now: Date, offset = 0): Date {
  const sp = new Date(now.getTime() - 3 * 60 * 60 * 1000)
  return new Date(Date.UTC(sp.getUTCFullYear(), sp.getUTCMonth() + offset, 1, 3))
}

/**
 * Uso do produto para o admin: consumo de IA do mês (contra o anterior), contas ativas,
 * funil de adoção e volume por funcionalidade nos últimos 30 dias. Contas de admin ficam
 * de fora. Exige service role.
 */
export async function getProductUsage(supabase: SupabaseClient, now: Date = new Date()): Promise<ProductUsage> {
  const since60 = new Date(now.getTime() - 60 * DAY_MS)
  const thisMonth = monthStart(now)
  const prevMonth = monthStart(now, -1)

  const [profiles, usage, ai, ...tables] = await Promise.all([
    supabase.from("profiles").select("id, email"),
    supabase.from("admin_profile_usage").select("profile_id, email, last_activity_at, patients, cases, prescriptions, certificates, referrals, reports, case_reports, exam_requests, guidance"),
    supabase
      .from("ai_usage_events")
      .select("feature, model, prompt_tokens, completion_tokens, audio_seconds, created_at")
      .gte("created_at", prevMonth.toISOString()),
    // ponytail: linhas cruas de 60 dias por tabela; trocar por uma view agregada quando o volume pesar.
    ...FEATURES.map((f) => supabase.from(f.table).select(`profile_id, at:${f.at}`).gte(f.at, since60.toISOString())),
  ])
  for (const r of [profiles, usage, ai, ...tables])
    if (r.error) throw new Error(`[ADMIN] Falha ao ler o uso do produto: ${r.error.message}`)

  const admins = new Set((profiles.data ?? []).filter((p) => isAdminEmail(p.email)).map((p) => p.id as string))
  const clients = (usage.data ?? []).filter((r) => !isAdminEmail(r.email))

  // IA do mês e do anterior.
  const byFeature = new Map<string, { cost: number; calls: number }>()
  const unpriced = new Set<string>()
  let cost = 0, prevCost = 0, calls = 0, tokens = 0, audioSeconds = 0
  for (const e of ai.data ?? []) {
    const c = aiCost(e)
    if (new Date(e.created_at) < thisMonth) {
      prevCost += c ?? 0
      continue
    }
    if (c === null) unpriced.add(e.model ?? "desconhecido")
    cost += c ?? 0
    calls++
    tokens += (e.prompt_tokens ?? 0) + (e.completion_tokens ?? 0)
    audioSeconds += Number(e.audio_seconds ?? 0)
    const f = byFeature.get(e.feature) ?? { cost: 0, calls: 0 }
    f.cost += c ?? 0
    f.calls++
    byFeature.set(e.feature, f)
  }

  const features = FEATURES.map((f, i) => {
    const rows = ((tables[i].data ?? []) as { profile_id: string; at: string }[]).filter((r) => !admins.has(r.profile_id))
    const age = (r: { at: string }) => (now.getTime() - new Date(r.at).getTime()) / DAY_MS
    const recent = rows.filter((r) => age(r) < 30)
    const weeks = Array.from({ length: WEEKS }, (_, w) => rows.filter((r) => Math.floor(age(r) / 7) === WEEKS - 1 - w).length)
    return {
      key: f.key,
      label: f.label,
      accounts: new Set(recent.map((r) => r.profile_id)).size,
      volume: recent.length,
      prevVolume: rows.length - recent.length,
      weeks,
      document: f.document,
    }
  })

  const hasDocument = (r: (typeof clients)[number]) =>
    r.prescriptions + r.certificates + r.referrals + r.reports + r.case_reports + r.exam_requests + r.guidance > 0

  return {
    ai: {
      cost,
      prevCost,
      calls,
      tokens,
      audioMinutes: audioSeconds / 60,
      byFeature: [...byFeature]
        .map(([feature, v]) => ({ feature, label: AI_FEATURE_LABEL[feature as AiFeature] ?? feature, ...v }))
        .sort((a, b) => b.cost - a.cost || b.calls - a.calls),
      unpricedModels: [...unpriced],
    },
    accounts: clients.length,
    activeThisMonth: clients.filter((r) => r.last_activity_at && new Date(r.last_activity_at) >= thisMonth).length,
    adoption: [
      { label: "Criaram conta", count: clients.length },
      { label: "Cadastraram paciente", count: clients.filter((r) => r.patients > 0).length },
      { label: "Abriram atendimento", count: clients.filter((r) => r.cases > 0).length },
      { label: "Emitiram documento", count: clients.filter(hasDocument).length },
    ],
    features: features
      .map(({ document: _d, ...f }) => f)
      .sort((a, b) => b.accounts - a.accounts || b.volume - a.volume),
    documents30: features.filter((f) => f.document).reduce((n, f) => n + f.volume, 0),
  }
}
