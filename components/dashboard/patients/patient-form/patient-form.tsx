"use client"

import { useRouter } from "next/navigation"
import {
  useForm,
  type FieldValues,
  type Resolver,
  type UseFormReturn,
} from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import { Button } from "@/components/ui/button"
import {
  createPatientSchema,
  updatePatientSchema,
  type CreatePatientFormData,
  type CreatePatientFormInput,
  type UpdatePatientFormData,
  type UpdatePatientFormInput,
} from "@/lib/schemas/patient"
import type { Patient } from "@/modules/patients/types"
import { createPatientAction, updatePatientAction } from "@/actions"
import {
  CREATE_PATIENT_DEFAULT_VALUES,
  buildEditPatientDefaultValues,
} from "./patient-form-defaults"
import { PatientFormClinicalSection } from "./patient-form-clinical-section"
import { PatientFormPersonalSection } from "./patient-form-personal-section"

type LooseForm = UseFormReturn<FieldValues>

export type PatientFormProps =
  | {
      mode: "create"
      patient?: never
      onUpdateSuccess?: never
    }
  | {
      mode: "edit"
      patient: Patient
      onUpdateSuccess?: () => void
      /** Signed URL (short-lived) resolvida no servidor para o avatar de edição; null cai nas iniciais. */
      photoUrl?: string | null
    }

export function PatientForm(props: PatientFormProps) {
  const router = useRouter()

  const createForm = useForm<CreatePatientFormInput>({
    mode: "onSubmit",
    reValidateMode: "onBlur",
    resolver: zodResolver(
      createPatientSchema,
    ) as Resolver<CreatePatientFormInput>,
    defaultValues: { ...CREATE_PATIENT_DEFAULT_VALUES },
  })

  const editForm = useForm<UpdatePatientFormInput>({
    mode: "onSubmit",
    reValidateMode: "onBlur",
    resolver: zodResolver(
      updatePatientSchema,
    ) as Resolver<UpdatePatientFormInput>,
    defaultValues:
      props.mode === "edit"
        ? buildEditPatientDefaultValues(props.patient)
        : undefined,
  })

  if (props.mode === "create") {
    const isSubmitting = createForm.formState.isSubmitting
    return (
      <form
        onSubmit={createForm.handleSubmit(async (data) => {
          const result = await createPatientAction(data as CreatePatientFormData)
          if (result.ok) {
            toast.success("Paciente cadastrado.")
            router.push(`/dashboard/patients/${result.patientId}`)
          } else {
            toast.error(getFriendlyToastMessage(result.error))
          }
        })}
        className="flex flex-col gap-8"
      >
        <PatientFormPersonalSection form={createForm as unknown as LooseForm} />
        <PatientFormClinicalSection form={createForm as unknown as LooseForm} />
        <div className="flex flex-wrap justify-end gap-3">
          <Button type="submit" disabled={isSubmitting} className="min-h-9">
            {isSubmitting ? "Salvando..." : "Cadastrar"}
          </Button>
        </div>
      </form>
    )
  }

  const isSubmitting = editForm.formState.isSubmitting
  return (
    <form
      onSubmit={editForm.handleSubmit(async (data) => {
        const result = await updatePatientAction(
          props.patient.id,
          data as UpdatePatientFormData,
        )
        if (result.ok) {
          toast.success("Paciente atualizado.")
          props.onUpdateSuccess?.()
        } else {
          toast.error(getFriendlyToastMessage(result.error))
        }
      })}
      className="flex flex-col gap-8"
    >
      <PatientFormPersonalSection
        form={editForm as unknown as LooseForm}
        photo={{
          patientId: props.patient.id,
          patientName: props.patient.name,
          initialPhotoUrl: props.photoUrl,
        }}
      />
      <PatientFormClinicalSection form={editForm as unknown as LooseForm} />
      <div className="flex flex-wrap justify-end gap-3">
        <Button type="submit" disabled={isSubmitting} className="min-h-9">
          {isSubmitting ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  )
}
