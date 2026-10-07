"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowLeftIcon, CheckIcon, ChevronDownIcon, ListChecksIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import { createScaleResultAction, deleteScaleResultAction } from "@/actions"
import { DocStep, PanelFooter } from "@/components/dashboard/cases/consult-document"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { formatDate } from "@/lib/formatters"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import {
  getScaleByKey,
  getScalesForAgeMonths,
  SCALE_CATEGORY_LABELS,
  SCALES,
  scoreScale,
  type ScaleCategory,
  type ScaleDefinition,
} from "@/lib/scales"
import { cn } from "@/lib/utils"
import type { ScaleResult } from "@/modules/patient-scales/types"

const CATEGORY_ORDER: readonly ScaleCategory[] = ["pronto_atendimento", "puericultura", "enfermaria_uti", "neonatologia"]

/** Itens com `defaultValue` já vêm marcados (M-CHAT-R/F: o médico só vira as exceções). */
function initialAnswers(scale: ScaleDefinition): Record<string, number> {
  return Object.fromEntries(
    scale.items.filter((item) => item.defaultValue !== undefined).map((item) => [item.key, item.defaultValue!]),
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-grid min-w-5 place-items-center rounded border border-border bg-muted px-1 font-sans text-caption font-normal text-muted-foreground">
      {children}
    </kbd>
  )
}

const itemsLabel = (scale: ScaleDefinition) =>
  `${scale.items.length} ${scale.items.length === 1 ? "item" : "itens"}`

/** Tecla de cada opção: a inicial quando é única entre as opções (S/N), senão o número. */
function optionKeys(labels: readonly string[]): string[] {
  const initials = labels.map((label) => label.trim().charAt(0).toUpperCase())
  const unique = new Set(initials).size === initials.length
  return labels.map((_, i) => (unique ? initials[i] : String(i + 1)))
}

/** Escala dentro da Consulta (protótipos a8/a8b): seletor com busca, uma pergunta por vez, resultado ao lado. */
export function ConsultScalePanel({
  patientId,
  caseId,
  ageMonths,
  history,
  onDone,
}: {
  patientId: string
  caseId: string
  ageMonths: number | null
  /** Escalas já aplicadas na criança, da mais recente para a mais antiga. */
  history: ScaleResult[]
  onDone: () => void
}) {
  const [scaleKey, setScaleKey] = useState("")
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [index, setIndex] = useState(0)
  const [busy, setBusy] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const scale = scaleKey ? getScaleByKey(scaleKey) : null

  const answered = scale ? scale.items.filter((item) => answers[item.key] !== undefined).length : 0
  const total = scale?.items.length ?? 0
  const left = total - answered
  const partial = scale ? scale.items.reduce((sum, item) => sum + (answers[item.key] ?? 0), 0) : 0
  const result = useMemo(() => {
    if (!scale) return null
    try {
      return scoreScale(scale, answers)
    } catch {
      return null
    }
  }, [scale, answers])
  const item = scale?.items[index] ?? null

  function pick(key: string) {
    const next = getScaleByKey(key)
    if (!next) return
    setScaleKey(key)
    const start = initialAnswers(next)
    setAnswers(start)
    const firstOpen = next.items.findIndex((i) => start[i.key] === undefined)
    setIndex(firstOpen === -1 ? 0 : firstOpen)
  }

  function answer(value: number) {
    if (!scale || !item) return
    const nextAnswers = { ...answers, [item.key]: value }
    setAnswers(nextAnswers)
    // Avança para a próxima sem resposta depois desta; sem nenhuma, fica onde está.
    const after = scale.items.findIndex((i, n) => n > index && nextAnswers[i.key] === undefined)
    const before = scale.items.findIndex((i) => nextAnswers[i.key] === undefined)
    const next = after !== -1 ? after : before !== -1 ? before : Math.min(index + 1, scale.items.length - 1)
    setIndex(next)
  }

  const keys = item ? optionKeys(item.options.map((o) => o.label)) : []
  useEffect(() => {
    if (!item) return
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (event.metaKey || event.ctrlKey || event.altKey || target?.closest("input, textarea, [contenteditable]")) return
      const at = keys.indexOf(event.key.toUpperCase())
      if (at === -1) return
      event.preventDefault()
      answer(item!.options[at].value)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  async function handleSave() {
    if (!scale || !result) return
    setBusy(true)
    const saved = await createScaleResultAction({ patientId, caseId, scaleKey: scale.key, answers }).catch(() => null)
    setBusy(false)
    if (!saved?.ok) return void toast.error(getFriendlyToastMessage(saved?.error ?? "Erro ao registrar a escala."))
    toast.success(saved.score === null ? `${scale.name}: ${saved.interpretation}` : `${scale.name}: ${saved.score} · ${saved.interpretation}`)
    onDone()
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    const deleted = await deleteScaleResultAction({ id, patientId, caseId }).catch(() => null)
    setDeletingId(null)
    if (!deleted?.ok) return void toast.error(getFriendlyToastMessage(deleted?.error ?? "Erro ao apagar a escala."))
    toast.success("Escala apagada.")
    onDone()
  }

  const shortOptions = item ? item.options.length <= 3 && item.options.every((o) => o.label.length <= 14) : false
  const thisCase = history.filter((r) => r.case_id === caseId)
  const earlier = history.filter((r) => r.case_id !== caseId)

  return (
    <>
      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex flex-col gap-7 overflow-auto px-6 py-6">
          <DocStep n={1} title="Qual escala?">
            <ScalePicker ageMonths={ageMonths} history={history} value={scale} onPick={pick} />
          </DocStep>

          {scale && item ? (
            <DocStep n={2} title={total === 1 ? "Resposta" : "Perguntas"} aside={<span className="num">{answered} de {total}</span>}>
              <div className="rounded-xl border border-border bg-card p-6">
                {total > 1 ? (
                  <div className="flex items-center gap-3">
                    <span className="num text-caption font-medium text-subtle-foreground">
                      Pergunta {index + 1} de {total}
                    </span>
                    <div className="flex flex-1 gap-0.5" aria-hidden>
                      {scale.items.map((i, n) => (
                        <span
                          key={i.key}
                          className={cn(
                            "h-1 flex-1 rounded-full",
                            n === index ? "bg-primary-soft-border" : answers[i.key] !== undefined ? "bg-primary" : "bg-border",
                          )}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
                <p className="mt-5 font-display text-[20px] leading-snug font-semibold">{item.label}</p>
                <div className={cn("mt-6 grid gap-3", shortOptions ? "grid-cols-[repeat(auto-fit,minmax(0,1fr))]" : "grid-cols-1")}>
                  {item.options.map((option, n) => {
                    const selected = answers[item.key] === option.value
                    return (
                      <button
                        key={option.value + option.label}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => answer(option.value)}
                        className={cn(
                          "flex min-h-14 items-center gap-3 rounded-xl border px-4 py-3 hover:border-primary hover:bg-primary-soft",
                          shortOptions ? "justify-center text-[16px] font-semibold" : "text-left",
                          selected ? "border-primary bg-primary-soft font-semibold" : "border-border-strong",
                        )}
                      >
                        {selected ? <CheckIcon className="size-4 shrink-0 text-primary-ink" aria-hidden /> : null}
                        <span className={shortOptions ? undefined : "flex-1"}>{option.label}</span>
                        <Kbd>{keys[n]}</Kbd>
                      </button>
                    )
                  })}
                </div>
                {total > 1 ? (
                  <div className="mt-4 flex items-center">
                    <Button variant="ghost" size="sm" disabled={index === 0} onClick={() => setIndex(index - 1)}>
                      <ArrowLeftIcon data-icon="inline-start" />
                      Anterior
                    </Button>
                    <span className="ml-auto text-caption text-subtle-foreground">Responder avança para a próxima</span>
                  </div>
                ) : null}
              </div>

              {total > 1 && answered ? (
                <details open className="rounded-xl border border-border">
                  <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 text-label font-medium text-muted-foreground [&::-webkit-details-marker]:hidden">
                    <ChevronDownIcon className="size-4" aria-hidden />
                    Respondidas <span className="num text-subtle-foreground">{answered}</span>
                  </summary>
                  <ol className="divide-y divide-border border-t border-border">
                    {scale.items.map((i, n) =>
                      answers[i.key] === undefined ? null : (
                        <li key={i.key} className={cn("flex items-center gap-3 px-4 py-2", n === index && "bg-muted")}>
                          <span className="num w-5 text-caption text-subtle-foreground">{n + 1}</span>
                          <span className="flex-1 truncate text-muted-foreground">{i.label}</span>
                          <span className="max-w-40 truncate rounded-full border border-border bg-muted px-2 py-0.5 text-caption">
                            {i.options.find((o) => o.value === answers[i.key])?.label}
                          </span>
                          <Button variant="ghost" size="xs" onClick={() => setIndex(n)}>
                            Trocar
                          </Button>
                        </li>
                      ),
                    )}
                  </ol>
                </details>
              ) : null}
            </DocStep>
          ) : null}
        </div>

        <div className="hidden flex-col gap-6 overflow-auto border-l border-border bg-muted px-6 py-6 lg:flex">
          <p className="text-caption font-medium text-subtle-foreground">RESULTADO</p>
          {scale ? (
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-caption text-subtle-foreground">{scale.name}</span>
                <span className="num shrink-0 text-caption text-subtle-foreground">
                  {answered} de {total} respondidas
                </span>
              </div>
              {result ? (
                <div>
                  {scale.hideScore ? null : <span className="num font-display text-[40px] leading-none font-semibold">{result.score}</span>}
                  <p className="mt-1 font-semibold">{result.interpretation}</p>
                  {result.band.conduct ? <p className="mt-1 text-muted-foreground">{result.band.conduct}</p> : null}
                </div>
              ) : scale.hideScore ? null : (
                <div className="flex items-baseline gap-2">
                  <span className="num font-display text-[40px] leading-none font-semibold">{partial}</span>
                  <span className="text-muted-foreground">{partial === 1 ? "ponto" : "pontos"} até agora</span>
                </div>
              )}
              <div className="h-1.5 rounded-full bg-border">
                <div className="h-1.5 rounded-full bg-primary" style={{ width: `${total ? (answered / total) * 100 : 0}%` }} />
              </div>
              {scale.hideScore ? null : (
                <ul className="flex flex-col gap-1 pt-1">
                  {scale.bands.map((band) => {
                    const active = result?.band.label === band.label
                    return (
                      <li
                        key={band.label}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-1.5",
                          active ? "bg-primary-soft font-semibold text-primary-ink-strong" : "text-muted-foreground",
                        )}
                      >
                        <span className="num w-12 shrink-0 font-semibold">{band.min === band.max ? band.min : `${band.min}–${band.max}`}</span>
                        <span className="min-w-0 flex-1">{band.label}</span>
                        {active ? <CheckIcon className="size-4 shrink-0" aria-hidden /> : null}
                      </li>
                    )
                  })}
                </ul>
              )}
              {result ? null : <p className="text-caption text-muted-foreground">A interpretação sai quando todas as perguntas forem respondidas.</p>}
              <p className="text-caption text-subtle-foreground">{scale.source}</p>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border-strong px-4 py-6 text-center text-muted-foreground">
              Escolha uma escala para começar.
            </p>
          )}

          {[
            ["NESTA CONSULTA", thisCase],
            ["VEZES ANTERIORES", earlier.slice(0, 6)],
          ].map(([label, list]) =>
            (list as ScaleResult[]).length ? (
              <div key={label as string}>
                <p className="mb-2 text-caption font-medium text-subtle-foreground">{label as string}</p>
                <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                  {(list as ScaleResult[]).map((r) => (
                    <li key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{getScaleByKey(r.scale_key)?.name ?? r.scale_key}</p>
                        <p className="num text-caption text-subtle-foreground">{formatDate(r.applied_at)}</p>
                      </div>
                      <span className="max-w-36 truncate rounded-full border border-border bg-muted px-2 py-0.5 text-caption">
                        {r.score === null ? r.interpretation : `${r.score} · ${r.interpretation}`}
                      </span>
                      {r.case_id === caseId ? (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="text-muted-foreground hover:text-danger-text"
                          aria-label="Apagar"
                          disabled={deletingId === r.id}
                          onClick={() => handleDelete(r.id)}
                        >
                          <Trash2Icon />
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null,
          )}
        </div>
      </div>
      <PanelFooter>
        <span className="text-caption text-subtle-foreground">
          {scale && left > 0 ? `Faltam ${left} ${left === 1 ? "resposta" : "respostas"} para registrar` : null}
        </span>
        <Button className="ml-auto" onClick={handleSave} disabled={!result || busy}>
          <CheckIcon data-icon="inline-start" />
          {busy ? "Registrando…" : "Registrar na consulta"}
        </Button>
      </PanelFooter>
    </>
  )
}

/** Seletor de escala com busca (protótipo a8): já aplicadas na criança no topo, depois por categoria. */
function ScalePicker({
  ageMonths,
  history,
  value,
  onPick,
}: {
  ageMonths: number | null
  history: ScaleResult[]
  value: ScaleDefinition | null
  onPick: (key: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const available = showAll ? SCALES : getScalesForAgeMonths(ageMonths)
  const usedKeys = [...new Set(history.map((r) => r.scale_key))]
  const used = usedKeys.map((key) => available.find((s) => s.key === key)).filter((s): s is ScaleDefinition => !!s)
  const groups = CATEGORY_ORDER.map((category) => ({
    label: SCALE_CATEGORY_LABELS[category],
    scales: available.filter((s) => s.category === category && !usedKeys.includes(s.key)),
  })).filter((g) => g.scales.length)
  if (used.length) groups.unshift({ label: "Já aplicadas na criança", scales: used })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-14 w-full items-center gap-3 rounded-lg border border-input bg-card px-3 text-left hover:bg-accent/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 data-[state=open]:border-ring data-[state=open]:ring-3 data-[state=open]:ring-ring/30"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-ink-strong">
            <ListChecksIcon className="size-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            {value ? (
              <>
                <span className="block truncate font-semibold">{value.name}</span>
                <span className="block truncate text-caption text-muted-foreground">
                  {value.summary}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">Escolha a escala</span>
            )}
          </span>
          <ChevronDownIcon className="size-4 shrink-0 text-subtle-foreground" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) overflow-hidden rounded-xl p-0 shadow-lg">
        <Command>
          <CommandInput placeholder="Buscar por nome ou pelo que mede (dor, crupe, autismo…)" />
          <CommandList className="max-h-[380px] p-1">
            <CommandEmpty>Nenhuma escala encontrada.</CommandEmpty>
            {groups.map((group) => (
              <CommandGroup key={group.label} heading={group.label}>
                {group.scales.map((s) => (
                  <CommandItem
                    key={s.key}
                    value={`${s.name} ${s.summary}`}
                    onSelect={() => {
                      onPick(s.key)
                      setOpen(false)
                    }}
                    className={cn("gap-3 rounded-lg px-2.5 py-2", value?.key === s.key && "bg-primary-soft")}
                  >
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-body", value?.key === s.key ? "font-semibold text-primary-ink-strong" : "font-medium")}>
                        {s.name}
                      </span>
                      <span className="block text-caption text-muted-foreground">{s.summary}</span>
                    </span>
                    <span className="num shrink-0 text-caption text-subtle-foreground">{itemsLabel(s)}</span>
                    <span className="w-4 text-primary-ink">{value?.key === s.key ? <CheckIcon aria-hidden /> : null}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
          <div className="flex items-center gap-3 border-t border-border bg-muted px-3 py-2 text-caption text-subtle-foreground">
            <span>
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> navega
            </span>
            <span>
              <Kbd>↵</Kbd> escolhe
            </span>
            <span className="ml-auto">
              {ageMonths === null ? "Ficha sem data de nascimento: todas as escalas" : showAll ? "Todas as escalas" : "Só as indicadas para a idade"}
              {ageMonths === null ? null : (
                <Button variant="link" size="xs" className="h-auto px-1" onClick={() => setShowAll(!showAll)}>
                  {showAll ? "só as indicadas" : "ver todas"}
                </Button>
              )}
            </span>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
