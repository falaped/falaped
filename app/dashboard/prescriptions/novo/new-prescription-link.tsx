"use client"

import { useRouter } from "next/navigation"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

const NEW_PRESCRIPTION_PATH = "/dashboard/prescriptions/novo"

type NewPrescriptionLinkProps = {
  children: ReactNode
  className?: string
  templateId?: string
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">

/**
 * Client link that navigates to Nova receita with a unique _t param.
 * Ensures each visit gets a fresh wizard (no cached state).
 */
export function NewPrescriptionLink({
  children,
  className,
  templateId,
  ...props
}: NewPrescriptionLinkProps) {
  const router = useRouter()

  const baseHref =
    NEW_PRESCRIPTION_PATH +
    (templateId ? "?templateId=" + encodeURIComponent(templateId) : "")

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault()
    const params = new URLSearchParams()
    params.set("_t", String(Date.now()))
    if (templateId) params.set("templateId", templateId)
    router.push(`${NEW_PRESCRIPTION_PATH}?${params.toString()}`)
  }

  return (
    <a
      href={baseHref}
      className={cn(className)}
      onClick={handleClick}
      {...props}
    >
      {children}
    </a>
  )
}
