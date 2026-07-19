"use client"

import { useRouter } from "next/navigation"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

const NEW_EXAM_REQUEST_PATH = "/dashboard/exam-requests/new"

type NewExamRequestLinkProps = {
  children: ReactNode
  className?: string
  templateId?: string
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">

/**
 * Client link that navigates to Novo pedido de exames with a unique _t param.
 * Ensures each visit gets a fresh wizard (no cached state).
 */
export function NewExamRequestLink({
  children,
  className,
  templateId,
  ...props
}: NewExamRequestLinkProps) {
  const router = useRouter()

  const baseHref =
    NEW_EXAM_REQUEST_PATH +
    (templateId ? "?templateId=" + encodeURIComponent(templateId) : "")

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault()
    const params = new URLSearchParams()
    params.set("_t", String(Date.now()))
    if (templateId) params.set("templateId", templateId)
    router.push(`${NEW_EXAM_REQUEST_PATH}?${params.toString()}`)
  }

  return (
    <a href={baseHref} onClick={handleClick} className={cn(className)} {...props}>
      {children}
    </a>
  )
}
