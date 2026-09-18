import { Suspense } from "react"

import { LeadWizard } from "@/components/books/lp/lead-wizard"
import { getBookLeadId } from "@/lib/book-lead-cookie"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { COVER_INDEX } from "@/modules/books/constants"
import { getLeadBook } from "@/modules/books/get-lead-book"
import { BOOK_THEMES } from "@/modules/books/themes"

/** Lê o cookie do lead e retoma o wizard de onde ele parou (uma capa por pessoa). */
async function LeadWizardLoader() {
  const themes = Object.values(BOOK_THEMES).map((t) => ({ slug: t.slug, label: t.label, hint: t.subtitle, title: t.title }))
  const leadId = await getBookLeadId()
  const ctx = leadId ? await getLeadBook(createAdminClient(), leadId).catch(() => null) : null
  const cover = ctx?.book?.pages.find((p) => p.index === COVER_INDEX)
  return (
    <LeadWizard
      themes={themes}
      initial={{
        lead: ctx ? { firstName: ctx.lead.first_name, coupon: ctx.lead.coupon, status: ctx.lead.status } : null,
        book: ctx?.book ? { id: ctx.book.id, childName: ctx.book.child_name, theme: ctx.book.theme, coverStatus: cover?.status ?? null } : null,
        coverUrl: ctx?.coverUrl ?? null,
      }}
    />
  )
}

export default function CreateLeadBookPage() {
  return (
    <Suspense fallback={<div className="mx-auto mt-10 h-[520px] max-w-[800px] animate-pulse rounded-[20px] border-2 border-ink bg-white/70 sm:mt-14" />}>
      <LeadWizardLoader />
    </Suspense>
  )
}
