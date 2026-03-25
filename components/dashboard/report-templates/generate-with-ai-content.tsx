"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ReportTemplateForm } from "@/components/dashboard/report-templates/report-template-form"
import { generateReportTemplateSectionsAction } from "@/actions"
import type { ReportTemplateSection } from "@/modules/report-templates/get-report-template-by-id"
import { Sparkles } from "lucide-react"

type Step = "prompt" | "form"

export function GenerateWithAiContent() {
  const [step, setStep] = useState<Step>("prompt")
  const [prompt, setPrompt] = useState("")
  const [loading, setLoading] = useState(false)
  const [suggestedName, setSuggestedName] = useState("")
  const [templateSections, setTemplateSections] = useState<ReportTemplateSection[]>([])

  async function handleGenerate() {
    const trimmed = prompt.trim()
    if (!trimmed) {
      toast.error("Descreva o tipo de relatório que deseja.")
      return
    }
    setLoading(true)
    try {
      const result = await generateReportTemplateSectionsAction(trimmed)
      if (!result.ok) {
        toast.error(getFriendlyToastMessage(result.error))
        return
      }
      setSuggestedName(result.suggestedName)
      setTemplateSections(result.sections)
      setStep("form")
    } finally {
      setLoading(false)
    }
  }

  function handleDiscardAndNew() {
    setStep("prompt")
    setSuggestedName("")
    setTemplateSections([])
  }

  if (step === "form") {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Revise o nome e as seções do meio (Paciente e Dados clínicos são fixos). Você pode editar e
            reordenar as demais antes de criar o template.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={handleDiscardAndNew}>
            Descartar e gerar de novo
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Dados do template</CardTitle>
            <CardDescription>
              Ajuste o que precisar e clique em &quot;Criar template&quot; para salvar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReportTemplateForm
              key={suggestedName}
              mode="create"
              initialName={suggestedName}
              initialTemplateSections={templateSections}
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" aria-hidden />
          Descreva o relatório
        </CardTitle>
        <CardDescription>
          Digite em poucas palavras o tipo de relatório que deseja (ex.: consulta de rotina com
          anamnese, exame físico e conduta). A IA sugerirá um nome e as seções do template.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ai-prompt">Descrição</Label>
          <Textarea
            id="ai-prompt"
            placeholder="Ex.: Template para consulta de rotina pediátrica com anamnese, exame físico e conduta"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            className="resize-none"
            disabled={loading}
            maxLength={1000}
          />
          <p className="text-xs text-muted-foreground">
            {prompt.length}/1000 caracteres
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? "Gerando…" : "Gerar sugestão"}
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/report-templates">Cancelar</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
