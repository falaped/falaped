import Image from "next/image"
import Link from "next/link"
import type { ComponentProps } from "react"

import { Sticker } from "@/components/books/books-ui"
import { cn } from "@/lib/utils"

/** Coluna da landing: hero, seções, header e rodapé usam a mesma largura e as mesmas margens. */
export const LP_WRAP = "mx-auto w-full max-w-[1480px] px-6 sm:px-10 xl:px-[6.5rem]"

/** Logo principal (empilhada) + adesivo Books. Link para a landing. */
export function LpBrand({ className, small }: { className?: string; small?: boolean }) {
  return (
    <Link href="/books/lp" className={cn("inline-flex items-center gap-3 text-ink no-underline", className)}>
      <Image src="/falaped-logo.svg" alt="Falaped" width={397} height={272} priority className={small ? "h-10 w-auto" : "h-14 w-auto sm:h-16"} />
      <Sticker className={cn("-rotate-4 bg-warning", small ? "px-2 py-1.5 text-[10px]" : "text-xs")}>Books</Sticker>
    </Link>
  )
}

/** Ornamentos dos cantos dos cartões de título (estrela, anel, cruz) — mesmos dos criativos. */
export function Orn({ kind, color, className }: { kind: "star" | "ring" | "plus"; color: string; className?: string }) {
  if (kind === "star")
    return (
      <span
        aria-hidden
        className={cn("orn-star pointer-events-none absolute select-none text-5xl leading-none", className)}
        style={{ color, WebkitTextStroke: "3px #17171a", paintOrder: "stroke fill" }}
      >
        ✦
      </span>
    )
  if (kind === "ring")
    return <span aria-hidden className={cn("orn-ring pointer-events-none absolute size-9 rounded-full border-[5px] border-ink shadow-hard-sm", className)} style={{ background: color }} />
  return (
    <span aria-hidden className={cn("orn-plus pointer-events-none absolute size-10 rotate-6", className)}>
      <span className="absolute left-[15px] top-0 h-10 w-2.5 rounded-sm border-2 border-ink" style={{ background: color }} />
      <span className="absolute left-0 top-[15px] h-2.5 w-10 rounded-sm border-2 border-ink" style={{ background: color }} />
    </span>
  )
}

/** Cartão branco com borda e sombra dura. */
export function LpCard({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("relative rounded-[22px] border-[3px] border-ink bg-white shadow-hard-xl", className)} {...props} />
}

/** Título de seção em caixa alta com uma palavra marcada. */
export function LpTitle({ text, highlight, marker = "#f5c21a", className, as: Tag = "h2" }: { text: string; highlight?: string; marker?: string; className?: string; as?: "h1" | "h2" }) {
  const i = highlight ? text.indexOf(highlight) : -1
  return (
    <Tag className={cn("font-display font-extrabold uppercase leading-[0.98] tracking-[-.03em] text-balance", className)}>
      {i >= 0 ? (
        <>
          {text.slice(0, i)}
          <span className="bk-marker" style={{ "--marker": marker } as React.CSSProperties}>
            {highlight}
          </span>
          {text.slice(i + highlight!.length)}
        </>
      ) : (
        text
      )}
    </Tag>
  )
}
