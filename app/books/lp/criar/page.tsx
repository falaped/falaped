import { Suspense } from "react"

import { LeadWizard } from "@/components/books/lp/lead-wizard"
import { getBookLeadId } from "@/lib/book-lead-cookie"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { getLeadBooks } from "@/modules/books/get-lead-books"
import { BOOK_THEMES } from "@/modules/books/themes"

/** Lê o cookie do lead e retoma o wizard de onde ele parou, com as capas já criadas. */
async function LeadWizardLoader() {
  const themes = Object.values(BOOK_THEMES).map((t) => ({ slug: t.slug, label: t.label, hint: t.subtitle, title: t.title }))
  const leadId = await getBookLeadId()
  const ctx = leadId ? await getLeadBooks(createAdminClient(), leadId).catch(() => null) : null
  return (
    <LeadWizard
      themes={themes}
      initial={{
        lead: ctx ? { firstName: ctx.lead.first_name, coupon: ctx.lead.coupon, status: ctx.lead.status } : null,
        books: (ctx?.books ?? []).map(({ book, coverUrl }) => ({
          id: book.id,
          childName: book.child_name,
          childGender: book.child_gender,
          theme: book.theme,
          dedication: book.dedication,
          paid: !!book.paid_at,
          coverUrl,
        })),
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
