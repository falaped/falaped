"use client"

import { useEffect, useState } from "react"

import { Sticker } from "@/components/books/books-ui"
import { Orn } from "@/components/books/lp/lp-ui"

/** Capas reais de livros do Samuel (consentimento dos pais). A do meio fica na frente. */
const COVERS = [
  { src: "/books/samples/dentes-capa.jpg", alt: "Capa do livro O Sorriso do Samuel" },
  { src: "/books/samples/cama-capa.jpg", alt: "Capa do livro A Cama do Samuel" },
  { src: "/books/samples/comer-capa.jpg", alt: "Capa do livro O Arco-íris do Samuel" },
]
/** O leque abre enquanto ele ainda escorrega para a direita. */
const OPEN_AT = 1150
const COPY_AT = 950

/**
 * Hero da landing: texto à esquerda (children) e o leque de capas à direita.
 * O leque sobe de baixo no centro, escorrega para a direita e abre; passar o
 * mouse em uma capa levanta ela.
 */
export function HeroStage({ children }: { children: React.ReactNode }) {
  const [copyIn, setCopyIn] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCopyIn(true)
      setOpen(true)
      return
    }
    const t = [setTimeout(() => setCopyIn(true), COPY_AT), setTimeout(() => setOpen(true), OPEN_AT)]
    return () => t.forEach(clearTimeout)
  }, [])

  return (
    <section className="relative mx-auto grid min-h-[calc(100svh-4rem)] overflow-x-clip max-w-[1280px] items-center gap-10 px-4 py-10 sm:min-h-[calc(100svh-5rem)] sm:px-10 lg:grid-cols-[1.04fr_.96fr]">
      <Orn kind="star" color="#f5c21a" className="left-0 top-12 hidden lg:block" />
      <Orn kind="plus" color="#b8e0f5" className="bottom-16 left-[2%] hidden lg:block" />
      <Orn kind="ring" color="#f5c4b8" className="bottom-24 right-2 hidden lg:block" />

      <div className="hero-copy order-2 lg:order-1" data-in={copyIn}>
        {children}
      </div>

      <div className="hero-stage relative order-1 flex justify-center lg:order-2 lg:justify-end" data-animate="true">
        <div className="hero-glow pointer-events-none absolute inset-[-10%_-6%]" aria-hidden />
        <div className="relative w-[min(450px,88vw)]">
          <div className="hero-fan w-full" data-open={open}>
            {COVERS.map((c) => (
              <div key={c.src} className="hero-cover">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.src} alt={c.alt} />
              </div>
            ))}
          </div>
          <Sticker className="pointer-events-none absolute left-[-14%] top-[10%] z-30 -rotate-6 bg-warning">Livros reais</Sticker>
          <span className="pointer-events-none absolute -bottom-2 right-[-10%] z-30 rounded-full border-2 border-ink bg-warning px-4 py-2 text-[12.5px] font-extrabold uppercase tracking-[.04em] shadow-hard-sm">
            20 páginas cada
          </span>
        </div>
      </div>
    </section>
  )
}
