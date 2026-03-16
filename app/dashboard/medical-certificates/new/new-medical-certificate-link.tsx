"use client"

import { useRouter } from "next/navigation"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

const NEW_MEDICAL_CERTIFICATE_PATH = "/dashboard/medical-certificates/new"

type NewMedicalCertificateLinkProps = {
  children: ReactNode
  className?: string
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">

/**
 * Client link that navigates to Novo atestado with a unique _t param.
 * Ensures each visit gets a fresh wizard (no cached state).
 */
export function NewMedicalCertificateLink({
  children,
  className,
  ...props
}: NewMedicalCertificateLinkProps) {
  const router = useRouter()

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault()
    const params = new URLSearchParams()
    params.set("_t", String(Date.now()))
    router.push(`${NEW_MEDICAL_CERTIFICATE_PATH}?${params.toString()}`)
  }

  return (
    <a
      href={NEW_MEDICAL_CERTIFICATE_PATH}
      className={cn(className)}
      onClick={handleClick}
      {...props}
    >
      {children}
    </a>
  )
}
