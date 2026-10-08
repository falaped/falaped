"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, type FieldErrors, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { ArrowLeftIcon, RulerIcon, TriangleAlertIcon } from "lucide-react"
import { toast } from "sonner"

import { createMeasurementAction, createPatientAction, updatePatientAction } from "@/actions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PhoneInput } from "@/components/ui/phone-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { maskBrazilianDateInput, parseBirthDateFormValueToIso } from "@/lib/brazilian-date-form"
import { computePediatricAge } from "@/lib/compute-pediatric-age"
import { formatPediatricAge, formatPediatricAgeShort } from "@/lib/format-pediatric-age"
import { formatBrazilianPhone, formatDate } from "@/lib/formatters"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import { takePatientDraft } from "@/lib/patient-draft"
import {
  BLOOD_TYPE_OPTIONS,
  createPatientSchema,
  type CreatePatientFormData,
  type UpdatePatientFormData,
} from "@/lib/schemas/patient"
import { createMeasurementSchema, type CreateMeasurementFormData } from "@/lib/schemas/patient-measurement"
import { cn } from "@/lib/utils"
import { PATIENT_SEX_FORM_OPTIONS } from "@/modules/patients/patient-sex"
import type { Patient } from "@/modules/patients/types"
import { CREATE_PATIENT_DEFAULT_VALUES, buildEditPatientDefaultValues } from "./patient-form-defaults"
import { PatientFormPhotoField, uploadPendingPatientPhoto } from "./patient-form-photo-field"

type Values = Record<keyof typeof CREATE_PATIENT_DEFAULT_VALUES, string>
type Name = keyof Values

export type PatientFormProps = { mode: "create" } | { mode: "edit"; patient: Patient; photoUrl: string | null }

/** Nome de cada campo como aparece na barra de salvar ("Falta corrigir…", "Você alterou…"). */
const LABELS: Record<Name, string> = {
  name: "o nome da criança",
  birth_date: "a data de nascimento",
  sex: "o sexo",
  gestational_age_weeks: "a idade gestacional",
  blood_type: "o tipo sanguíneo",
  responsible: "o responsável",
  contact_phone: "o telefone do responsável",
  legal_guardian: "o responsável legal",
  address: "o endereço",
  family_notes: "a família",
  allergies: "as alergias",
  current_medications: "as medicações em uso",
  medical_history: "o histórico médico",
  weight: "o peso",
  height: "a altura",
  head_circumference: "o perímetro cefálico",
}

const SECTIONS: { id: string; title: string; fields: Name[]; createOnly?: true }[] = [
  { id: "crianca", title: "Criança", fields: ["name", "birth_date", "sex", "gestational_age_weeks", "blood_type"] },
  { id: "contato", title: "Responsável e contato", fields: ["responsible", "contact_phone", "legal_guardian", "address", "family_notes"] },
  { id: "saude", title: "Saúde", fields: ["allergies", "current_medications", "medical_history"] },
  { id: "medida", title: "Primeira medida", fields: ["weight", "height", "head_circumference"], createOnly: true },
]

const REQUIRED: Name[] = ["name", "birth_date", "sex", "responsible", "contact_phone"]

const OPTIONAL = <span className="font-normal text-subtle-foreground">(opcional)</span>
const REQUIRED_MARK = (
  <span className="text-danger-text" aria-hidden>
    *
  </span>
)

/**
 * Cadastrar e editar a criança (protótipos b6 e b7), no modelo Configuração: cabeçalho com
 * quem está na tela, índice à esquerda, seções em cartões e a barra de salvar.
 */
export function PatientForm(props: PatientFormProps) {
  const router = useRouter()
  const isCreate = props.mode === "create"
  const patient = props.mode === "edit" ? props.patient : null
  const fichaHref = patient ? `/dashboard/patients/${patient.id}` : "/dashboard/patients"

  const form = useForm<Values>({
    mode: "onSubmit",
    reValidateMode: "onChange",
    // A edição cobra os mesmos obrigatórios do cadastro: abrir uma ficha antiga incompleta pede para completá-la.
    resolver: zodResolver(createPatientSchema) as unknown as Resolver<Values>,
    defaultValues: patient ? buildEditPatientDefaultValues(patient) : { ...CREATE_PATIENT_DEFAULT_VALUES },
  })
  const { register, watch, setValue, formState } = form
  const { errors, isDirty, dirtyFields, isSubmitting, isSubmitted } = formState
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null)
  const sections = SECTIONS.filter((section) => isCreate || !section.createOnly)
  const active = useActiveSection(sections.map((section) => section.id))

  // Dados vindos do cadastro rápido da busca ("Abrir a ficha completa").
  useEffect(() => {
    if (!isCreate) return
    const draft = takePatientDraft()
    if (draft) form.reset({ ...CREATE_PATIENT_DEFAULT_VALUES, ...draft })
  }, [isCreate, form])

  // O Editar de cada cartão da aba Dados abre direto na seção (#crianca, #contato, #saude).
  useEffect(() => {
    if (window.location.hash) document.getElementById(window.location.hash.slice(1))?.scrollIntoView()
  }, [])

  // Sair sem salvar pergunta antes (recarregar, fechar a aba).
  // ponytail: só o navegador; os links do menu lateral não perguntam. Interceptar quando o Next tiver bloqueio de navegação.
  useEffect(() => {
    if (isCreate || !isDirty) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [isCreate, isDirty])

  const name = (watch("name") ?? "").trim()
  const birthIso = parseBirthDateFormValueToIso(watch("birth_date") ?? "")
  const age = birthIso ? computePediatricAge(birthIso) : null

  async function onSubmit(parsedValues: Values) {
    // O resolver entrega os valores já transformados (data ISO, números); a medida sai dos valores do formulário.
    const raw = form.getValues()
    if (!patient) {
      const measure = { weight: raw.weight, length_height: raw.height, head_circumference: raw.head_circumference }
      let parsedMeasure: CreateMeasurementFormData | null = null
      if (Object.values(measure).some((value) => value?.trim())) {
        // Valida a medida antes de cadastrar: a criança não pode nascer com metade dos dados.
        const parsed = createMeasurementSchema.safeParse({ patientId: crypto.randomUUID(), measured_on: format(new Date(), "dd/MM/yyyy"), ...measure })
        if (!parsed.success) {
          const issue = parsed.error.issues[0]
          const field = issue.path[0] === "length_height" ? "height" : (issue.path[0] as Name)
          form.setError(field, { message: issue.message }, { shouldFocus: true })
          return
        }
        parsedMeasure = parsed.data
      }
      // Peso, altura e PC vão para a aba Crescimento, não para a ficha.
      const data = parsedValues as unknown as CreatePatientFormData
      const result = await createPatientAction({ ...data, weight: undefined, height: undefined, head_circumference: undefined })
      if (!result.ok) {
        toast.error(getFriendlyToastMessage(result.error))
        return
      }
      if (pendingPhoto) {
        const uploaded = await uploadPendingPatientPhoto(pendingPhoto, result.patientId).catch(() => null)
        if (!uploaded?.ok) toast.warning("Criança cadastrada, mas a foto não foi enviada. Tente de novo em Editar.")
      }
      if (parsedMeasure) {
        const measured = await createMeasurementAction({ ...parsedMeasure, patientId: result.patientId })
        if (!measured.ok) toast.warning(`Criança cadastrada, mas a medida não foi salva: ${measured.error}`)
      }
      toast.success("Criança cadastrada.")
      router.push(`/dashboard/patients/${result.patientId}`)
      return
    }

    const result = await updatePatientAction(patient.id, parsedValues as unknown as UpdatePatientFormData)
    if (!result.ok) {
      toast.error(getFriendlyToastMessage(result.error))
      return
    }
    form.reset(raw)
    toast.success("Ficha atualizada.")
    router.push(`${fichaHref}#dados`)
  }

  const missing = REQUIRED.filter((key) => !watch(key)?.trim())
  const errorNames = (Object.keys(errors) as Name[]).filter((key) => key in LABELS)
  const changed = (Object.keys(dirtyFields) as Name[]).filter((key) => key in LABELS)

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex w-full max-w-[1440px] flex-col">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="-ml-2.5 mb-2 self-start text-muted-foreground"
        onClick={() => {
          if (isDirty && !isCreate) setLeaveOpen(true)
          else router.push(fichaHref)
        }}
      >
        <ArrowLeftIcon data-icon="inline-start" />
        {isCreate ? "Voltar para pacientes" : "Voltar à ficha"}
      </Button>

      <section className="flex items-center gap-5 rounded-xl border border-primary-soft-border bg-highlight p-6 shadow-sm">
        {patient ? (
          <PatientFormPhotoField patientId={patient.id} patientName={patient.name} initialPhotoUrl={props.mode === "edit" ? props.photoUrl : null} />
        ) : (
          <PatientFormPhotoField patientName={name} onPendingChange={setPendingPhoto} />
        )}
        <div className="min-w-0">
          <h1 className="font-display text-page font-semibold">{patient ? `Editar ficha de ${patient.name}` : "Cadastrar criança"}</h1>
          <div className="mt-1 text-muted-foreground">
            {patient
              ? [
                  age?.status === "ok" ? formatPediatricAgeShort(age) : null,
                  birthIso ? `nasc. ${formatDate(birthIso)}` : null,
                  patient.responsible,
                  patient.contact_phone ? formatBrazilianPhone(patient.contact_phone) : null,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : [name || "Comece pelo nome", age?.status === "ok" ? formatPediatricAgeShort(age) : null].filter(Boolean).join(" · ")}
          </div>
        </div>
        {isCreate ? (
          <p className="ml-auto max-w-[44ch] text-right text-caption text-muted-foreground">
            Os campos com * bastam para cadastrar. O resto pode ficar para depois.
          </p>
        ) : null}
      </section>

      <div className="mt-6 grid grid-cols-[220px_minmax(0,880px)] items-start gap-8">
        <nav aria-label="Seções da ficha" className="sticky top-6 flex flex-col gap-0.5">
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              aria-current={active === section.id ? "true" : undefined}
              className={cn(
                "flex h-9 items-center gap-2 rounded-lg px-3",
                active === section.id
                  ? "bg-primary-soft font-semibold text-primary-ink-strong"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {section.title}
              {section.fields.some((field) => errors[field]) ? (
                <span className="ml-auto size-2 rounded-full bg-danger-text" aria-label="Tem erro" />
              ) : null}
            </a>
          ))}
        </nav>

        <div className="flex flex-col gap-6">
          <FormCard id="crianca" title="Criança" description="Quem ela é. Sai no cabeçalho dos documentos.">
            <div className="grid grid-cols-2 gap-4">
              <FormField className="col-span-2" id="name" label={<>Nome da criança {REQUIRED_MARK}</>} required help="Como está na certidão" errors={errors}>
                <Input id="name" autoComplete="off" {...register("name")} aria-invalid={!!errors.name} />
              </FormField>
              <FormField
                id="birth_date"
                label={<>Data de nascimento {REQUIRED_MARK}</>}
                required
                help={age?.status === "ok" ? formatPediatricAge(age) : "dd/mm/aaaa"}
                errors={errors}
              >
                <Input
                  id="birth_date"
                  inputMode="numeric"
                  placeholder="dd/mm/aaaa"
                  className="num"
                  aria-invalid={!!errors.birth_date}
                  value={watch("birth_date")}
                  onChange={(event) =>
                    setValue("birth_date", maskBrazilianDateInput(event.target.value), { shouldDirty: true, shouldValidate: isSubmitted })
                  }
                />
              </FormField>
              <FormField id="sex" label={<>Sexo {REQUIRED_MARK}</>} help="A curva de crescimento depende dele" errors={errors}>
                <div role="radiogroup" aria-labelledby="sex-label" aria-required className="grid h-9 grid-cols-2 rounded-lg bg-muted p-1">
                  {[...PATIENT_SEX_FORM_OPTIONS].reverse().map((option) => {
                    const checked = watch("sex") === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={checked}
                        onClick={() => setValue("sex", option.value, { shouldDirty: true, shouldValidate: isSubmitted })}
                        className={cn(
                          "rounded-md text-label",
                          checked ? "bg-card font-semibold shadow-xs" : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              </FormField>
              <FormField
                id="gestational_age_weeks"
                label={<>Idade gestacional ao nascer {OPTIONAL}</>}
                help="Em semanas. Abaixo de 37, as curvas usam a idade corrigida."
                errors={errors}
              >
                <Input
                  id="gestational_age_weeks"
                  inputMode="numeric"
                  placeholder="Ex.: 38"
                  className="num"
                  aria-invalid={!!errors.gestational_age_weeks}
                  value={watch("gestational_age_weeks")}
                  onChange={(event) =>
                    setValue("gestational_age_weeks", event.target.value.replace(/\D/g, ""), { shouldDirty: true, shouldValidate: isSubmitted })
                  }
                />
              </FormField>
              <FormField id="blood_type" label={<>Tipo sanguíneo {OPTIONAL}</>} errors={errors}>
                <Select
                  value={watch("blood_type") || undefined}
                  onValueChange={(value) => setValue("blood_type", value, { shouldDirty: true, shouldValidate: isSubmitted })}
                >
                  <SelectTrigger id="blood_type" className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOOD_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>
          </FormCard>

          <FormCard id="contato" title="Responsável e contato" description="Com quem você fala e para onde vão os documentos.">
            <div className="grid grid-cols-2 gap-4">
              <FormField id="responsible" label={<>Responsável {REQUIRED_MARK}</>} required help="Nome completo, como nos documentos" errors={errors}>
                <Input id="responsible" autoComplete="off" aria-invalid={!!errors.responsible} {...register("responsible")} />
              </FormField>
              <FormField id="contact_phone" label={<>Telefone do responsável {REQUIRED_MARK}</>} required help="Com DDD" errors={errors}>
                <PhoneInput
                  id="contact_phone"
                  className="num"
                  aria-invalid={!!errors.contact_phone}
                  value={watch("contact_phone")}
                  onChange={(value) => setValue("contact_phone", value, { shouldDirty: true, shouldValidate: isSubmitted })}
                />
              </FormField>
              <FormField id="legal_guardian" label={<>Responsável legal {OPTIONAL}</>} help="Só se for outra pessoa (guarda, tutela)" errors={errors}>
                <Input id="legal_guardian" autoComplete="off" {...register("legal_guardian")} />
              </FormField>
              <div />
              <FormField className="col-span-2" id="address" label={<>Endereço {OPTIONAL}</>} help="Rua, número, bairro e cidade" errors={errors}>
                <Input id="address" autoComplete="off" {...register("address")} />
              </FormField>
              <FormField
                className="col-span-2"
                id="family_notes"
                label={<>Família {OPTIONAL}</>}
                help="Ajuda a lembrar quem é quem na próxima consulta."
                errors={errors}
              >
                <Textarea id="family_notes" placeholder="Mãe, pai, irmãos, com quem mora" className="min-h-20" {...register("family_notes")} />
              </FormField>
            </div>
          </FormCard>

          <FormCard id="saude" title="Saúde" description="O que você precisa saber antes de prescrever.">
            <div className="rounded-xl border border-danger-border bg-danger-soft/40 p-4">
              <FormField
                id="allergies"
                label={
                  <>
                    <TriangleAlertIcon className="size-4 text-danger-text" aria-hidden />
                    Alergias {OPTIONAL}
                  </>
                }
                help="Aparece como alerta na ficha, na consulta e em toda receita."
                errors={errors}
              >
                <Textarea id="allergies" placeholder="Ex.: amoxicilina (exantema em 06/2025)" className="min-h-16 bg-card" {...register("allergies")} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField id="current_medications" label={<>Medicações em uso {OPTIONAL}</>} errors={errors}>
                <Textarea id="current_medications" placeholder="Nome, dose e frequência" className="min-h-24" {...register("current_medications")} />
              </FormField>
              <FormField id="medical_history" label={<>Histórico médico {OPTIONAL}</>} errors={errors}>
                <Textarea id="medical_history" placeholder="Internações, cirurgias, doenças crônicas" className="min-h-24" {...register("medical_history")} />
              </FormField>
            </div>
          </FormCard>

          {isCreate ? (
            <FormCard
              id="medida"
              title={<>Primeira medida {OPTIONAL}</>}
              description="Entra na aba Crescimento com a data de hoje e já aparece na curva."
            >
              <div className="grid grid-cols-3 gap-4">
                {(
                  [
                    ["weight", "Peso", "kg", "12,5"],
                    ["height", "Altura", "cm", "86"],
                    ["head_circumference", "Perímetro cefálico", "cm", "47"],
                  ] as const
                ).map(([field, label, unit, placeholder]) => (
                  <FormField key={field} id={field} label={label} help={unit} errors={errors}>
                    <Input id={field} inputMode="decimal" placeholder={placeholder} className="num" aria-invalid={!!errors[field]} {...register(field)} />
                  </FormField>
                ))}
              </div>
            </FormCard>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-border-strong px-5 py-4 text-muted-foreground">
              <RulerIcon className="size-4" aria-hidden />
              <span className="flex-1">Peso, altura e PC têm histórico e ficam na aba Crescimento.</span>
              <Button asChild variant="link" size="sm">
                <Link href={`${fichaHref}#crescimento`}>Registrar medida</Link>
              </Button>
            </div>
          )}

          {isCreate || isDirty ? (
            <div className="sticky bottom-6 z-20 flex items-center gap-3 rounded-2xl border border-border bg-popover px-4 py-3 shadow-lg">
              {isCreate ? (
                <>
                  {errorNames.length ? (
                    <>
                      <span className="size-2 rounded-full bg-danger-text" aria-hidden />
                      <span className="flex-1" aria-live="polite">
                        Falta corrigir {LABELS[errorNames[0]]}
                      </span>
                    </>
                  ) : missing.length ? (
                    <span className="flex-1 text-muted-foreground" aria-live="polite">
                      <span className="text-danger-text">*</span> Campos obrigatórios
                    </span>
                  ) : (
                    <span className="flex-1" />
                  )}
                  <Button type="button" variant="ghost" size="sm" onClick={() => router.push("/dashboard/patients")}>
                    Cancelar
                  </Button>
                  <Button type="submit" size="sm" disabled={isSubmitting || missing.length > 0}>
                    {isSubmitting ? "Cadastrando…" : "Cadastrar criança"}
                  </Button>
                </>
              ) : (
                <>
                  <span className={cn("size-2 rounded-full", errorNames.length ? "bg-danger-text" : "bg-warning")} aria-hidden />
                  <span className="flex-1" aria-live="polite">
                    {errorNames.length ? `Falta corrigir ${LABELS[errorNames[0]]}` : `Você alterou ${joinPtBr(changed.map((key) => LABELS[key]))}`}
                  </span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => form.reset()}>
                    Descartar
                  </Button>
                  <Button type="submit" size="sm" disabled={isSubmitting}>
                    {isSubmitting ? "Salvando…" : "Salvar alterações"}
                  </Button>
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair sem salvar?</AlertDialogTitle>
            <AlertDialogDescription>Você alterou {joinPtBr(changed.map((key) => LABELS[key]))}. Essas mudanças vão se perder.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => router.push(fichaHref)}>
              Sair sem salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  )
}

function FormCard({ id, title, description, children }: { id: string; title: React.ReactNode; description: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 rounded-xl border border-border bg-card">
      <div className="border-b border-border px-6 py-4">
        <h2 className="font-display text-section font-semibold">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-col gap-5 px-6 py-5">{children}</div>
    </section>
  )
}

/** Rótulo em cima, ajuda embaixo; o erro toma o lugar da ajuda e diz o que fazer. */
function FormField({
  id,
  label,
  help,
  required,
  errors,
  className,
  children,
}: {
  id: Name
  label: React.ReactNode
  help?: string
  /** Só marca o rótulo com *; quem obriga é o schema. */
  required?: boolean
  errors: FieldErrors<Values>
  className?: string
  children: React.ReactNode
}) {
  const error = errors[id]?.message
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {id === "sex" ? (
        <span id="sex-label" className="text-label font-medium">
          {label}
        </span>
      ) : (
        <label htmlFor={id} className="inline-flex items-center gap-1.5 text-label font-medium">
          {label}
          {required ? <span className="sr-only">(obrigatório)</span> : null}
        </label>
      )}
      {children}
      {error ? (
        <span role="alert" className="text-caption text-danger-text">
          {error}
        </span>
      ) : help ? (
        <span className="text-caption text-subtle-foreground">{help}</span>
      ) : null}
    </div>
  )
}

/** Seção do índice que está no topo da tela. */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0])
  const key = ids.join()
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting)
        if (visible.length) setActive(visible[0].target.id)
      },
      { rootMargin: "0px 0px -70% 0px" },
    )
    for (const id of key.split(",")) {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    }
    return () => observer.disconnect()
  }, [key])
  return active
}

/** "a", "a e b", "a, b e c". */
function joinPtBr(items: string[]): string {
  return items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} e ${items.at(-1)}`
}
