import Link from "next/link"
import { MessageCircleIcon } from "lucide-react"

import type { Tone } from "@/lib/admin-tasks"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

/** Cabeçalho das telas do admin, no padrão das listas da 2.0 (protótipo h1–h7). */
export function PageHero({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) {
  return (
    <section className="flex items-center gap-6 rounded-xl border border-primary-soft-border bg-highlight px-8 py-7 shadow-sm">
      <div className="min-w-0">
        <h1 className="font-display text-display font-semibold">{title}</h1>
        <p className="mt-1 text-muted-foreground">{subtitle}</p>
      </div>
      {action ? <div className="ml-auto flex items-center gap-2">{action}</div> : null}
    </section>
  )
}

/** Cartão do app com título, descrição e ação opcional à direita. */
export function PanelCard({
  title,
  description,
  action,
  className,
  bodyClassName,
  children,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
  bodyClassName?: string
  children: React.ReactNode
}) {
  return (
    <section className={cn("rounded-xl border border-border bg-card", className)}>
      <header className="flex items-start gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-section font-semibold">{title}</h2>
          {description ? <p className="text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </header>
      <div className={cn("px-5 py-4", bodyClassName)}>{children}</div>
    </section>
  )
}

/** Cartão de apoio (linha de baixo do Painel e do Uso): título pequeno e conteúdo direto. */
export function StatCard({
  title,
  description,
  action,
  children,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">{title}</h3>
          {description ? <p className="text-caption text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

/** Aba sublinhada que navega por URL (seções do admin, filtros das listas). */
export function LinkTab({
  href,
  active,
  count,
  warn,
  children,
}: {
  href: string
  active: boolean
  count?: number
  /** Número em selo amarelo: pede atenção. */
  warn?: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "-mb-px flex shrink-0 items-center gap-1.5 border-b-2 pb-2.5",
        active ? "border-foreground font-semibold" : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
      {count === undefined ? null : warn && count > 0 ? (
        <Badge variant="warning" className="h-5">
          {count}
        </Badge>
      ) : (
        <span className="num text-caption font-normal text-subtle-foreground">{count.toLocaleString("pt-BR")}</span>
      )}
    </Link>
  )
}

/** Chip de filtro rápido (Funil): preto quando ligado. */
export function FilterChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-full border px-3 text-label transition-colors",
        active ? "border-foreground bg-foreground text-background" : "border-border bg-card hover:bg-accent",
      )}
    >
      {children}
    </Link>
  )
}

const BADGE_VARIANT = {
  green: "success",
  blue: "default",
  amber: "warning",
  red: "destructive",
  gray: "secondary",
} as const satisfies Record<Tone, string>

/** Selo de status com os papéis do guia (verde, azul, amarelo, vermelho, neutro). */
export function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <Badge variant={BADGE_VARIANT[tone]}>{children}</Badge>
}

/** Avatar redondo de iniciais (azul para conta, cinza para quem ainda não é cliente). */
export function Initials({ name, dim, className }: { name: string; dim?: boolean; className?: string }) {
  const parts = name.replace(/^(dra?\.)\s+/i, "").trim().split(/\s+/).filter(Boolean)
  const initials = parts.length > 1 ? `${parts[0][0]}${parts.at(-1)![0]}` : (parts[0] ?? "?").slice(0, 2)
  return (
    <span
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-full text-label font-semibold uppercase",
        dim ? "bg-muted text-muted-foreground" : "bg-primary-soft text-primary-ink-strong",
        className,
      )}
      aria-hidden
    >
      {initials}
    </span>
  )
}

/** Ícone do WhatsApp no verde da marca: o botão segue o do app, só o ícone diz o canal. */
export function WhatsappIcon({ className }: { className?: string }) {
  return <MessageCircleIcon className={cn("text-[#1faa59]", className)} aria-hidden />
}
