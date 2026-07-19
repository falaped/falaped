"use client"

import { useRouter } from "next/navigation"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

const NEW_MEDICAL_REPORT_PATH = "/dashboard/medical-reports/new"

type NewMedicalReportLinkProps = {
  children: ReactNode
  className?: string
  templateId?: string
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">

/**
 * Client link that navigates to Novo relatório with a unique _t param.
 * Ensures each visit gets a fresh wizard (no cached state).
 */
export function NewMedicalReportLink({
  children,
  className,
  templateId,
  ...props
}: NewMedicalReportLinkProps) {
  const router = useRouter()

  const baseHref =
    NEW_MEDICAL_REPORT_PATH +
    (templateId ? "?templateId=" + encodeURIComponent(templateId) : "")

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault()
    const params = new URLSearchParams()
    params.set("_t", String(Date.now()))
    if (templateId) params.set("templateId", templateId)
    router.push(`${NEW_MEDICAL_REPORT_PATH}?${params.toString()}`)
  }

  return (
    <a href={baseHref} onClick={handleClick} className={cn(className)} {...props}>
      {children}
    </a>
  )
}
