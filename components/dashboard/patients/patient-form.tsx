"use client"

import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PhoneInput } from "@/components/ui/phone-input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field"
import {
  createPatientSchema,
  updatePatientSchema,
  SEX_OPTIONS,
  BLOOD_TYPE_OPTIONS,
  type CreatePatientFormData,
  type UpdatePatientFormData,
} from "@/lib/schemas/patient"
import type { Patient } from "@/modules/patients/types"
import {
  createPatientAction,
  updatePatientAction,
} from "@/app/dashboard/patients/actions"

type PatientFormProps =
  | {
      mode: "create"
      patient?: never
      onUpdateSuccess?: never
    }
  | {
      mode: "edit"
      patient: Patient
      onUpdateSuccess?: () => void
    }

function toFormValue(value: string | null | undefined): string {
  return value?.trim() ?? ""
}

function sexToFormValue(value: string | null | undefined): string {
  const v = value?.trim()
  if (!v) return ""
  if (v === "M") return "Masculino"
  if (v === "F") return "Feminino"
  return ["Masculino", "Feminino"].includes(v) ? v : ""
}

export function PatientForm(props: PatientFormProps) {
  const router = useRouter()
  const isCreate = props.mode === "create"

  const createForm = useForm<CreatePatientFormData>({
    resolver: zodResolver(createPatientSchema),
    defaultValues: {
      name: "",
      birth_date: "",
      responsible: "",
      contact_phone: "",
      sex: "",
      legal_guardian: "",
      blood_type: "",
      weight: "",
      height: "",
      head_circumference: "",
      allergies: "",
      current_medications: "",
      medical_history: "",
    },
  })

  const editForm = useForm<UpdatePatientFormData>({
    resolver: zodResolver(updatePatientSchema),
    defaultValues: props.mode === "edit" ? {
      name: toFormValue(props.patient.name),
      birth_date: toFormValue(props.patient.birth_date),
      responsible: toFormValue(props.patient.responsible),
      contact_phone: toFormValue(props.patient.contact_phone),
      sex: sexToFormValue(props.patient.sex),
      legal_guardian: toFormValue(props.patient.legal_guardian),
      blood_type: BLOOD_TYPE_OPTIONS.includes(toFormValue(props.patient.blood_type) as (typeof BLOOD_TYPE_OPTIONS)[number])
        ? toFormValue(props.patient.blood_type)
        : "",
      weight: toFormValue(props.patient.weight),
      height: toFormValue(props.patient.height),
      head_circumference: toFormValue(props.patient.head_circumference),
      allergies: toFormValue(props.patient.allergies),
      current_medications: toFormValue(props.patient.current_medications),
      medical_history: toFormValue(props.patient.medical_history),
    } : undefined,
  })

  const form = isCreate ? createForm : editForm
  const isSubmitting = form.formState.isSubmitting

  async function handleSubmit(
    data: CreatePatientFormData | UpdatePatientFormData
  ) {
    if (props.mode === "create") {
      const result = await createPatientAction(data as CreatePatientFormData)
      if (result.ok) {
        toast.success("Paciente cadastrado.")
        router.push(`/dashboard/patients/${result.patientId}`)
      } else {
        toast.error(result.error)
      }
    } else {
      const result = await updatePatientAction(
        props.patient.id,
        data as UpdatePatientFormData
      )
      if (result.ok) {
        toast.success("Paciente atualizado.")
        props.onUpdateSuccess?.()
      } else {
        toast.error(result.error)
      }
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      className="space-y-8"
    >
      <FieldSet>
        <FieldLegend variant="legend">Dados pessoais</FieldLegend>
        <FieldGroup className="mt-4">
          <Field>
            <FieldLabel htmlFor="patient-name">Nome do paciente</FieldLabel>
            <FieldContent>
              <Input
                id="patient-name"
                placeholder="Nome do paciente"
                {...form.register("name")}
              />
              <FieldError errors={form.formState.errors.name ? [form.formState.errors.name] : undefined} />
            </FieldContent>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="patient-birth_date">Data de nascimento</FieldLabel>
              <FieldContent>
                <Input
                  id="patient-birth_date"
                  type="date"
                  {...form.register("birth_date")}
                />
                <FieldError errors={form.formState.errors.birth_date ? [form.formState.errors.birth_date] : undefined} />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="patient-sex">Sexo</FieldLabel>
              <FieldContent>
                <Select
                  value={isCreate ? createForm.watch("sex") : (editForm.watch("sex") ?? "")}
                  onValueChange={(v) => form.setValue("sex", v, { shouldValidate: true })}
                >
                  <SelectTrigger id="patient-sex" className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEX_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={form.formState.errors.sex ? [form.formState.errors.sex] : undefined} />
              </FieldContent>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="patient-responsible">Nome completo do responsável</FieldLabel>
              <FieldContent>
                <Input
                  id="patient-responsible"
                  placeholder="Ex.: Maria Silva"
                  {...form.register("responsible")}
                />
                <FieldError errors={form.formState.errors.responsible ? [form.formState.errors.responsible] : undefined} />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="patient-contact_phone">Telefone de contato</FieldLabel>
              <FieldContent>
                <PhoneInput
                  id="patient-contact_phone"
                  value={
                    isCreate
                      ? createForm.watch("contact_phone")
                      : (editForm.watch("contact_phone") ?? "")
                  }
                  onChange={(v) => form.setValue("contact_phone", v, { shouldValidate: true })}
                />
                <FieldError errors={form.formState.errors.contact_phone ? [form.formState.errors.contact_phone] : undefined} />
              </FieldContent>
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="patient-legal_guardian">Responsável legal (se diferente)</FieldLabel>
            <FieldContent>
              <Input
                id="patient-legal_guardian"
                placeholder="Opcional"
                {...form.register("legal_guardian")}
              />
              <FieldError errors={form.formState.errors.legal_guardian ? [form.formState.errors.legal_guardian] : undefined} />
            </FieldContent>
          </Field>
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend variant="legend">Dados clínicos</FieldLegend>
        <FieldGroup className="mt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field>
              <FieldLabel htmlFor="patient-blood_type">Tipo sanguíneo</FieldLabel>
              <FieldContent>
                <Select
                  value={isCreate ? createForm.watch("blood_type") : (editForm.watch("blood_type") ?? "")}
                  onValueChange={(v) => form.setValue("blood_type", v, { shouldValidate: true })}
                >
                  <SelectTrigger id="patient-blood_type" className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOOD_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={form.formState.errors.blood_type ? [form.formState.errors.blood_type] : undefined} />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="patient-weight">Peso (kg)</FieldLabel>
              <FieldContent>
                <Input
                  id="patient-weight"
                  placeholder="Ex.: 12,5"
                  {...form.register("weight")}
                />
                <FieldError errors={form.formState.errors.weight ? [form.formState.errors.weight] : undefined} />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="patient-height">Altura (cm)</FieldLabel>
              <FieldContent>
                <Input
                  id="patient-height"
                  placeholder="Ex.: 85"
                  {...form.register("height")}
                />
                <FieldError errors={form.formState.errors.height ? [form.formState.errors.height] : undefined} />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="patient-head_circumference">Perímetro cefálico (cm)</FieldLabel>
              <FieldContent>
                <Input
                  id="patient-head_circumference"
                  placeholder="Opcional"
                  {...form.register("head_circumference")}
                />
                <FieldError errors={form.formState.errors.head_circumference ? [form.formState.errors.head_circumference] : undefined} />
              </FieldContent>
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="patient-allergies">Alergias</FieldLabel>
            <FieldContent>
              <Textarea
                id="patient-allergies"
                placeholder="Alergias conhecidas"
                rows={2}
                {...form.register("allergies")}
              />
              <FieldError errors={form.formState.errors.allergies ? [form.formState.errors.allergies] : undefined} />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor="patient-current_medications">Medicamentos em uso</FieldLabel>
            <FieldContent>
              <Textarea
                id="patient-current_medications"
                placeholder="Medicamentos em uso"
                rows={2}
                {...form.register("current_medications")}
              />
              <FieldError errors={form.formState.errors.current_medications ? [form.formState.errors.current_medications] : undefined} />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor="patient-medical_history">Histórico médico</FieldLabel>
            <FieldContent>
              <Textarea
                id="patient-medical_history"
                placeholder="Resumo do histórico médico"
                rows={3}
                {...form.register("medical_history")}
              />
              <FieldError errors={form.formState.errors.medical_history ? [form.formState.errors.medical_history] : undefined} />
            </FieldContent>
          </Field>
        </FieldGroup>
      </FieldSet>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : isCreate ? "Cadastrar" : "Salvar"}
        </Button>
      </div>
    </form>
  )
}
