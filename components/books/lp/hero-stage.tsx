"use client"

import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"

import { Sticker } from "@/components/books/books-ui"
import { LP_WRAP, Orn } from "@/components/books/lp/lp-ui"

/** Capas reais de livros do Samuel (consentimento dos pais). A primeira fica na frente. */
const COVERS = [
  { src: "/books/samples/dentes-capa.jpg", alt: "Capa do livro O Sorriso do Samuel" },
  { src: "/books/samples/cama-capa.jpg", alt: "Capa do livro A Cama do Samuel" },
  { src: "/books/samples/comer-capa.jpg", alt: "Capa do livro O Arco-íris do Samuel" },
]

/** Coreografia da entrada, em ms desde o load. A grade e os ornamentos são só CSS. */
const PHASES = [
  ["rise", 200], // a câmera começa a afastar do close na capa
  ["fan", 1100], // abre o leque, o primeiro da esquerda na frente
  ["stack", 2700], // fecha e repousa no centro
  ["split", 3100], // vira um leque pequeno à direita e o texto entra à esquerda
] as const

type Phase = "boot" | (typeof PHASES)[number][0]

/**
 * Hero da landing: a grade desenha, os ornamentos aparecem nas laterais, o livro
 * entra em close no centro, a câmera afasta, o leque abre e desliza para a
 * direita enquanto o texto (children) entra à esquerda. O header vem no fim.
 */
export function HeroStage({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>("boot")

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase("split")
      return
    }
    const t = PHASES.map(([name, at]) => setTimeout(() => setPhase(name), at))
    return () => t.forEach(clearTimeout)
  }, [])

  return (
    <section
      className={cn(LP_WRAP, "hero-boot relative grid min-h-[calc(100svh-4rem)] items-center gap-10 overflow-x-clip py-10 sm:min-h-[calc(100svh-5rem)] lg:grid-cols-[1.04fr_.96fr]")}
      data-phase={phase}
    >
      <div className="hero-orns pointer-events-none absolute inset-0" aria-hidden>
        <span className="hero-orn absolute left-[2%] top-[16%]">
          <Orn kind="star" color="#f5c21a" />
        </span>
        <span className="hero-orn absolute left-[5%] top-[48%]">
          <Orn kind="ring" color="#f5c4b8" />
        </span>
        <span className="hero-orn absolute bottom-[18%] left-[2.5%]">
          <Orn kind="plus" color="#b8e0f5" />
        </span>
        <span className="hero-orn absolute right-[2%] top-[15%]">
          <Orn kind="ring" color="#b8e0f5" />
        </span>
        <span className="hero-orn absolute right-[5%] top-[50%]">
          <Orn kind="plus" color="#f5c21a" />
        </span>
        <span className="hero-orn absolute bottom-[20%] right-[2.5%]">
          <Orn kind="star" color="#f5c4b8" />
        </span>
      </div>

      <div className="hero-copy order-2 lg:order-1">{children}</div>

      <div className="hero-stage relative order-1 flex justify-center lg:order-2 lg:justify-end">
        <div className="hero-glow pointer-events-none absolute inset-[-10%_-6%]" aria-hidden />
        <div className="hero-travel relative w-[min(580px,90vw)]">
          <div className="hero-fan w-full">
            {COVERS.map((c) => (
              <div key={c.src} className="hero-cover">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.src} alt={c.alt} />
              </div>
            ))}
          </div>
          <Sticker className="hero-tag pointer-events-none absolute left-[-10%] top-[4%] z-30 -rotate-6 bg-warning">Livros reais</Sticker>
          <span className="hero-tag pointer-events-none absolute -bottom-3 right-[-8%] z-30 rounded-full border-2 border-ink bg-warning px-4 py-2 text-[12.5px] font-extrabold uppercase tracking-[.04em] shadow-hard-sm">
            20 páginas cada
          </span>
        </div>
      </div>
    </section>
  )
}
