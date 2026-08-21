"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { createStandaloneFinancialEntryAction } from "@/actions"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import { maskBrazilianDateInput } from "@/lib/brazilian-date-form"
import {
  PAYMENT_METHOD_LABEL,
  PAYMENT_METHOD_VALUES,
  standaloneFinancialEntrySchema,
  type StandaloneFinancialEntryFormData,
  type StandaloneFinancialEntryFormValues,
} from "@/lib/schemas/financial-entry"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { SegmentedToggle } from "@/components/segmented-toggle"

type StandaloneEntryDialogProps = {
  /** Hoje no fuso da clínica, já formatado dd/MM/yyyy pelo RSC — o cliente nunca deriva datas. */
  todayLabel: string
}

/**
 * Lançamento avulso (S2, EARN-02): dinheiro que não veio de um caso.
 *
 * Os quatro campos são obrigatórios e a forma de pagamento NÃO tem default — um default
 * gravaria o método errado por inércia em todo lançamento. Enquanto o form está sujo, Esc e
 * clique no backdrop são bloqueados para que dinheiro digitado não seja descartado em
 * silêncio; o `Cancelar` do rodapé é a saída explícita que descarta.
 */
export function StandaloneEntryDialog({ todayLabel }: StandaloneEntryDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const defaultValues = {
    description: "",
    amount: "",
    received_on: todayLabel,
    payment_method: undefined,
  } as unknown as StandaloneFinancialEntryFormValues

  const form = useForm<
    StandaloneFinancialEntryFormValues,
    unknown,
    StandaloneFinancialEntryFormData
  >({
    resolver: zodResolver(standaloneFinancialEntrySchema),
    defaultValues,
    mode: "onChange",
  })

  const { errors, isDirty, isValid } = form.formState
  const paymentMethod = form.watch("payment_method")

  function handleOpenChange(next: boolean) {
    if (isPending) return
    if (!next) form.reset(defaultValues)
    setOpen(next)
  }

  // O schema já rodou no resolver, mas o que sobe é o valor CRU do form: o action é a
  // fonte da verdade e re-valida. Enviar o valor transformado significaria parsear duas
  // vezes (centavos como se fossem reais, ISO como se fosse dd/mm/aaaa).
  const onSubmit = form.handleSubmit(() => {
    const raw = form.getValues()
    startTransition(async () => {
      const result = await createStandaloneFinancialEntryAction(raw)
      if (!result.ok) {
        toast.error(getFriendlyToastMessage(result.error))
        return
      }
      form.reset(defaultValues)
      setOpen(false)
      toast.success("Lançamento registrado.")
      // Sem isto o RSC da página atual não re-renderiza e o total não muda —
      // o revalidatePath do action sozinho não basta com cacheComponents ligado.
      router.refresh()
    })
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>Novo lançamento</Button>
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-lg"
        onEscapeKeyDown={(e) => {
          if (isDirty) e.preventDefault()
        }}
        onPointerDownOutside={(e) => {
          if (isDirty) e.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>Novo lançamento</DialogTitle>
          <DialogDescription>
            Registre um valor recebido que não veio de um caso.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field data-invalid={!!errors.description}>
            <FieldLabel htmlFor="entry-description">Descrição</FieldLabel>
            <FieldContent>
              <Input
                id="entry-description"
                type="text"
                autoComplete="off"
                placeholder="ex.: Consulta particular sem caso"
                {...form.register("description")}
              />
              <FieldError
                errors={errors.description ? [errors.description] : undefined}
              />
            </FieldContent>
          </Field>

          <Field data-invalid={!!errors.amount}>
            <FieldLabel htmlFor="entry-amount">Valor (R$)</FieldLabel>
            <FieldContent>
              <Input
                id="entry-amount"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="ex.: 250,00"
                className="tabular-nums"
                {...form.register("amount")}
              />
              <FieldError errors={errors.amount ? [errors.amount] : undefined} />
            </FieldContent>
          </Field>

          <Field data-invalid={!!errors.received_on}>
            <FieldLabel htmlFor="entry-received-on">Recebido em</FieldLabel>
            <FieldContent>
              <Controller
                name="received_on"
                control={form.control}
                render={({ field }) => (
                  <Input
                    id="entry-received-on"
                    type="text"
                    inputMode="numeric"
                    placeholder="dd/mm/aaaa"
                    className="min-w-0 w-full font-mono text-sm tabular-nums"
                    aria-describedby="entry-received-on-hint"
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={typeof field.value === "string" ? field.value : ""}
                    onChange={(e) =>
                      field.onChange(maskBrazilianDateInput(e.target.value))
                    }
                  />
                )}
              />
              <p id="entry-received-on-hint" className="text-xs text-muted-foreground">
                Formato: dd/mm/aaaa
              </p>
              <FieldError
                errors={errors.received_on ? [errors.received_on] : undefined}
              />
            </FieldContent>
          </Field>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Forma de pagamento
            </span>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Forma de pagamento">
              {PAYMENT_METHOD_VALUES.map((method) => (
                <SegmentedToggle
                  key={method}
                  active={paymentMethod === method}
                  onClick={() =>
                    form.setValue("payment_method", method, {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                >
                  {PAYMENT_METHOD_LABEL[method]}
                </SegmentedToggle>
              ))}
            </div>
            <FieldError
              errors={errors.payment_method ? [errors.payment_method] : undefined}
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isPending}>
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending || !isValid}>
              {isPending ? "Salvando…" : "Salvar lançamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
