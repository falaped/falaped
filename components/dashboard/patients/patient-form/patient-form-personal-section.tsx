"use client"

import type { FieldValues, UseFormReturn } from "react-hook-form"

import { Input } from "@/components/ui/input"
import { PhoneInput } from "@/components/ui/phone-input"
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field"
import { PATIENT_SEX_FORM_OPTIONS } from "@/modules/patients/patient-sex"
import { PatientControlledSelectField } from "./patient-controlled-select-field"
import { PatientFormBirthDateField } from "./patient-form-birth-date-field"

export function PatientFormPersonalSection({
  form,
}: {
  form: UseFormReturn<FieldValues>
}) {
  const contactPhone = form.watch("contact_phone") ?? ""

  return (
    <FieldSet>
      <FieldLegend variant="legend">Identificação e contato</FieldLegend>
      <FieldGroup className="mt-4 gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-4">
          <Field className="min-w-0 w-full flex-1 md:min-w-[10rem]">
            <FieldLabel htmlFor="patient-name">Nome do paciente</FieldLabel>
            <FieldContent>
              <Input
                id="patient-name"
                placeholder="Nome do paciente"
                {...form.register("name")}
              />
              <FieldError
                errors={
                  form.formState.errors.name
                    ? [form.formState.errors.name]
                    : undefined
                }
              />
            </FieldContent>
          </Field>
          <PatientFormBirthDateField
            form={form}
            name="birth_date"
            error={form.formState.errors.birth_date}
          />
          <PatientControlledSelectField
            form={form}
            name="sex"
            id="patient-sex"
            label="Sexo"
            options={PATIENT_SEX_FORM_OPTIONS}
            error={form.formState.errors.sex}
            className="w-full shrink-0 md:w-[12rem] md:max-w-[14rem]"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-4">
          <Field className="min-w-0">
            <FieldLabel htmlFor="patient-responsible">
              Nome completo do responsável
            </FieldLabel>
            <FieldContent>
              <Input
                id="patient-responsible"
                placeholder="Ex.: Maria Silva"
                {...form.register("responsible")}
              />
              <FieldError
                errors={
                  form.formState.errors.responsible
                    ? [form.formState.errors.responsible]
                    : undefined
                }
              />
            </FieldContent>
          </Field>
          <Field className="min-w-0">
            <FieldLabel htmlFor="patient-legal_guardian">
              Responsável legal (se diferente)
            </FieldLabel>
            <FieldContent>
              <Input
                id="patient-legal_guardian"
                placeholder="Opcional"
                {...form.register("legal_guardian")}
              />
              <FieldError
                errors={
                  form.formState.errors.legal_guardian
                    ? [form.formState.errors.legal_guardian]
                    : undefined
                }
              />
            </FieldContent>
          </Field>
          <Field className="min-w-0">
            <FieldLabel htmlFor="patient-contact_phone">
              Telefone de contato
            </FieldLabel>
            <FieldContent>
              <PhoneInput
                id="patient-contact_phone"
                value={contactPhone}
                onChange={(v) =>
                  form.setValue("contact_phone", v, { shouldValidate: true })
                }
              />
              <FieldError
                errors={
                  form.formState.errors.contact_phone
                    ? [form.formState.errors.contact_phone]
                    : undefined
                }
              />
            </FieldContent>
          </Field>
        </div>
      </FieldGroup>
    </FieldSet>
  )
}
