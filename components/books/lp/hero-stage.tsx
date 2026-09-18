"use client"

import { ChevronDown, Mouse } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

import { Sticker } from "@/components/books/books-ui"
import { Orn } from "@/components/books/lp/lp-ui"

/** Páginas do livro real do Samuel (consentimento dos pais) usadas no hero. */
/** Número real de cada página de amostra dentro do livro de 20 páginas. */
const PAGE_LABELS = [1, 5, 8, 12, 16, 19]

const PAGES = ["/books/samples/cama/0.jpg", "/books/samples/cama/4.jpg", "/books/samples/cama/7.jpg", "/books/samples/cama/11.jpg", "/books/samples/cama/15.jpg", "/books/samples/cama/18.jpg"]

/** Passos da rolagem: 0 = capa, 1..5 = páginas viradas, 6 = livro fechado de novo. */
const LAST_PAGE = PAGES.length - 1
const CLOSED_STEP = PAGES.length
/** Duração de uma virada (igual à transição em globals.css) e da curvatura do papel. */
const TURN_MS = 1500
const BEND_MS = 900
const COPY_AT = 950
const INTRO_MS = 2000

/** O hero ainda ocupa a tela? Usado para saber se a rolagem folheia ou navega. */
function isHeroInView(el: HTMLElement | null) {
  const r = el?.getBoundingClientRect()
  return !!r && r.top > -40 && r.bottom > window.innerHeight * 0.6
}

/**
 * Hero da landing: texto à esquerda (children) e o livro à direita.
 * O livro sobe de baixo no centro, escorrega para a direita e fica fechado.
 * A partir daí cada rolagem vira uma página; quando as páginas acabam o livro
 * fecha e a rolagem seguinte segue para a próxima seção. Em tela de toque não
 * há trava de rolagem: o livro folheia no toque.
 */
export function HeroStage({ children, nextSectionId = "como-funciona" }: { children: React.ReactNode; nextSectionId?: string }) {
  const [step, setStep] = useState(0)
  const [bending, setBending] = useState(-1)
  const [copyIn, setCopyIn] = useState(false)
  const [locked, setLocked] = useState(false)
  const busy = useRef(false)
  const sectionRef = useRef<HTMLElement>(null)
  const stepRef = useRef(0)
  const bendTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const turned = step >= CLOSED_STEP ? 0 : step

  /** Marca a folha em movimento para ela curvar durante a virada. */
  const markBend = useCallback((leaf: number) => {
    setBending(leaf)
    clearTimeout(bendTimer.current)
    bendTimer.current = setTimeout(() => setBending(-1), BEND_MS)
  }, [])

  /** Avança ou volta um passo. Retorna false quando o livro já acabou e a rolagem deve seguir. */
  const move = useCallback(
    (dir: 1 | -1) => {
      if (busy.current) return true
      const n = stepRef.current + dir
      if (n < 0) return true
      if (n > CLOSED_STEP) return false
      stepRef.current = n
      setStep(n)
      busy.current = true
      setTimeout(() => (busy.current = false), TURN_MS * 0.6)
      // ao fechar, todas as folhas voltam juntas: -2 marca todas
      markBend(dir > 0 ? (n === CLOSED_STEP ? -2 : n - 1) : n)
      return true
    },
    [markBend],
  )

  // entrada: o texto começa a subir enquanto o livro ainda escorrega para a direita
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCopyIn(true)
      return
    }
    const t = [
      setTimeout(() => setCopyIn(true), COPY_AT),
      setTimeout(() => setLocked(window.matchMedia("(pointer: fine)").matches && isHeroInView(sectionRef.current)), INTRO_MS),
    ]
    return () => t.forEach(clearTimeout)
  }, [])

  // segura a rolagem enquanto o livro é folheado (só com mouse e só no topo da página)
  useEffect(() => {
    if (!locked) return

    function release() {
      setLocked(false)
      document.getElementById(nextSectionId)?.scrollIntoView({ behavior: "smooth" })
    }
    function onWheel(e: WheelEvent) {
      if (Math.abs(e.deltaY) < 2) return
      // rolou para longe do hero (ou a página abriu no meio): devolve a rolagem
      if (!isHeroInView(sectionRef.current)) {
        setLocked(false)
        return
      }
      e.preventDefault()
      if (!move(e.deltaY > 0 ? 1 : -1)) release()
    }
    function onKey(e: KeyboardEvent) {
      if (["ArrowDown", "PageDown", " "].includes(e.key)) {
        e.preventDefault()
        if (!move(1)) release()
      } else if (["ArrowUp", "PageUp"].includes(e.key)) {
        e.preventDefault()
        move(-1)
      } else if (e.key === "Escape") {
        release()
      }
    }
    window.addEventListener("wheel", onWheel, { passive: false })
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("wheel", onWheel)
      window.removeEventListener("keydown", onKey)
    }
  }, [locked, move, nextSectionId])

  useEffect(() => () => clearTimeout(bendTimer.current), [])

  const hint = step === 0 ? "Role para folhear o livro" : step >= CLOSED_STEP ? "Role para continuar" : `Página ${PAGE_LABELS[Math.min(step, LAST_PAGE)]} de 20`

  // data-locked no <section> existe para testar a trava de rolagem por fora do app
  return (
    <section ref={sectionRef} data-locked={locked} className="relative mx-auto grid min-h-[calc(100svh-4rem)] max-w-[1280px] items-center gap-8 px-4 py-10 sm:min-h-[calc(100svh-5rem)] sm:px-10 lg:grid-cols-[1.04fr_.96fr]">
      <Orn kind="star" color="#f5c21a" className="left-0 top-12 hidden lg:block" />
      <Orn kind="plus" color="#b8e0f5" className="bottom-16 left-[2%] hidden lg:block" />
      <Orn kind="ring" color="#f5c4b8" className="bottom-24 right-2 hidden lg:block" />

      <div className="hero-copy order-2 lg:order-1" data-in={copyIn}>
        {children}
        <p className="mt-9 hidden lg:block">
          <span className="hero-scroll-icon inline-flex items-center gap-2 rounded-full border-2 border-ink bg-white px-4 py-2 text-[12.5px] font-bold shadow-hard-sm">
            {step >= CLOSED_STEP ? <ChevronDown className="size-4" strokeWidth={2.6} aria-hidden /> : <Mouse className="size-4" strokeWidth={2.4} aria-hidden />}
            {hint}
          </span>
        </p>
      </div>

      <div className="hero-stage relative order-1 flex justify-center lg:order-2" data-animate="true">
        <div className="hero-glow pointer-events-none absolute inset-[-8%_-6%]" aria-hidden />
        <button
          type="button"
          aria-label="Folhear o livro de exemplo"
          className="hero-book w-[min(400px,84vw)] cursor-pointer shadow-[14px_18px_0_rgba(23,23,26,.13)] sm:w-[min(430px,80%)]"
          onClick={() => move(1)}
        >
          <span className="hero-edge translate-x-[10px] translate-y-[6px]" aria-hidden />
          <span className="hero-edge translate-x-[5px] translate-y-[3px]" aria-hidden />
          {PAGES.map((src, i) => (
            <span key={src} className="hero-leaf" style={{ zIndex: PAGES.length - i }} data-turned={i < turned} data-bend={bending === -2 || i === bending} aria-hidden={i > 0 ? true : undefined}>
              <span className="hero-hinge h1">
                <span className="hero-face">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={i === 0 ? "Capa do livro A Cama do Samuel, feito no Falaped Books" : ""} />
                </span>
                {i < LAST_PAGE && <span className="hero-back" aria-hidden />}
                <span className="hero-hinge h2">
                  <span className="hero-face">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" />
                  </span>
                  {i < LAST_PAGE && <span className="hero-back" aria-hidden />}
                  <span className="hero-hinge h3">
                    <span className="hero-face">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" />
                    </span>
                    {i < LAST_PAGE && <span className="hero-back" aria-hidden />}
                  </span>
                </span>
              </span>
            </span>
          ))}
        </button>
        <Sticker className="pointer-events-none absolute -top-3 left-[6%] z-30 -rotate-6 bg-warning">Livro real</Sticker>
        <span className="pointer-events-none absolute -bottom-2 right-[5%] z-30 rounded-full border-2 border-ink bg-warning px-4 py-2 text-[12.5px] font-extrabold uppercase tracking-[.04em] shadow-hard-sm">
          20 páginas
        </span>
      </div>
    </section>
  )
}
