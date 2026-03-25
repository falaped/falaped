import type { ClinicalAlertItem } from "@/modules/dashboard-assistant/contracts/route-result"

function normalizeForClinicalScan(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

/**
 * True when the text reads like a direct guardian report or shout — not generic pediatrician dictation
 * (e.g. "febre" or "recusa alimentar" alone must not match).
 */
export function hasExplicitGuardianQuotedOrShoutSignal(message: string): boolean {
  const content = message.trim()
  const normalized = normalizeForClinicalScan(content)
  const hasDirectGuardianCue =
    /\bqueixa\s+da\s+(mae|pai|responsavel|genitora|genitor)\b/.test(normalized) ||
    /\bqueixa\s+do\s+(pai|responsavel|genitor)\b/.test(normalized) ||
    /\bqueixa\s+dos\s+pais\b/.test(normalized) ||
    /\b(mae|pai|responsavel|genitora|genitor)\s+(disse|relata|conta|informa|avisou)\b/.test(
      normalized,
    ) ||
    /\bsegundo\s+(a\s+mae|o\s+pai|o\s+responsavel)\b/.test(normalized) ||
    /\bengasg/.test(normalized) ||
    /\b(nao\s+mama|nao\s+mamou|recusa\s+(mama|seio|peito))\b/.test(normalized)

  const lettersOnly = content.replace(/[^A-Za-zÀ-ÿ]/g, "")
  const upperOnly = lettersOnly.replace(/[^A-ZÀ-Ý]/g, "")
  const upperRatio = lettersOnly.length > 0 ? upperOnly.length / lettersOnly.length : 0
  const hasShoutSignal = upperRatio >= 0.55 && lettersOnly.length >= 12
  return hasDirectGuardianCue || hasShoutSignal
}

function extractFrIrpm(normalized: string): number | null {
  const labeled = normalized.match(/\bfr\s*(?:de|=)?\s*(\d{2,3})\b/)
  if (labeled) {
    const value = Number.parseInt(labeled[1], 10)
    if (value >= 20 && value <= 120) return value
  }
  const trailing = normalized.match(/\b(\d{2,3})\s*(?:irpm|rpm)\b/)
  if (trailing) {
    const value = Number.parseInt(trailing[1], 10)
    if (value >= 40 && value <= 120) return value
  }
  return null
}

function extractSpo2Percent(normalized: string): number | null {
  const match = normalized.match(
    /\b(?:sato2|spo2|sat\s*o2|sato\s*2)\s*(?:de|=)?\s*(\d{2,3})\s*%?/i,
  )
  if (!match) return null
  const value = Number.parseInt(match[1], 10)
  if (value >= 70 && value <= 100) return value
  return null
}

type SignalRule = {
  id: string
  title: string
  detail: string
  matches: (normalized: string) => boolean
}

const SIGNAL_RULES: SignalRule[] = [
  {
    id: "explicit_clinical_alert_language",
    title: "Linguagem de alerta ou urgência",
    detail:
      "Há menção a alerta clínico, emergência ou urgência assistencial. Revise conduta, monitorização e critérios de retorno.",
    matches: (n) =>
      /\b(alerta\s+clinico|sinais?\s+de\s+alerta)\b/.test(n) ||
      /\b(emergencia|pronto\s+socorro\s+imediato|encaminhamento\s+imediato)\b/.test(n) ||
      (/\burgencia\b/.test(n) &&
        !/\bsem\s+urgencia\b/.test(n) &&
        !/\bnao\s+(?:h[aá]|observo)\s+[^.]{0,40}urgencia\b/.test(n)),
  },
  {
    id: "acute_risk_phrase",
    title: "Risco agudo ou vital mencionado",
    detail:
      "O texto cita risco imediato, risco vital ou risco de choque. Garanta estabilização, vigilância e critérios claros de retorno.",
    matches: (n) =>
      /\brisco\s+(?:de\s+)?(?:choque|morte|parada|insuficiencia|insuficiência)\b/.test(n) ||
      /\brisco\s+vital\b/.test(n) ||
      /\brisco\s+imediato\b/.test(n) ||
      /\brisco\s+elevado\b/.test(n),
  },
  {
    id: "deterioration_vigilance",
    title: "Vigilância por possível piora",
    detail:
      "Há menção a risco de piora ou evolução desfavorável (ex.: noturna). Reforce orientação ao responsável e sinais de retorno.",
    matches: (n) =>
      /\brisco\s+de\s+piora\b/.test(n) ||
      /\bpiora\s+(?:noturna|nas\s+proximas\s+horas)\b/.test(n),
  },
  {
    id: "respiratory_work_of_breathing",
    title: "Sinais de esforço respiratório",
    detail:
      "Foram descritos sinais como tiragem, retração ou esforço respiratório. Avalie grau, suporte e necessidade de observação contínua.",
    matches: (n) =>
      /\b(tiragem|retracao\s+intercostal|retracao\s+subcostal|retracao\s+supraclavicular)\b/.test(
        n,
      ) ||
      /\b(retracao|batimento\s+de\s+narina|batimento\s+de\s+asa\s+de\s+nariz|gemencia)\b/.test(
        n,
      ),
  },
  {
    id: "tachypnea_documented",
    title: "Taquipneia no texto",
    detail: "A frequência respiratória informada está elevada para a faixa etária usual; correlacione com exame e contexto clínico.",
    matches: (n) => {
      const fr = extractFrIrpm(n)
      return fr != null && fr >= 50
    },
  },
  {
    id: "hypoxemia_documented",
    title: "SatO2 baixa ou limítrofe",
    detail:
      "A saturação informada sugere hipoxemia ou limite inferior aceitável; confirme dispositivo, repouso e necessidade de oxigenoterapia.",
    matches: (n) => {
      const spo2 = extractSpo2Percent(n)
      return spo2 != null && spo2 <= 94
    },
  },
  {
    id: "supplemental_oxygen",
    title: "Uso de oxigênio suplementar",
    detail:
      "Há referência a oxigenoterapia ou O2 suplementar. Documente fluxo/dispositivo, resposta e critérios de weaning quando aplicável.",
    matches: (n) =>
      /\b(oxigenio|oxigenoterapia|o2\s+suplement|em\s+o2|com\s+o2|sobre\s+o2|cateter\s+nasa|mascara)\b/.test(
        n,
      ),
  },
  {
    id: "cyanosis",
    title: "Cianose referida",
    detail:
      "Há menção a cianose. Confirme central vs periférica, contexto e conduta imediata se aplicável.",
    matches: (n) =>
      /\bcianose\b/.test(n) &&
      !/\bsem\s+cianose\b/.test(n) &&
      !/\bnao\s+observo\s+[^.]{0,80}cianose\b/.test(n),
  },
  {
    id: "silent_chest",
    title: "Redução importante do murmúrio vesicular",
    detail:
      "Há menção a silêncio auscultatório ou ventilação muito reduzida — possível sinal grave. Reavalie com urgência conforme o caso.",
    matches: (n) =>
      /\bsilencio\s+auscultatorio\b/.test(n) &&
      !/\bsem\s+silencio\s+auscultatorio\b/.test(n),
  },
  {
    id: "apnea_or_respiratory_pause",
    title: "Apneia ou pausa respiratória",
    detail:
      "Há menção a apneia ou pausas respiratórias. Avalie gravidade, monitorização e necessidade de encaminhamento.",
    matches: (n) => {
      if (/\b(apneia|apneias)\b/.test(n)) {
        if (/\bsem\s+apneia\b/.test(n)) return false
        if (/\bnao\s+observo[^.]{0,200}\b(apneia|apneias)\b/.test(n)) return false
        return true
      }
      if (/\bpausa\s+respiratoria\b/.test(n)) {
        if (/\bsem\s+pausa\s+respiratoria\b/.test(n)) return false
        if (/\bnao\s+observo[^.]{0,220}pausa\s+respiratoria\b/.test(n)) return false
        return true
      }
      return false
    },
  },
  {
    id: "altered_level_of_consciousness",
    title: "Alteração de estado de alerta ou sonolência",
    detail:
      "Há menção a sonolência excessiva, letargia, rebaixamento do nível de consciência ou irritabilidade extrema. Considere gravidade e causa.",
    matches: (n) => {
      if (/\b(letargia|torpor|rebaixamento|inconsciencia|irritabilidade\s+extrema)\b/.test(n)) {
        return true
      }
      if (/\bsonolencia\s+importante\b/.test(n)) {
        if (/\bnao\s+observo[\s\S]{0,280}sonolencia\s+importante\b/.test(n)) return false
        return true
      }
      return false
    },
  },
  {
    id: "hemodynamic_concern",
    title: "Perfusão ou choque",
    detail:
      "Há menção a perfusão comprometida, pulsos fracos, tempo de enchimento prolongado ou choque. Priorize avaliação e suporte.",
    matches: (n) =>
      /\b(choque|hipotensao|perfusao\s+(?:comprometida|diminuida)|tempo\s+de\s+enchimento|pulsos\s+finos)\b/.test(
        n,
      ),
  },
  {
    id: "severe_respiratory_insufficiency_phrase",
    title: "Insuficiência respiratória ou falência",
    detail:
      "O texto sugere insuficiência respiratória relevante ou falência. Revise suporte ventilatório e nível de assistência.",
    matches: (n) =>
      /\binsuficiencia\s+respiratoria\b/.test(n) ||
      /\bfalencia\s+respiratoria\b/.test(n),
  },
]

/**
 * Derives user-facing clinical alert items from free-text dictation in the dashboard chat.
 * Copy is PT-BR for pediatricians (user-facing).
 */
export function buildClinicalAlertItemsFromUserMessage(userMessage: string): ClinicalAlertItem[] {
  const trimmed = userMessage.trim()
  if (!trimmed) return []

  const normalized = normalizeForClinicalScan(trimmed)
  const seen = new Set<string>()
  const items: ClinicalAlertItem[] = []

  for (const rule of SIGNAL_RULES) {
    if (seen.has(rule.id)) continue
    if (!rule.matches(normalized)) continue
    seen.add(rule.id)
    let detail = rule.detail
    if (rule.id === "tachypnea_documented") {
      const fr = extractFrIrpm(normalized)
      if (fr != null) {
        detail = `Frequência respiratória de ${fr} irpm citada no texto. Correlacione com idade, exame e evolução.`
      }
    }
    if (rule.id === "hypoxemia_documented") {
      const spo2 = extractSpo2Percent(normalized)
      if (spo2 != null) {
        detail = `SatO2 de ${spo2}% citada no texto. Confirme leitura, trabalho respiratório e necessidade de O2.`
      }
    }
    items.push({ id: rule.id, title: rule.title, detail })
  }

  return items
}
