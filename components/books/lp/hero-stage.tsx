"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"

import { Sticker } from "@/components/books/books-ui"
import { Orn } from "@/components/books/lp/lp-ui"

/** Páginas do livro real do Samuel (consentimento dos pais) usadas na animação do hero. */
const PAGES = ["/books/samples/cama/0.jpg", "/books/samples/cama/4.jpg", "/books/samples/cama/7.jpg", "/books/samples/cama/11.jpg", "/books/samples/cama/15.jpg", "/books/samples/cama/18.jpg"]

/** Coreografia de entrada: folha virada em cada tempo, texto entrando em 3,3 s e volta para a capa. */
const INTRO: [number, number][] = [
  [1250, 1],
  [2050, 2],
  [2750, 3],
  [3550, 4],
  [5100, 0],
]
const COPY_AT = 3300
const TURN_MS = 780

/**
 * Hero da landing: texto à esquerda (children) e o livro folheando à direita.
 * A entrada roda a cada carregamento; o primeiro mouse sobre o livro assume o folhear.
 */
export function HeroStage({ children }: { children: React.ReactNode }) {
  const [turned, setTurned] = useState(0)
  const [copyIn, setCopyIn] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const busy = useRef(false)

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCopyIn(true)
      return
    }
    timers.current = [...INTRO.map(([ms, n]) => setTimeout(() => setTurned(n), ms)), setTimeout(() => setCopyIn(true), COPY_AT)]
    return () => timers.current.forEach(clearTimeout)
  }, [])

  /** Vira a próxima folha; ao chegar no fim volta para a capa. */
  function turn() {
    if (busy.current) return
    busy.current = true
    setTurned((v) => (v >= PAGES.length - 1 ? 0 : v + 1))
    setTimeout(() => (busy.current = false), TURN_MS)
  }

  function takeOver() {
    timers.current.forEach(clearTimeout)
    setCopyIn(true)
  }

  return (
    <section className="relative mx-auto grid min-h-[calc(100svh-4rem)] max-w-[1280px] items-center gap-8 px-4 py-10 sm:min-h-[calc(100svh-5rem)] sm:px-10 lg:grid-cols-[1.04fr_.96fr]">
      <Orn kind="star" color="#f5c21a" className="left-0 top-12 hidden lg:block" />
      <Orn kind="plus" color="#b8e0f5" className="bottom-16 left-[2%] hidden lg:block" />
      <Orn kind="ring" color="#f5c4b8" className="right-2 bottom-24 hidden lg:block" />

      <div className="hero-copy order-2 lg:order-1" data-in={copyIn}>
        {children}
      </div>

      <div className="hero-stage relative order-1 flex justify-center lg:order-2" data-animate="true">
        <div className="hero-glow pointer-events-none absolute inset-[-8%_-6%]" aria-hidden />
        <div
          className="hero-book w-[min(400px,84vw)] shadow-[14px_18px_0_rgba(23,23,26,.14)] sm:w-[min(430px,80%)]"
          onMouseEnter={takeOver}
          onMouseMove={turn}
          onClick={turn}
        >
          <span className="hero-edge translate-x-[10px] translate-y-[6px]" aria-hidden />
          <span className="hero-edge translate-x-[5px] translate-y-[3px]" aria-hidden />
          {PAGES.map((src, i) => (
            <div key={src} className="hero-leaf" style={{ zIndex: PAGES.length - i }} data-turned={i < turned} aria-hidden={i > 0 ? true : undefined}>
              <Image
                src={src}
                alt={i === 0 ? "Capa do livro A Cama do Samuel, feito no Falaped Books" : ""}
                fill
                sizes="430px"
                priority={i < 2}
                className="object-cover"
              />
            </div>
          ))}
        </div>
        <Sticker className="pointer-events-none absolute -top-3 left-[6%] z-30 -rotate-6 bg-warning">Livro real</Sticker>
        <span className="pointer-events-none absolute -bottom-2 right-[5%] z-30 rounded-full border-2 border-ink bg-warning px-4 py-2 text-[12.5px] font-extrabold uppercase tracking-[.04em] shadow-hard-sm">
          20 páginas
        </span>
        <p className="absolute -bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap text-[13px] font-semibold text-muted-foreground">Passe o mouse para folhear</p>
      </div>
    </section>
  )
}
