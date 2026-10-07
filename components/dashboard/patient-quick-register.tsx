"use client"

import { useState } from "react"
import { ArrowLeftIcon, ChevronRightIcon } from "lucide-react"

import { createPatientAction, type PatientSearchItem } from "@/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PhoneInput } from "@/components/ui/phone-input"
import { maskBrazilianDateInput, parseBirthDateFormValueToIso } from "@/lib/brazilian-date-form"
import { computePediatricAge } from "@/lib/compute-pediatric-age"
import { formatPediatricAge } from "@/lib/format-pediatric-age"
import { createPatientSchema } from "@/lib/schemas/patient"
import { cn } from "@/lib/utils"
import type { PatientSex } from "@/modules/patients/patient-sex"

type Field = "name" | "birth_date" | "responsible" | "contact_phone" | "sex" | "gestational_age_weeks"

/** "Faltam 5 dígitos" para celular (11 dígitos com DDD) ou fixo (10). */
function phoneError(phone: string): string | null {
  const digits = phone.replace(/\D/g, "")
  if (!digits) return "Informe o telefone do responsável."
  const expected = digits[2] === "9" ? 11 : 10
  if (digits.length >= 10) return null
  const missing = expected - digits.length
  return `Falta${missing === 1 ? "" : "m"} ${missing} dígito${missing === 1 ? "" : "s"}. Ex.: (31) 98888-1111`
}

/**
 * Cadastro rápido dentro da busca (protótipo a4): só o essencial para abrir a consulta.
 * O resto da ficha é completado depois. Sexo e nascimento são obrigatórios no banco.
 */
export function PatientQuickRegister({
  initialName,
  busy,
  onBack,
  onCreated,
}: {
  initialName: string
  busy: boolean
  onBack: () => void
  onCreated: (patient: PatientSearchItem) => void
}) {
  const [name, setName] = useState(initialName)
  const [birthDate, setBirthDate] = useState("")
  const [responsible, setResponsible] = useState("")
  const [phone, setPhone] = useState("")
  const [sex, setSex] = useState<PatientSex | "">("")
  const [more, setMore] = useState(false)
  const [gestationalWeeks, setGestationalWeeks] = useState("")
  const [allergies, setAllergies] = useState("")
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const birthIso = parseBirthDateFormValueToIso(birthDate)
  const age = birthIso ? formatPediatricAge(computePediatricAge(birthIso)) : ""
  const title = name.trim().split(" ")[0]

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (saving || busy) return
    const data = {
      name,
      birth_date: birthDate,
      responsible,
      contact_phone: phone,
      sex,
      gestational_age_weeks: gestationalWeeks,
      allergies,
    }
    const parsed = createPatientSchema.safeParse(data)
    const next: Partial<Record<Field, string>> = {}
    for (const issue of parsed.success ? [] : parsed.error.issues) {
      const key = issue.path[0] as Field
      next[key] ??= issue.message
    }
    if (!birthDate.trim()) next.birth_date = "Informe a data de nascimento."
    else if (birthIso && computePediatricAge(birthIso).status === "future") next.birth_date = "A data não pode ser no futuro."
    if (!sex) next.sex = "Escolha o sexo da criança."
    const phoneMessage = phoneError(phone)
    if (phoneMessage) next.contact_phone = phoneMessage
    setErrors(next)
    if (!parsed.success || Object.keys(next).length) return

    setSaving(true)
    setFormError(null)
    const result = await createPatientAction(parsed.data)
    setSaving(false)
    if (!result.ok) {
      setFormError(result.error)
      return
    }
    onCreated({
      id: result.patientId,
      name: parsed.data.name,
      birthDate: parsed.data.birth_date ?? null,
      responsible: parsed.data.responsible,
      contactPhone: parsed.data.contact_phone,
      sex: sex || null,
      lastConsultAt: null,
    })
  }

  const fieldError = (field: Field) =>
    errors[field] ? (
      <p id={`quick-${field}-error`} className="text-caption text-danger-text">
        {errors[field]}
      </p>
    ) : null
  const invalid = (field: Field) => ({
    "aria-invalid": !!errors[field] || undefined,
    "aria-describedby": errors[field] ? `quick-${field}-error` : undefined,
  })

  return (
    <form onSubmit={submit} noValidate>
      <div className="space-y-4 px-5 py-5">
        <h2 className="text-title font-semibold">{title ? `Cadastrar ${title} e iniciar a consulta` : "Cadastrar e iniciar a consulta"}</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quick-name">Nome da criança</Label>
            <Input id="quick-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus {...invalid("name")} />
            {fieldError("name")}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quick-birth_date">Data de nascimento</Label>
            <Input
              id="quick-birth_date"
              inputMode="numeric"
              placeholder="dd/mm/aaaa"
              className="num"
              value={birthDate}
              onChange={(e) => setBirthDate(maskBrazilianDateInput(e.target.value))}
              {...invalid("birth_date")}
            />
            {fieldError("birth_date") ?? (age ? <p className="text-caption text-muted-foreground">{age}</p> : null)}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quick-responsible">Responsável</Label>
            <Input
              id="quick-responsible"
              placeholder="Nome completo"
              value={responsible}
              onChange={(e) => setResponsible(e.target.value)}
              {...invalid("responsible")}
            />
            {fieldError("responsible")}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quick-contact_phone">Telefone do responsável</Label>
            <PhoneInput id="quick-contact_phone" className="num" value={phone} onChange={setPhone} {...invalid("contact_phone")} />
            {fieldError("contact_phone")}
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <span id="quick-sex-label" className="text-sm font-medium">
              Sexo
            </span>
            <div role="radiogroup" aria-labelledby="quick-sex-label" className="flex gap-2" {...invalid("sex")}>
              {(["feminino", "masculino"] as const).map((value) => (
                <Button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={sex === value}
                  variant="outline"
                  className={cn("w-32", sex === value && "border-primary bg-primary-soft text-primary-ink-strong hover:bg-primary-soft")}
                  onClick={() => setSex(value)}
                >
                  {value === "feminino" ? "Feminino" : "Masculino"}
                </Button>
              ))}
            </div>
            {fieldError("sex")}
          </div>
        </div>

        <button
          type="button"
          aria-expanded={more}
          onClick={() => setMore((value) => !value)}
          className="flex items-center gap-1.5 text-label font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronRightIcon className={cn("size-4 transition-transform", more && "rotate-90")} aria-hidden />
          Mais dados: idade gestacional, alergias
        </button>
        {more ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="quick-gestational_age_weeks">Idade gestacional ao nascer (semanas)</Label>
              <Input
                id="quick-gestational_age_weeks"
                inputMode="numeric"
                placeholder="Ex.: 38"
                className="num"
                value={gestationalWeeks}
                onChange={(e) => setGestationalWeeks(e.target.value.replace(/\D/g, "").slice(0, 2))}
                {...invalid("gestational_age_weeks")}
              />
              {fieldError("gestational_age_weeks")}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="quick-allergies">Alergias</Label>
              <Input id="quick-allergies" placeholder="Ex.: APLV, dipirona" value={allergies} onChange={(e) => setAllergies(e.target.value)} />
            </div>
          </div>
        ) : null}
        {formError ? (
          <p role="alert" className="text-caption text-danger-text">
            {formError}
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-2 border-t border-border px-5 py-3">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeftIcon aria-hidden />
          Voltar à busca
        </Button>
        <Button type="submit" className="ml-auto" disabled={saving || busy}>
          {saving || busy ? "Abrindo…" : "Cadastrar e iniciar consulta"}
        </Button>
      </div>
    </form>
  )
}
