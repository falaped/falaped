"use client"

import { useState } from "react"

import { generateExamPanelAction, generatePrescriptionTemplateAction } from "@/actions"
import type { ConsultDoctor } from "@/components/dashboard/cases/consult-prescription-panel"
import { ExamPanelForm } from "@/components/dashboard/templates/exam-panel-form"
import { PrescriptionTemplateForm } from "@/components/dashboard/templates/prescription-template-form"
import { TemplatePrompt } from "@/components/dashboard/templates/template-form-shell"
import type { ExamCatalogItem } from "@/modules/exam-catalog/types"
import type { GeneratedExamPanel, GeneratedPrescriptionTemplate } from "@/modules/groq/lib/template-suggestion-parsers"

/** Gerar receita com IA (protótipo g8/g6a): o quadro vira um modelo sem dose para revisar. */
export function PrescriptionTemplateGenerate({ doctor }: { doctor: ConsultDoctor }) {
  const [suggestion, setSuggestion] = useState<(GeneratedPrescriptionTemplate & { prompt: string }) | null>(null)

  if (suggestion) {
    return (
      <PrescriptionTemplateForm
        key={JSON.stringify(suggestion)}
        initialName={suggestion.suggestedName}
        initialSnapshot={{ medications: suggestion.medications, orientations: suggestion.orientations }}
        doctor={doctor}
        suggestion={{ prompt: suggestion.prompt, onRegenerate: () => setSuggestion(null) }}
      />
    )
  }

  return (
    <TemplatePrompt
      backHref="/dashboard/templates"
      title="Para qual quadro é a receita?"
      description="Diga o quadro. O assistente sugere os medicamentos usuais em pediatria, sem dose, e você revisa antes de salvar."
      placeholder="Ex.: gripe"
      examples={["Otite média aguda", "Diarreia aguda", "Conjuntivite bacteriana"]}
      maxLength={300}
      generate={async (prompt) => {
        const result = await generatePrescriptionTemplateAction(prompt)
        if (!result.ok) return result.error
        setSuggestion({ ...result, prompt })
        return null
      }}
    />
  )
}

/** Gerar exames com IA (protótipo g8e/g7a): só exames do catálogo do médico. */
export function ExamPanelGenerate({ catalog, doctor }: { catalog: ExamCatalogItem[]; doctor: ConsultDoctor }) {
  const [suggestion, setSuggestion] = useState<(GeneratedExamPanel & { prompt: string }) | null>(null)

  if (suggestion) {
    return (
      <ExamPanelForm
        key={JSON.stringify(suggestion)}
        initialName={suggestion.suggestedName}
        initialExams={suggestion.exams}
        catalog={catalog}
        doctor={doctor}
        suggestion={{ prompt: suggestion.prompt, onRegenerate: () => setSuggestion(null) }}
      />
    )
  }

  return (
    <TemplatePrompt
      backHref="/dashboard/templates?aba=exames"
      title="Para que são os exames?"
      description="Diga o objetivo. O assistente escolhe exames do seu catálogo, e você revisa antes de salvar."
      placeholder="Ex.: investigação de anemia"
      examples={["Rotina de 1 ano", "ITU", "Triagem de doença celíaca"]}
      maxLength={300}
      generate={async (prompt) => {
        const result = await generateExamPanelAction(prompt)
        if (!result.ok) return result.error
        setSuggestion({ ...result, prompt })
        return null
      }}
    />
  )
}
