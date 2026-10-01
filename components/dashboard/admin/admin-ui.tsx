import type { LucideIcon } from "lucide-react"

import type { Tone } from "@/lib/admin-tasks"
import { cn } from "@/lib/utils"

/**
 * Peças visuais do admin: card com gradiente da marca, card com ícone, pílula de status.
 * O gradiente sai do canto superior esquerdo e cobre o card inteiro.
 */
const GRADIENT = {
  blue: "bg-[radial-gradient(120%_140%_at_0%_0%,color-mix(in_oklab,var(--primary)_32%,transparent),color-mix(in_oklab,var(--primary)_10%,transparent)_45%,var(--card)_75%)] ring-primary/45",
  amber:
    "bg-[radial-gradient(120%_160%_at_0%_0%,rgb(245_158_11/0.22),rgb(245_158_11/0.07)_45%,var(--card)_75%)] ring-amber-300/70 dark:ring-amber-500/40",
} as const

export function GradientCard({
  tone = "blue",
  className,
  children,
}: {
  tone?: keyof typeof GRADIENT
  className?: string
  children: React.ReactNode
}) {
  return <div className={cn("rounded-2xl shadow-xs ring-1", GRADIENT[tone], className)}>{children}</div>
}

/** Título da página dentro do card com gradiente: linha de contexto, título e resumo. */
export function PageHero({ context, title, children }: { context: string; title: string; children?: React.ReactNode }) {
  return (
    <GradientCard className="px-7 py-6">
      <p className="mb-1.5 text-sm font-medium text-primary-ink">{context}</p>
      <h1 className="text-[28px] font-semibold leading-tight tracking-tight">{title}</h1>
      {children ? <p className="mt-1.5 max-w-[64ch] text-[15px] text-muted-foreground">{children}</p> : null}
    </GradientCard>
  )
}

export function IconChip({ icon: Icon, tone = "blue" }: { icon: LucideIcon; tone?: "blue" | "amber" }) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg",
        tone === "blue" ? "bg-primary/12 text-primary-ink" : "bg-amber-500/12 text-amber-700 dark:text-amber-400",
      )}
    >
      <Icon className="size-4" aria-hidden />
    </span>
  )
}

/** Card branco do app com cabeçalho de ícone + título + descrição e ação opcional à direita. */
export function PanelCard({
  icon,
  iconTone,
  title,
  description,
  action,
  className,
  bodyClassName,
  children,
}: {
  icon: LucideIcon
  iconTone?: "blue" | "amber"
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
  bodyClassName?: string
  children: React.ReactNode
}) {
  return (
    <section className={cn("rounded-2xl bg-card shadow-xs ring-1 ring-foreground/10", className)}>
      <header className="flex items-center gap-3 px-5 pt-5 pb-4">
        <IconChip icon={icon} tone={iconTone} />
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold leading-tight">{title}</h2>
          {description ? <p className="text-[13px] text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </header>
      <div className={cn("px-5 pb-5", bodyClassName)}>{children}</div>
    </section>
  )
}

const PILL_TONE: Record<Tone, string> = {
  green: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
  blue: "bg-primary/15 text-primary-ink",
  amber: "bg-amber-500/14 text-amber-700 dark:text-amber-400",
  red: "bg-orange-600/12 text-orange-700 dark:text-orange-400",
  gray: "bg-muted text-muted-foreground",
}

export function Pill({ tone, dot = true, children }: { tone: Tone; dot?: boolean; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", PILL_TONE[tone])}>
      {dot ? <span className="size-1.5 rounded-full bg-current" aria-hidden /> : null}
      {children}
    </span>
  )
}

/** Avatar de iniciais em quadrado arredondado (azul para conta, cinza para quem ainda não é cliente). */
export function Initials({ name, dim, className }: { name: string; dim?: boolean; className?: string }) {
  const parts = name.replace(/^(dra?\.)\s+/i, "").trim().split(/\s+/).filter(Boolean)
  const initials = parts.length > 1 ? `${parts[0][0]}${parts.at(-1)![0]}` : (parts[0] ?? "?").slice(0, 2)
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-[10px] text-[13px] font-semibold uppercase",
        dim ? "bg-muted text-muted-foreground" : "bg-primary/12 text-primary-ink",
        className,
      )}
      aria-hidden
    >
      {initials}
    </span>
  )
}

/** Verde do WhatsApp: reconhecível de longe, usado só na ação principal. */
export const WHATSAPP_BUTTON = "bg-[#1faa59] text-white hover:bg-[#18934c] [a]:hover:bg-[#18934c]"
