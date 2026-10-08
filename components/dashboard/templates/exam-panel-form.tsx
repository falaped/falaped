"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { XIcon } from "lucide-react"
import { toast } from "sonner"

import { createExamPanelAction, updateExamPanelAction } from "@/actions"
import { DocPaper } from "@/components/dashboard/cases/consult-document"
import { ExamSearch } from "@/components/dashboard/cases/consult-exam-request-panel"
import type { ConsultDoctor } from "@/components/dashboard/cases/consult-prescription-panel"
import { FormCard } from "@/components/dashboard/form-layout"
import { TemplateFormShell, type TemplateSuggestion } from "@/components/dashboard/templates/template-form-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import type { ExamCatalogItem } from "@/modules/exam-catalog/types"

const LIST_HREF = "/dashboard/templates?aba=exames"
const PREVIEW_PATIENT = { name: "Nome da criança", birth_date: null }

/** Criar ou editar o modelo de exames (protótipo g7/g7e/g7a): nome e exames do catálogo. */
export function ExamPanelForm({
  panelId,
  initialName = "",
  initialExams = [],
  catalog,
  doctor,
  suggestion,
}: {
  /** Ausente = criar. */
  panelId?: string
  initialName?: string
  initialExams?: string[]
  catalog: ExamCatalogItem[]
  doctor: ConsultDoctor
  suggestion?: TemplateSuggestion
}) {
  const router = useRouter()
  const isCreate = !panelId
  const initial = useMemo(
    () => ({ name: initialName, exams: initialExams }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- valores iniciais, só na montagem
    [],
  )
  const [name, setName] = useState(initial.name)
  const [exams, setExams] = useState<string[]>(initial.exams)
  const [saving, setSaving] = useState(false)

  const nameChanged = name.trim() !== initial.name.trim()
  const examsChanged = JSON.stringify(exams) !== JSON.stringify(initial.exams)
  const missing = [!name.trim() && "o nome", !exams.length && "pelo menos um exame"].filter(Boolean) as string[]

  async function save() {
    setSaving(true)
    const payload = { name: name.trim(), panelItems: exams }
    const result = panelId ? await updateExamPanelAction(panelId, payload) : await createExamPanelAction(payload)
    setSaving(false)
    if (!result.ok) return void toast.error(getFriendlyToastMessage(result.error))
    toast.success(isCreate ? "Modelo criado." : "Modelo atualizado.")
    router.push(LIST_HREF)
    router.refresh()
  }

  return (
    <TemplateFormShell
      backHref={LIST_HREF}
      title={isCreate ? "Novo modelo de exames" : `Editar ${initial.name}`}
      subtitle="Vira atalho em “Começar de um modelo” no pedido de exame."
      suggestion={suggestion}
      suggestionNote="Só exames do seu catálogo. Confira antes de salvar."
      isCreate={isCreate}
      isDirty={nameChanged || examsChanged}
      missing={missing}
      changedLabel={[nameChanged && "o nome", examsChanged && "os exames"].filter(Boolean).join(" e ")}
      saving={saving}
      onSave={save}
      onDiscard={() => {
        setName(initial.name)
        setExams(initial.exams)
      }}
      preview={
        <DocPaper doctor={doctor} patient={PREVIEW_PATIENT} title="Solicitação de exames">
          {exams.length ? (
            <>
              <div>Solicito:</div>
              {exams.map((exam, i) => (
                <div key={exam} className="pl-2">
                  <b className="text-neutral-900">{i + 1}.</b> {exam}
                </div>
              ))}
            </>
          ) : (
            <p className="text-neutral-400">Os exames aparecem aqui.</p>
          )}
        </DocPaper>
      }
    >
      <FormCard id="nome" title="Nome" description="Aparece na lista e no atalho do pedido.">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="template-name">Nome do modelo</Label>
          <Input id="template-name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Anemia, ITU, Check-up 2 anos" />
        </div>
      </FormCard>

      <FormCard id="exames" title="Exames" description="Busque no catálogo; Enter adiciona.">
        <ExamSearch
          catalog={catalog}
          selected={exams}
          onAdd={(exam) => setExams((prev) => (prev.some((e) => e.toLowerCase() === exam.toLowerCase()) ? prev : [...prev, exam]))}
        />
        {exams.length ? (
          <ul className="grid grid-cols-2 gap-2">
            {exams.map((exam, index) => (
              <li key={exam} className="flex items-center gap-2 rounded-lg border border-border bg-card py-1.5 pr-1.5 pl-3">
                <span className="flex-1 truncate">{exam}</span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground hover:text-danger-text"
                  aria-label={`Remover ${exam}`}
                  onClick={() => setExams((prev) => prev.filter((_, i) => i !== index))}
                >
                  <XIcon />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-border-strong px-4 py-5 text-center text-muted-foreground">Nenhum exame ainda.</p>
        )}
      </FormCard>
    </TemplateFormShell>
  )
}
