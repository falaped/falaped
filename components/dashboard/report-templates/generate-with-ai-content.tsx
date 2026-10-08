"use client"

import { useState } from "react"

import { generateReportTemplateSectionsAction } from "@/actions"
import { TemplatePrompt } from "@/components/dashboard/templates/template-form-shell"
import type { ReportTemplateSection } from "@/modules/report-templates/get-report-template-by-id"
import { ReportTemplateForm } from "./report-template-form"

/** Gerar modelo de relatório com IA (protótipo g5/g4a). Nada é salvo antes de "Criar modelo". */
export function GenerateWithAiContent() {
  const [suggestion, setSuggestion] = useState<{ prompt: string; name: string; sections: ReportTemplateSection[] } | null>(null)

  if (suggestion) {
    return (
      <ReportTemplateForm
        key={`${suggestion.prompt}-${suggestion.name}`}
        mode="create"
        initialName={suggestion.name}
        initialTemplateSections={suggestion.sections}
        aiPrompt={suggestion.prompt}
        onRegenerate={() => setSuggestion(null)}
      />
    )
  }

  return (
    <TemplatePrompt
      backHref="/dashboard/templates?aba=relatorio"
      title="Como você quer o relatório?"
      description="Descreva em uma frase. O assistente sugere o nome e as seções, e você revisa antes de salvar."
      placeholder="Ex.: consulta de puericultura com alimentação, sono e marcos do desenvolvimento"
      examples={["Retorno de doença aguda", "Primeira consulta do recém-nascido", "Avaliação de TDAH com escalas"]}
      maxLength={1000}
      generate={async (prompt) => {
        const result = await generateReportTemplateSectionsAction(prompt)
        if (!result.ok) return result.error
        setSuggestion({ prompt, name: result.suggestedName, sections: result.sections })
        return null
      }}
    />
  )
}
