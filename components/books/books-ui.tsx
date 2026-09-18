import type { ComponentProps, ReactNode } from "react"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

/** Pares de cores das listras dos cartões de tema (ciclo por índice). */
export const TINTS = [
  ["#e1f1fa", "#cfe8f6"],
  ["#fbe4de", "#f5c4b8"],
  ["#fdf1c2", "#f9e39a"],
  ["#e1f3e6", "#cdebd3"],
]

/** Classes dos formulários do handoff (campo, rótulo, ajuda). */
export const FIELD = "h-[50px] w-full rounded-xl border-2 border-ink bg-white px-4 text-base font-medium text-ink outline-none focus:shadow-[0_0_0_4px_#b8e0f5]"
export const LABEL = "font-display text-[15px] font-extrabold"
export const HELP = "text-[12.5px] font-normal text-muted-foreground"

export type BkButtonVariant = "primary" | "secondary" | "warning" | "destructive" | "icon" | "icon-destructive"

const LIFT =
  "shadow-hard transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"

const VARIANTS: Record<BkButtonVariant, string> = {
  primary: `bg-primary ${LIFT}`,
  secondary: "bg-white hover:bg-muted transition-colors",
  warning: `bg-warning ${LIFT}`,
  destructive: `bg-destructive ${LIFT}`,
  icon: "size-12 p-0 bg-white hover:bg-warning hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard transition-[transform,box-shadow,background-color] duration-100",
  "icon-destructive":
    "size-12 p-0 bg-white text-danger-text hover:bg-destructive hover:text-ink hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard transition-[transform,box-shadow,background-color] duration-100",
}

/** Classes do botão do handoff (pílula, borda 2px, sombra dura). Use em <Link> quando não for <button>. */
export function bkButton(variant: BkButtonVariant = "primary", className?: string) {
  return cn(
    "inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full border-2 border-ink px-5 text-sm font-bold text-ink outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-warning",
    VARIANTS[variant],
    className,
  )
}

type BkButtonProps = ComponentProps<"button"> & {
  variant?: BkButtonVariant
  /** Operação em andamento: fundo branco, spinner e cursor progress. */
  busy?: boolean
  busyLabel?: ReactNode
}

export function BkButton({ variant = "primary", busy, busyLabel, disabled, className, children, ...props }: BkButtonProps) {
  if (busy)
    return (
      <button
        type="button"
        disabled
        className={cn(bkButton(variant, className), "cursor-progress border-solid bg-white text-ink shadow-none hover:translate-0 hover:shadow-none")}
        {...props}
      >
        <Loader2 className="size-4 animate-spin" aria-hidden />
        {busyLabel ?? children}
      </button>
    )
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        bkButton(variant, className),
        disabled && "pointer-events-none cursor-not-allowed border-dashed bg-transparent text-ink opacity-45 shadow-none",
      )}
      {...props}
    >
      {children}
    </button>
  )
}

/** Adesivo inclinado (badge de status, "Books", "Passo 1/3"). */
export function Sticker({ className, children, ...props }: ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap rounded-lg border-2 border-ink bg-white px-2.5 py-[7px] font-display text-xs font-extrabold uppercase leading-none tracking-[.05em] text-ink shadow-hard-sm -rotate-3",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}

/** Pílula informativa (contadores, avisos curtos). */
export function Chip({ className, children, ...props }: ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border-2 border-ink bg-white px-2.5 py-1 text-[12.5px] font-bold text-ink",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}

/** Mancha desfocada nas cores da marca: placeholder de carregamento (blur-up). */
export function BrandBlur({ className, pulse }: { className?: string; pulse?: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        "absolute inset-0 scale-[1.3] bg-accent blur-2xl",
        "bg-[radial-gradient(circle_at_30%_30%,#b8e0f5_0_28%,transparent_60%),radial-gradient(circle_at_75%_68%,#f5c4b8_0_24%,transparent_55%),radial-gradient(circle_at_50%_95%,#f5c21a_0_12%,transparent_40%)]",
        pulse && "animate-pulse",
        className,
      )}
    />
  )
}
