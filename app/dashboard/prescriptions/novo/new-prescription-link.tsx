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

  const href =
    NEW_PRESCRIPTION_PATH +
    "?_t=" +
    Date.now() +
    (templateId ? "&templateId=" + encodeURIComponent(templateId) : "")

  return (
    <a
      href={href}
      className={cn(className)}
      onClick={(e) => {
        e.preventDefault()
        router.push(href)
      }}
      {...props}
    >
      {children}
    </a>
  )
}
