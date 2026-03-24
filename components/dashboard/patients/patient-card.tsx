"use client"

import Link from "next/link"
import { ChevronRightIcon, PhoneIcon, UserIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDate, formatBrazilianPhone } from "@/lib/formatters"
import type { Patient } from "@/modules/patients/types"
import { Button } from "@/components/ui/button"

export function PatientCard({ patient }: { patient: Patient }) {
  return (
    <div
      className={cn(
        "group relative block rounded-xl border border-border/60 bg-card px-5 py-4 transition-all duration-200",
        "hover:border-border hover:bg-accent/30 hover:shadow-md"
      )}
    >
      <Link
        href={`/dashboard/patients/${patient.id}`}
        className={cn(
          "block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-[inherit]"
        )}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-lg font-semibold tracking-tight">
              {patient.name}
            </h3>
            {patient.responsible && (
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                <UserIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{patient.responsible}</span>
              </p>
            )}
          </div>
          <ChevronRightIcon className="h-5 w-5 shrink-0 text-muted-foreground/40 transition-all duration-200 group-hover:translate-x-1 group-hover:text-muted-foreground" />
        </div>

        {patient.birth_date && (
          <p className="mt-1 text-xs text-muted-foreground/80">
            Nasc.: {formatDate(patient.birth_date)}
          </p>
        )}
      </Link>

      {patient.contact_phone && (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
          <PhoneIcon className="h-3.5 w-3.5 shrink-0" />
          <a
            href={`tel:${patient.contact_phone}`}
            className="hover:text-foreground transition-colors"
          >
            {formatBrazilianPhone(patient.contact_phone)}
          </a>
        </p>
      )}

      <div className="mt-3">
        <Button asChild size="sm" variant="outline" className="w-full">
          <Link href={`/dashboard/cases/select-patient?patientId=${patient.id}`}>
            Abrir novo caso
          </Link>
        </Button>
      </div>
    </div>
  )
}
