"use client"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  createCaseFinancialEntriesAction,
  markCaseEarningsPromptedAction,
  prepareCaseEarningsAction,
  updateCaseStatusAction,
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
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { SegmentedToggle } from "@/components/segmented-toggle"

type CloseCaseWithEarningsDialogProps = {
  caseId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Hoje no fuso da clínica, já formatado dd/MM/yyyy pelo RSC. Este componente NUNCA
   * deriva a data: `received_on` é a coluna dos buckets do painel, e num host em UTC
   * uma derivação no cliente produz o dia seguinte depois das 21h de Brasília — em
   * silêncio, sem erro de tipo e sem falha de build.
   */
  todayLabel: string
  /**
   * `"close"` (default): as duas etapas — encerra o caso, depois pergunta o que foi cobrado.
   *
   * `"earnings"`: SÓ a etapa 2, para um caso que JÁ está encerrado. Existe porque encerrar
   * um caso não acontece só pelo botão `Ações → Encerrar caso`: o assistente encerra dentro
   * de `sendCaseAssistantMessageAction` (intent `confirm_close_case`) e abrir um novo
   * atendimento encerra o ativo em `createDashboardCaseWithPatient` — dois caminhos que
   * rodam no servidor, onde não existe cliente para abrir modal. Amarrar a pergunta ao
   * EVENTO de encerramento perdia o lançamento nesses caminhos, e também não dava volta
   * quando o médico dispensava a etapa 2 (que é cortesia, e por isso irreversível hoje).
   * Ancorar no ESTADO (caso encerrado sem lançamento não-anulado) cobre os quatro caminhos.
   */
  mode?: "close" | "earnings"
}

type FieldErrors = {
  consultationAmount?: string
  receivedOn?: string
  paymentMethod?: string
  procedures: Record<string, string>
}

const NO_ERRORS: FieldErrors = { procedures: {} }

/**
 * Encerrar caso em DUAS etapas dentro do mesmo `AlertDialog` (S3, EARN-01).
 *
 * Renderizado como IRMÃO do popover de ações, nunca como descendente: o conteúdo do
 * popover desmonta ao fechar e levaria os valores digitados com ele.
 *
 * A máquina de status do caso NÃO é alterada: são duas chamadas de action sequenciais,
 * nunca uma combinada. O encerramento commita ANTES do form aparecer, então a etapa de
 * lançamento não pode bloqueá-lo nem revertê-lo — nada aqui devolve o caso ao estado
 * anterior. Uma etapa 2 falhada, abandonada ou vazia deixa um caso corretamente
 * encerrado com zero lançamentos, que é exatamente cortesia (D-09).
 */
export function CloseCaseWithEarningsDialog({
  caseId,
  open,
  onOpenChange,
  todayLabel,
  mode = "close",
}: CloseCaseWithEarningsDialogProps) {
  const router = useRouter()
  const [isClosing, startClosing] = useTransition()
  const [isSaving, startSaving] = useTransition()

  const [step, setStep] = useState<"confirm" | "earnings">("confirm")
  const [catalog, setCatalog] = useState<ProcedureCatalogItemOption[]>([])
  const [consultationPriceCents, setConsultationPriceCents] = useState<number | null>(null)
  const [consultationAmount, setConsultationAmount] = useState("")
  const [receivedOn, setReceivedOn] = useState(todayLabel)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodInput | null>(null)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [amounts, setAmounts] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<FieldErrors>(NO_ERRORS)
  const [isDirty, setIsDirty] = useState(false)

  const isPending = isClosing || isSaving

  function resetForm() {
    setStep("confirm")
    setCatalog([])
    setConsultationPriceCents(null)
    setConsultationAmount("")
    setReceivedOn(todayLabel)
    setPaymentMethod(null)
    setSelected({})
    setAmounts({})
    setErrors(NO_ERRORS)
    setIsDirty(false)
  }

  function handleOpenChange(next: boolean) {
    if (isPending) return
    if (!next) {
      resetForm()
      // Fechar sem salvar (Esc, Cancelar) ainda precisa refletir o encerramento no
      // cabeçalho: `revalidatePath` no action não re-renderiza o RSC de uma action
      // chamada via await — só o refresh no cliente faz isso.
      router.refresh()
    }
    onOpenChange(next)
  }

  function closeAndRefresh(message: string) {
    resetForm()
    onOpenChange(false)
    toast.success(message)
    router.refresh()
  }

  /**
   * Busca o pré-preenchimento e avança para a etapa 2. Devolve o motivo de NÃO ter
   * avançado, para quem chama decidir o que dizer — nunca engolir.
   *
   * `"already-billed"` é a guarda D-10 (`ask: false`) e é MUDA de propósito: o caso já tem
   * lançamento não-anulado, então nada é perguntado e nenhum banner aparece.
   * `"error"` é diferente e não pode virar silêncio: um preparo falhado sem mensagem
   * produz exatamente o sintoma "encerrei o caso e o modal não apareceu" sem nenhuma
   * pista do porquê.
   */
  async function loadEarningsStep(): Promise<"ok" | "already-billed" | "error"> {
    const prepared = await prepareCaseEarningsAction(caseId)
    if (!prepared.ok) return "error"
    if (!prepared.ask) return "already-billed"

    setCatalog(prepared.procedures)
    setConsultationPriceCents(prepared.consultationPriceCents)
    setConsultationAmount(formatCentsToInputValue(prepared.consultationPriceCents))
    setAmounts(
      Object.fromEntries(
        prepared.procedures.map((item) => [
          item.id,
          formatCentsToInputValue(item.price_cents),
        ]),
      ),
    )
    setStep("earnings")
    return "ok"
  }

  function handleConfirmClose() {
    startClosing(async () => {
      const closed = await updateCaseStatusAction(caseId, "closed")
      if (!closed.ok) {
        // O caso simplesmente não foi encerrado — a etapa 2 nunca é atingida.
        resetForm()
        onOpenChange(false)
        toast.error(getFriendlyToastMessage(closed.error))
        router.refresh()
        return
      }

      const outcome = await loadEarningsStep()
      if (outcome === "already-billed") {
        closeAndRefresh("Caso encerrado.")
        return
      }
      if (outcome === "error") {
        // O caso ESTÁ encerrado — dizer isso, e dizer também que o lançamento não abriu.
        // O caminho do card de pendência (modo `earnings`) continua disponível depois.
        resetForm()
        onOpenChange(false)
        toast.error("Caso encerrado, mas não foi possível abrir o lançamento. Você pode lançar pelo caso.")
        router.refresh()
        return
      }
      // Sem refresh aqui de propósito: a etapa 2 está aberta, e re-renderizar o RSC da
      // página do caso (que vive dentro de um `Suspense`, com `cacheComponents`) pode
      // remontar o boundary e levar o diálogo embora. O refresh acontece ao FECHAR.
    })
  }

  // Modo `earnings`: o caso já está encerrado, então não há etapa 1 para atravessar —
  // buscar o pré-preenchimento assim que o diálogo abre.
  useEffect(() => {
    if (!open || mode !== "earnings" || step !== "confirm") return
    startClosing(async () => {
      const outcome = await loadEarningsStep()
      if (outcome === "ok") return
      resetForm()
      onOpenChange(false)
      if (outcome === "already-billed") {
        // Alguém lançou entre a renderização e o clique. Nada a fazer, e nada a esconder.
        toast.info("Este caso já tem lançamentos.")
      } else {
        toast.error("Não foi possível abrir o lançamento. Tente novamente.")
      }
      router.refresh()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, step])

  // Só as linhas de valor POSITIVO entram no resumo: a action descarta as de valor zero
  // antes do insert, então contá-las aqui prometeria um lançamento que não vai existir.
  const consultationCents = parseBrlToCents(consultationAmount) ?? 0
  const billableCents = [
    consultationCents,
    ...catalog
      .filter((item) => selected[item.id])
      .map((item) => parseBrlToCents(amounts[item.id] ?? "") ?? 0),
  ].filter((cents) => cents > 0)
  const summaryCount = billableCents.length
  const summaryCents = billableCents.reduce((sum, cents) => sum + cents, 0)

  function buildRawValues(): CaseFinancialEntriesFormValues {
    return {
      caseId,
      receivedOn,
      paymentMethod: paymentMethod as PaymentMethodInput,
      consultationAmount:
        consultationAmount.trim() === "" ? undefined : consultationAmount,
      procedures: catalog
        .filter((item) => selected[item.id])
        .map((item) => ({
          catalogItemId: item.id,
          amount: amounts[item.id] ?? "",
        })),
    }
  }

  /**
   * "Sem cobrança" — cortesia (D-09). Não lança nada, mas É uma resposta: registra
   * `earnings_prompted_at` para a pergunta não voltar (uma vez por caso, inclusive
   * reabrindo e encerrando de novo).
   *
   * A falha do registro não vira erro na tela: o médico dispensou, o caso está encerrado
   * e nada foi cobrado — a única consequência é o card de pendência continuar aparecendo
   * no caso, que é justamente a oferta de tentar outra vez.
   */
  function handleDismiss() {
    startSaving(async () => {
      await markCaseEarningsPromptedAction(caseId)
      closeAndRefresh("Caso encerrado sem lançamento.")
    })
  }

  function handleSaveEntries() {
    // O schema roda aqui só para o feedback por campo; o que SOBE é o valor CRU do form
    // e o action é a fonte única da verdade. Enviar `parsed.data` significaria parsear
    // duas vezes (centavos como se fossem reais, ISO como se fosse dd/mm/aaaa).
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
      const result = await createCaseFinancialEntriesAction(raw)
      if (!result.ok) {
        toast.error(getFriendlyToastMessage(result.error))
        return
      }
      // `created === 0` acontece quando todas as linhas eram de valor zero (procedimento
      // gratuito): nada foi lançado, então prometer "Lançamento registrado." seria mentira.
      closeAndRefresh(
        result.created > 0 ? "Lançamento registrado." : "Caso encerrado sem lançamento.",
      )
    })
  }

  const consultationAdjusted =
    consultationPriceCents !== null &&
    consultationAmount.trim() !== "" &&
    parseBrlToCents(consultationAmount) !== consultationPriceCents

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent
        className="sm:max-w-lg max-h-[85vh] overflow-y-auto"
        // Esc com o form sujo não faz nada visível: o médico escolhe entre a saída de
        // cortesia e salvar. Form intocado → Esc fecha normalmente (bloquear um diálogo
        // limpo é só irritante). Nenhuma confirmação aninhada de "descartar mudanças?".
        //
        // Não existe `onPointerDownOutside` aqui de propósito: Radix OMITE
        // `onPointerDownOutside`/`onInteractOutside` de `AlertDialogContentProps`
        // (`Omit<DialogContentProps, …>`), porque um `AlertDialog` NUNCA fecha por clique
        // no backdrop. O contrato "clique-fora não perde os valores" é estrutural neste
        // primitivo, não precisa de handler.
        onEscapeKeyDown={(e) => {
          if (step === "earnings" && isDirty) e.preventDefault()
        }}
      >
        {step === "confirm" && mode === "earnings" ? (
          // Modo `earnings` nunca mostra a etapa 1: o caso já está encerrado. Este é o
          // intervalo entre abrir e o pré-preenchimento chegar — sem ele, a confirmação
          // de "Encerrar caso?" piscaria na tela de um caso que já está encerrado.
          <AlertDialogHeader>
            <AlertDialogTitle>Registrar o que foi cobrado</AlertDialogTitle>
            <AlertDialogDescription>Carregando os valores…</AlertDialogDescription>
          </AlertDialogHeader>
        ) : step === "confirm" ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Encerrar caso?</AlertDialogTitle>
              <AlertDialogDescription>
                O caso será marcado como encerrado. Você poderá reabri-lo depois.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isClosing}>Cancelar</AlertDialogCancel>
              {/* `Button` puro, NUNCA `AlertDialogAction`: no Radix, `AlertDialogAction` É
                  o `DialogPrimitive.Close` (`<DialogPrimitive.Close …actionProps />`), então
                  o clique dispara `onOpenChange(false)` no MESMO evento — o diálogo fecha e
                  `resetForm()` devolve o `step` para `"confirm"` antes do `loadEarningsStep()`
                  assíncrono terminar, e a etapa 2 nunca tem onde aparecer. `if (isPending)
                  return` não protege: `isClosing` no closure ainda é `false` no clique.
                  Mesmo padrão do rodapé da etapa 2 abaixo. */}
              <Button type="button" disabled={isClosing} onClick={handleConfirmClose}>
                Encerrar
              </Button>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Registrar o que foi cobrado</AlertDialogTitle>
              <AlertDialogDescription>
                O caso já está encerrado. Registre o valor da consulta e os procedimentos
                realizados — ou feche sem lançar, se foi cortesia.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="flex flex-col gap-4">
              <Field data-invalid={!!errors.consultationAmount}>
                <FieldLabel htmlFor="close-case-consultation">
                  Valor da consulta (R$)
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="close-case-consultation"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    autoFocus
                    placeholder="ex.: 250,00"
                    className="tabular-nums"
                    value={consultationAmount}
                    onChange={(e) => {
                      setConsultationAmount(e.target.value)
                      setIsDirty(true)
                    }}
                  />
                  {consultationPriceCents === null ? (
                    <p className="text-xs text-muted-foreground">
                      Defina o valor da consulta em Perfil para preencher automaticamente.{" "}
                      <Link href="/dashboard/profile" className="underline">
                        Ir para Perfil
                      </Link>
                    </p>
                  ) : null}
                  {consultationAdjusted ? (
                    <p className="text-xs text-muted-foreground">
                      Ajustado — perfil: {formatCentsToBRL(consultationPriceCents)}
                    </p>
                  ) : null}
                  <FieldError>{errors.consultationAmount}</FieldError>
                </FieldContent>
              </Field>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Procedimentos realizados
                </span>
                {catalog.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum procedimento cadastrado.{" "}
                    <Link href="/dashboard/profile" className="underline">
                      Cadastrar em Perfil
                    </Link>
                  </p>
                ) : (
                  <div className="max-h-56 overflow-y-auto rounded-lg border border-border divide-y">
                    {catalog.map((item) => {
                      const isOn = !!selected[item.id]
                      const raw = amounts[item.id] ?? ""
                      const adjusted =
                        isOn && raw.trim() !== "" && parseBrlToCents(raw) !== item.price_cents
                      return (
                        <div key={item.id} className="flex flex-col gap-1 p-2">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`close-case-procedure-${item.id}`}
                              checked={isOn}
                              onCheckedChange={(value) => {
                                setSelected((prev) => ({ ...prev, [item.id]: value === true }))
                                setIsDirty(true)
                              }}
                            />
                            <label
                              htmlFor={`close-case-procedure-${item.id}`}
                              className="min-w-0 flex-1 break-words text-sm"
                            >
                              {item.name}
                            </label>
                            <Input
                              type="text"
                              inputMode="decimal"
                              autoComplete="off"
                              aria-label={`Valor de ${item.name} (R$)`}
                              placeholder="ex.: 250,00"
                              className="w-24 shrink-0 tabular-nums"
                              disabled={!isOn}
                              value={raw}
                              onChange={(e) => {
                                setAmounts((prev) => ({ ...prev, [item.id]: e.target.value }))
                                setIsDirty(true)
                              }}
                            />
                          </div>
                          {adjusted ? (
                            <p className="text-xs text-muted-foreground">
                              Ajustado — catálogo: {formatCentsToBRL(item.price_cents)}
                            </p>
                          ) : null}
                          {errors.procedures[item.id] ? (
                            <p className="text-xs text-destructive">
                              {errors.procedures[item.id]}
                            </p>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <Field data-invalid={!!errors.receivedOn}>
                <FieldLabel htmlFor="close-case-received-on">Recebido em</FieldLabel>
                <FieldContent>
                  <Input
                    id="close-case-received-on"
                    type="text"
                    inputMode="numeric"
                    placeholder="dd/mm/aaaa"
                    className="min-w-0 w-full font-mono text-sm tabular-nums"
                    aria-describedby="close-case-received-on-hint"
                    value={receivedOn}
                    onChange={(e) => {
                      setReceivedOn(maskBrazilianDateInput(e.target.value))
                      setIsDirty(true)
                    }}
                  />
                  <p
                    id="close-case-received-on-hint"
                    className="text-xs text-muted-foreground"
                  >
                    Formato: dd/mm/aaaa
                  </p>
                  <FieldError>{errors.receivedOn}</FieldError>
                </FieldContent>
              </Field>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Forma de pagamento
                </span>
                <div
                  className="flex flex-wrap gap-1.5"
                  role="group"
                  aria-label="Forma de pagamento"
                >
                  {PAYMENT_METHOD_VALUES.map((method) => (
                    <SegmentedToggle
                      key={method}
                      active={paymentMethod === method}
                      onClick={() => {
                        setPaymentMethod(method)
                        setIsDirty(true)
                      }}
                    >
                      {PAYMENT_METHOD_LABEL[method]}
                    </SegmentedToggle>
                  ))}
                </div>
                <FieldError>{errors.paymentMethod}</FieldError>
              </div>

              <p className="text-sm text-muted-foreground">
                Total:{" "}
                <span className="font-medium tabular-nums text-foreground">
                  {formatCentsToBRL(summaryCents)}
                </span>{" "}
                · {summaryCount === 1 ? "1 lançamento" : `${summaryCount} lançamentos`}
              </p>
            </div>

            {/* Sem botão de cancelar: aqui "cancelar" leria como "cancelar o
                encerramento", mas o caso já está encerrado. A saída honesta é a de
                cortesia, em tamanho normal e sem estilo de punição. */}
            <AlertDialogFooter>
              <Button
                type="button"
                variant="ghost"
                disabled={isSaving}
                onClick={handleDismiss}
              >
                Sem cobrança
              </Button>
              <Button
                type="button"
                disabled={isSaving || summaryCount === 0}
                onClick={handleSaveEntries}
              >
                {isSaving ? "Salvando…" : "Salvar lançamento"}
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
