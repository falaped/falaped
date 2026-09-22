"use client"

import * as React from "react"
import { BookHeartIcon, GlobeIcon, MessageCircleIcon } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatBrazilianPhone, formatDateTime, formatRelativeTime } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import type { LeadOrigin, LeadRow } from "@/modules/admin/list-leads"

export const ORIGIN_META: Record<
  LeadOrigin,
  { label: string; icon: LucideIcon; accent: string }
> = {
  site: { label: "Landing", icon: GlobeIcon, accent: "bg-primary/15 text-primary" },
  books: {
    label: "Livros",
    icon: BookHeartIcon,
    accent: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
  whatsapp: {
    label: "WhatsApp",
    icon: MessageCircleIcon,
    accent: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  },
}

const FILTERS: { value: LeadOrigin | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "site", label: "Landing" },
  { value: "books", label: "Livros" },
  { value: "whatsapp", label: "WhatsApp" },
]

/** WhatsApp guardado só como dígitos; o da landing pode vir já formatado pelo formulário. */
function displayPhone(phone: string | null): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, "")
  return digits.length === 10 || digits.length === 11
    ? formatBrazilianPhone(digits)
    : phone
}

export function AdminLeadsGrid({ leads }: { leads: LeadRow[] }) {
  const [origin, setOrigin] = React.useState<LeadOrigin | "all">("all")
  const [selected, setSelected] = React.useState<LeadRow | null>(null)

  const visible = origin === "all" ? leads : leads.filter((lead) => lead.origin === origin)

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const count =
            filter.value === "all"
              ? leads.length
              : leads.filter((lead) => lead.origin === filter.value).length
          return (
            <Button
              key={filter.value}
              size="sm"
              variant={origin === filter.value ? "default" : "outline"}
              onClick={() => setOrigin(filter.value)}
            >
              {filter.label}
              <span className="ml-1.5 tabular-nums opacity-70">{count}</span>
            </Button>
          )
        })}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm font-medium">Nenhum lead nesta origem.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Os cadastros aparecem aqui assim que chegam.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((lead) => {
            const meta = ORIGIN_META[lead.origin]
            const Icon = meta.icon
            const phone = displayPhone(lead.phone)

            return (
              <Card
                key={`${lead.origin}-${lead.id}`}
                role="button"
                tabIndex={0}
                onClick={() => setSelected(lead)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    setSelected(lead)
                  }
                }}
                className={cn(
                  "cursor-pointer gap-0 py-0 transition-all hover:bg-primary/5 hover:ring-2 hover:ring-primary",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                )}
              >
                <CardContent className="flex items-start gap-3 p-4">
                  <div
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full",
                      meta.accent,
                    )}
                    aria-hidden
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium leading-tight">
                      {lead.name || phone || "Sem nome"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {lead.email || phone || "sem contato"}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline">{meta.label}</Badge>
                      {lead.detail ? (
                        <span className="truncate text-xs text-muted-foreground">
                          {lead.detail}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs whitespace-nowrap text-muted-foreground">
                    {formatRelativeTime(lead.created_at)}
                  </span>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selected.name || displayPhone(selected.phone) || "Lead sem nome"}
                </DialogTitle>
                <DialogDescription>
                  Veio de {ORIGIN_META[selected.origin].label.toLowerCase()} em{" "}
                  {formatDateTime(selected.created_at)}
                </DialogDescription>
              </DialogHeader>

              <dl className="grid gap-3 text-sm">
                {[
                  { label: "E-mail", value: selected.email },
                  { label: "WhatsApp", value: displayPhone(selected.phone) },
                  { label: "Detalhe", value: selected.detail },
                ].map((field) => (
                  <div key={field.label}>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                      {field.label}
                    </dt>
                    <dd className="mt-0.5 wrap-break-word">{field.value || "—"}</dd>
                  </div>
                ))}
              </dl>

              {selected.phone ? (
                <Button asChild className="w-full">
                  <a
                    href={`https://wa.me/${selected.phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir conversa no WhatsApp
                  </a>
                </Button>
              ) : null}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
