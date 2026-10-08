"use client"

import { useEffect, useState, useTransition, type ReactNode } from "react"
import Link from "next/link"

import {
  createCaseFinancialEntriesAction,
  markCaseEarningsPromptedAction,
  prepareCaseEarningsAction,
} from "@/actions"
import { maskBrazilianDateInput } from "@/lib/brazilian-date-form"
import { formatCentsToBRL } from "@/lib/formatters"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import { formatCentsToInputValue, parseBrlToCents } from "@/lib/money"
import {
  caseFinancialEntriesSchema,
  PAYMENT_METHOD_LABEL,
  PAYMENT_METHOD_VALUES,
  type CaseFinancialEntriesFormValues,
  type PaymentMethodInput,
} from "@/lib/schemas/financial-entry"
import type { ProcedureCatalogItemOption } from "@/modules/procedure-catalog/list-procedure-catalog-items"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { SegmentedToggle } from "@/components/segmented-toggle"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type FieldErrors = {
  consultationAmount?: string
  receivedOn?: string
  paymentMethod?: string
  procedures: Record<string, string>
}

const NO_ERRORS: FieldErrors = { procedures: {} }

/** Como terminou: lançou, não cobrou, ou o `commit` passou e o lançamento falhou. */
export type EarningsOutcome = "charged" | "no-charge" | "failed-after-commit"

export type EarningsFormApi = {
  submit: () => void
  isSaving: boolean
  canSubmit: boolean
}

/**
 * Cobrança de uma consulta (protótipo a10b): valor da consulta, procedimentos, quando e
 * como recebeu, ou "Sem cobrança". Usada pelo drawer de encerrar e pelo "Lançar valor" de
 * uma consulta já encerrada.
 *
 * `commit` roda ANTES de gravar qualquer coisa — no drawer, é o encerramento. Falhou, nada
 * é gravado e o form continua na tela. Passou e o lançamento falhou, o caso fica sem
 * lançamento (cortesia, D-09) e a faixa de pendências da consulta oferece lançar de novo.
 */
export function CaseEarningsForm({
  caseId,
  todayLabel,
  always = false,
  commit = async () => true,
  onFinished,
  onLoadFailed,
  onDirtyChange,
  header,
  bodyClassName,
  footer,
}: {
  caseId: string
  /** Hoje no fuso da clínica (dd/MM/yyyy), vindo do RSC — o cliente nunca deriva datas. */
  todayLabel: string
  /** Pergunta mesmo se o caso já respondeu ou já tem lançamento (encerramento). */
  always?: boolean
  commit?: () => Promise<boolean>
  onFinished: (outcome: EarningsOutcome) => void
  onLoadFailed: (reason: "already-billed" | "error") => void
  onDirtyChange?: (dirty: boolean) => void
  /** Vai no topo do corpo, antes dos campos. */
  header?: ReactNode
  bodyClassName?: string
  footer: (api: EarningsFormApi) => ReactNode
}) {
  const [isLoading, startLoading] = useTransition()
  const [isSaving, startSaving] = useTransition()
  const [loaded, setLoaded] = useState(false)
  const [catalog, setCatalog] = useState<ProcedureCatalogItemOption[]>([])
  const [consultationPriceCents, setConsultationPriceCents] = useState<number | null>(null)
  const [consultationAmount, setConsultationAmount] = useState("")
  const [receivedOn, setReceivedOn] = useState(todayLabel)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodInput | null>(null)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [amounts, setAmounts] = useState<Record<string, string>>({})
  const [noCharge, setNoCharge] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>(NO_ERRORS)
  const [billed, setBilled] = useState({ count: 0, totalCents: 0 })

  function touch() {
    onDirtyChange?.(true)
  }

  useEffect(() => {
    startLoading(async () => {
      const prepared = await prepareCaseEarningsAction(caseId, { always })
      if (!prepared.ok) return onLoadFailed("error")
      if (!prepared.ask) return onLoadFailed("already-billed")
      setCatalog(prepared.procedures)
      setBilled(prepared.billed)
      setConsultationPriceCents(prepared.consultationPriceCents)
      // Já lançado (caso reaberto): a consulta não vem pré-preenchida, para não cobrar duas vezes.
      setConsultationAmount(
        prepared.billed.count > 0 ? "" : formatCentsToInputValue(prepared.consultationPriceCents),
      )
      setAmounts(
        Object.fromEntries(prepared.procedures.map((item) => [item.id, formatCentsToInputValue(item.price_cents)])),
      )
      setLoaded(true)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, always])

  // Só as linhas de valor POSITIVO entram no total: a action descarta as de valor zero
  // antes do insert, então contá-las prometeria um lançamento que não vai existir.
  const billableCents = [
    parseBrlToCents(consultationAmount) ?? 0,
    ...catalog.filter((item) => selected[item.id]).map((item) => parseBrlToCents(amounts[item.id] ?? "") ?? 0),
  ].filter((cents) => cents > 0)
  const totalCents = noCharge ? 0 : billableCents.reduce((sum, cents) => sum + cents, 0)

  function buildRawValues(): CaseFinancialEntriesFormValues {
    return {
      caseId,
      receivedOn,
      paymentMethod: paymentMethod as PaymentMethodInput,
      consultationAmount: consultationAmount.trim() === "" ? undefined : consultationAmount,
      procedures: catalog
        .filter((item) => selected[item.id])
        .map((item) => ({ catalogItemId: item.id, amount: amounts[item.id] ?? "" })),
    }
  }

  function submit() {
    if (noCharge) {
      // Cortesia também é resposta: registra `earnings_prompted_at` para a pergunta não voltar.
      // A falha desse registro não vira erro: a faixa de pendências só continua aparecendo.
      startSaving(async () => {
        if (!(await commit())) return
        await markCaseEarningsPromptedAction(caseId)
        onFinished("no-charge")
      })
      return
    }

    // O schema roda aqui só para o feedback por campo; o que SOBE é o valor CRU do form
    // e o action é a fonte única da verdade.
    const raw = buildRawValues()
    const parsed = caseFinancialEntriesSchema.safeParse(raw)
    if (!parsed.success) {
      const next: FieldErrors = { procedures: {} }
      for (const issue of parsed.error.issues) {
        const [field, index] = issue.path
        if (field === "procedures" && typeof index === "number") {
          const item = raw.procedures[index]
          if (item) next.procedures[item.catalogItemId] = issue.message
        } else if (field === "consultationAmount") {
          next.consultationAmount ??= issue.message
        } else if (field === "receivedOn") {
          next.receivedOn ??= issue.message
        } else if (field === "paymentMethod") {
          next.paymentMethod ??= issue.message
        }
      }
      setErrors(next)
      return
    }

    setErrors(NO_ERRORS)
    startSaving(async () => {
      if (!(await commit())) return
      const result = await createCaseFinancialEntriesAction(raw)
      if (!result.ok) {
        toast.error(getFriendlyToastMessage(result.error))
        onFinished("failed-after-commit")
        return
      }
      onFinished(result.created > 0 ? "charged" : "no-charge")
    })
  }

  const api: EarningsFormApi = {
    submit,
    isSaving,
    canSubmit: loaded && !isSaving && (noCharge || billableCents.length > 0),
  }

  if (!loaded) {
    return (
      <>
        <div className={cn("flex flex-col gap-5", bodyClassName)}>
          {header}
          <p className="text-muted-foreground">{isLoading ? "Carregando os valores…" : ""}</p>
        </div>
        {footer({ ...api, canSubmit: false })}
      </>
    )
  }

  const consultationAdjusted =
    consultationPriceCents !== null &&
    consultationAmount.trim() !== "" &&
    parseBrlToCents(consultationAmount) !== consultationPriceCents

  return (
    <>
      <div className={cn("flex flex-col gap-5", bodyClassName)}>
        {header}
        {billed.count > 0 ? (
          <p className="rounded-lg bg-muted px-4 py-3 text-label">
            Já lançado nesta consulta:{" "}
            <span className="font-medium num">{formatCentsToBRL(billed.totalCents)}</span> ·{" "}
            {billed.count === 1 ? "1 lançamento" : `${billed.count} lançamentos`}. Lance só o que faltar.
          </p>
        ) : null}

        <fieldset disabled={noCharge || isSaving} className={cn("flex flex-col gap-5", noCharge && "opacity-50")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={!!errors.consultationAmount}>
              <FieldLabel htmlFor="earnings-consultation">Valor da consulta</FieldLabel>
              <FieldContent>
                <Input
                  id="earnings-consultation"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="ex.: 250,00"
                  className="num"
                  value={consultationAmount}
                  onChange={(e) => {
                    setConsultationAmount(e.target.value)
                    touch()
                  }}
                />
                <p className="text-caption text-subtle-foreground">
                  {consultationPriceCents === null ? (
                    <>
                      Defina o valor em{" "}
                      <Link href="/dashboard/profile" className="underline">
                        Perfil
                      </Link>{" "}
                      para vir preenchido.
                    </>
                  ) : consultationAdjusted ? (
                    `Ajustado · no perfil: ${formatCentsToBRL(consultationPriceCents)}`
                  ) : billed.count > 0 ? (
                    "Vazio para não cobrar duas vezes"
                  ) : (
                    "Do seu perfil"
                  )}
                </p>
                <FieldError>{errors.consultationAmount}</FieldError>
              </FieldContent>
            </Field>
            <Field data-invalid={!!errors.receivedOn}>
              <FieldLabel htmlFor="earnings-received-on">Recebido em</FieldLabel>
              <FieldContent>
                <Input
                  id="earnings-received-on"
                  type="text"
                  inputMode="numeric"
                  placeholder="dd/mm/aaaa"
                  className="num"
                  value={receivedOn}
                  onChange={(e) => {
                    setReceivedOn(maskBrazilianDateInput(e.target.value))
                    touch()
                  }}
                />
                <FieldError>{errors.receivedOn}</FieldError>
              </FieldContent>
            </Field>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-label font-medium">Procedimentos</span>
            {catalog.length === 0 ? (
              <p className="text-muted-foreground">
                Nenhum procedimento cadastrado.{" "}
                <Link href="/dashboard/profile" className="underline">
                  Cadastrar em Perfil
                </Link>
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {catalog.map((item) => {
                  const isOn = !!selected[item.id]
                  const raw = amounts[item.id] ?? ""
                  return (
                    <div key={item.id} className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`earnings-procedure-${item.id}`}
                          checked={isOn}
                          onCheckedChange={(value) => {
                            setSelected((prev) => ({ ...prev, [item.id]: value === true }))
                            touch()
                          }}
                        />
                        <label htmlFor={`earnings-procedure-${item.id}`} className="min-w-0 flex-1 break-words">
                          {item.name}
                        </label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          aria-label={`Valor de ${item.name}`}
                          className="h-8 w-28 shrink-0 num"
                          disabled={!isOn}
                          value={raw}
                          onChange={(e) => {
                            setAmounts((prev) => ({ ...prev, [item.id]: e.target.value }))
                            touch()
                          }}
                        />
                      </div>
                      {errors.procedures[item.id] ? (
                        <p className="text-caption text-destructive">{errors.procedures[item.id]}</p>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </fieldset>

        <div className="flex flex-col gap-2">
          <span className="text-label font-medium">Forma de pagamento</span>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <div
              className={cn("flex flex-wrap gap-1.5", noCharge && "pointer-events-none opacity-50")}
              role="group"
              aria-label="Forma de pagamento"
            >
              {PAYMENT_METHOD_VALUES.map((method) => (
                <SegmentedToggle
                  key={method}
                  active={paymentMethod === method}
                  onClick={() => {
                    setPaymentMethod(method)
                    touch()
                  }}
                >
                  {PAYMENT_METHOD_LABEL[method]}
                </SegmentedToggle>
              ))}
            </div>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={noCharge}
                disabled={isSaving}
                onCheckedChange={(value) => {
                  setNoCharge(value === true)
                  setErrors(NO_ERRORS)
                  touch()
                }}
              />
              {billed.count > 0 ? "Nada a acrescentar" : "Sem cobrança (retorno ou cortesia)"}
            </label>
          </div>
          <FieldError>{noCharge ? null : errors.paymentMethod}</FieldError>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
          <span className="text-muted-foreground">Total desta consulta</span>
          <span className="font-display text-section font-semibold num">{formatCentsToBRL(totalCents)}</span>
        </div>
      </div>
      {footer(api)}
    </>
  )
}
