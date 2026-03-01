"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CasePatientPickerSheet } from "@/components/dashboard/cases/case-patient-picker-sheet"
import type { Patient } from "@/modules/patients/types"
import { UserPlusIcon, RefreshCwIcon } from "lucide-react"

type CasePatientPickerTriggerProps = {
  caseId: string
  patients: Patient[]
  hasPatient: boolean
}

export function CasePatientPickerTrigger({
  caseId,
  patients,
  hasPatient,
}: CasePatientPickerTriggerProps) {
  const [open, setOpen] = useState(false)
  const mode = hasPatient ? "replace" : "associate"

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setOpen(true)}
      >
        {hasPatient ? (
          <>
            <RefreshCwIcon className="h-4 w-4" />
            Trocar paciente
          </>
        ) : (
          <>
            <UserPlusIcon className="h-4 w-4" />
            Associar paciente
          </>
        )}
      </Button>
      <CasePatientPickerSheet
        caseId={caseId}
        patients={patients}
        mode={mode}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}
