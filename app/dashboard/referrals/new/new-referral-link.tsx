"use client"

import { useRouter } from "next/navigation"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

const NEW_REFERRAL_PATH = "/dashboard/referrals/new"

type NewReferralLinkProps = {
  children: ReactNode
  className?: string
  templateId?: string
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">

/**
 * Client link that navigates to Novo encaminhamento with a unique _t param.
 * Ensures each visit gets a fresh wizard (no cached state).
 */
export function NewReferralLink({
  children,
  className,
  templateId,
  ...props
}: NewReferralLinkProps) {
  const router = useRouter()

  const baseHref =
    NEW_REFERRAL_PATH +
    (templateId ? "?templateId=" + encodeURIComponent(templateId) : "")

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault()
    const params = new URLSearchParams()
    params.set("_t", String(Date.now()))
    if (templateId) params.set("templateId", templateId)
    router.push(`${NEW_REFERRAL_PATH}?${params.toString()}`)
  }

  return (
    <a href={baseHref} onClick={handleClick} className={cn(className)} {...props}>
      {children}
    </a>
  )
}
