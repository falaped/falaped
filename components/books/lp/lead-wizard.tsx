"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Check, ChevronLeft, ChevronRight, Loader2, Maximize2, MessageCircle, Shield, Sparkles, X } from "lucide-react"

import { checkoutLeadBookAction, createLeadBookAction, startBookLeadAction } from "@/actions/books"
import { BkButton, BrandBlur, Chip, FIELD, HELP, LABEL, Sticker, TINTS } from "@/components/books/books-ui"
import { LP_WRAP, LpCard } from "@/components/books/lp/lp-ui"
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { PhotoSlot, type WizardTheme } from "@/components/books/new-book-wizard"
import type { LeadCoverResult } from "@/app/api/books/lead/cover/route"
import { BOOK_COUPONS, BOOK_PRICE_BRL, BOOKS_WHATSAPP, MAX_BOOK_PHOTOS, bookPriceWithCoupon } from "@/modules/books/constants"
import type { BookLeadStatus } from "@/modules/books/types"
import type { BookGender } from "@/modules/books/render-book-text"
import { cn } from "@/lib/utils"

const STEPS = ["Contato", "Criança", "Tema", "Pronto"] as const

export type LeadWizardInitial = {
  lead: { firstName: string; coupon: string | null; status: BookLeadStatus } | null
  book: { id: string; childName: string; theme: string; coverStatus: "pending" | "ready" | "failed" | null } | null
  coverUrl: string | null
}

function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex shrink-0 flex-wrap items-center gap-1.5 text-xs font-bold sm:flex-nowrap sm:gap-0 sm:text-[13px]">
      {STEPS.map((name, i) => {
        const done = i < current
        const active = i === current
        return (
          <li key={name} className="flex items-center">
            <span
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full border-2 border-ink pl-1.5 pr-2.5 sm:h-9 sm:gap-2 sm:pr-3.5",
                done && "bg-success",
                active && "bg-warning shadow-hard-sm",
                !done && !active && "bg-white text-muted-foreground",
              )}
            >
              <span className="grid size-5 place-items-center rounded-full border-2 border-ink bg-white text-[11px] font-extrabold text-ink sm:size-6 sm:text-xs">
                {done ? <Check className="size-3" strokeWidth={3.4} aria-hidden /> : i + 1}
              </span>
              {name}
            </span>
            {i < STEPS.length - 1 && <span className="hidden h-0.5 w-[18px] bg-ink sm:block" aria-hidden />}
          </li>
        )
      })}
    </ol>
  )
}

const CARD = "mt-6 flex flex-col gap-6 p-5 sm:mt-7 sm:p-8"

export function LeadWizard({ themes, initial }: { themes: WizardTheme[]; initial: LeadWizardInitial }) {
  const params = useSearchParams()
  const [step, setStep] = useState(initial.book ? 3 : initial.lead ? 1 : 0)
  const [firstName, setFirstName] = useState(initial.lead?.firstName ?? "")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [coupon, setCoupon] = useState(initial.lead?.coupon ?? params.get("cupom")?.toUpperCase() ?? "")
  const [consent, setConsent] = useState(false)
  const [name, setName] = useState(initial.book?.childName ?? "")
  const [gender, setGender] = useState<BookGender | "">("")
  const [photos, setPhotos] = useState<(File | null)[]>(Array.from({ length: MAX_BOOK_PHOTOS }, () => null))
  const [theme, setTheme] = useState(initial.book?.theme ?? themes[0]?.slug ?? "")
  const [bookId, setBookId] = useState(initial.book?.id ?? null)
  const [coverUrl, setCoverUrl] = useState(initial.coverUrl)
  const [coverError, setCoverError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [zoom, setZoom] = useState(false)
  const [leadStatus, setLeadStatus] = useState<BookLeadStatus | null>(initial.lead?.status ?? null)
  const generating = useRef(false)

  const files = photos.filter((f): f is File => !!f)
  const selectedTheme = themes.find((t) => t.slug === theme) ?? themes[0]
  const validCoupon = coupon && coupon in BOOK_COUPONS ? coupon : null
  const price = bookPriceWithCoupon(validCoupon)

  /** Passo 4: gera a capa (uma vez) assim que o livro existe e ainda não há capa. */
  useEffect(() => {
    if (step !== 3 || !bookId || coverUrl || generating.current) return
    generating.current = true
    let cancelled = false
    async function run(attempt = 0) {
      const res = await fetch("/api/books/lead/cover", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ bookId }) })
      const data = (await res.json().catch(() => ({ ok: false, error: "Erro de rede." }))) as LeadCoverResult
      if (cancelled) return
      if (data.ok) {
        setCoverUrl(data.coverUrl)
        setLeadStatus((s) => (s === "new" || !s ? "cover_ready" : s))
        return
      }
      // 409 = outra chamada está desenhando (ex.: a pessoa recarregou a página): espera e tenta ler de novo.
      if (res.status === 409 && attempt < 30) {
        setTimeout(() => void run(attempt + 1), 10_000)
        return
      }
      setCoverError(data.error)
      generating.current = false
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [step, bookId, coverUrl])

  async function submitContact(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const result = await startBookLeadAction({ firstName, lastName, email, whatsapp, consent, coupon })
    setBusy(false)
    if (!result.ok) return toast.error(result.error)
    setLeadStatus("new")
    if (result.hasBook) {
      // E-mail já tem capa: recarrega com o cookie novo para retomar direto na capa.
      window.location.reload()
      return
    }
    setStep(1)
  }

  function submitChild(e: React.FormEvent) {
    e.preventDefault()
    if (name.trim().length < 2) return toast.error("Informe o nome da criança.")
    if (!gender) return toast.error("Escolha menino ou menina.")
    if (!files.length) return toast.error("Envie pelo menos 1 foto.")
    setStep(2)
  }

  async function submitTheme() {
    if (!theme || !gender) return toast.error("Escolha um tema.")
    setBusy(true)
    const fd = new FormData()
    fd.set("childName", name.trim())
    fd.set("childGender", gender)
    fd.set("theme", theme)
    files.forEach((f) => fd.append("photos", f))
    const result = await createLeadBookAction(fd)
    setBusy(false)
    if (!result.ok) return toast.error(result.error)
    setBookId(result.bookId)
    setStep(3)
  }

  async function checkout() {
    setBusy(true)
    const result = await checkoutLeadBookAction()
    setBusy(false)
    if (!result.ok) return toast.error(result.error)
    setLeadStatus("checkout")
    const text = `Olá! Criei o livro "${selectedTheme?.label ?? ""}" ${name.trim() ? `de ${name.trim()} ` : ""}e quero as 20 páginas por R$ ${price}${validCoupon ? ` (cupom ${validCoupon})` : ""}. Pedido ${bookId?.slice(0, 8)}.`
    window.open(`https://wa.me/${BOOKS_WHATSAPP}?text=${encodeURIComponent(text)}`, "_blank", "noopener")
  }

  return (
    <div className={cn(LP_WRAP, "pb-10 pt-6 sm:pb-16 sm:pt-10")}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <h1 className="font-display text-[30px] font-extrabold uppercase leading-none tracking-[-.03em] sm:text-[44px]">
          {step === 3 && name ? `O livro de ${name}` : "Criar o livro"}
        </h1>
        <Stepper current={step} />
      </div>

      {step === 0 && (
        <LpCard className={CARD}>
          <form onSubmit={submitContact} className="flex flex-col gap-5">
            <p className="text-[14px] font-medium leading-relaxed text-[#3f3f46]">
              Deixe seu contato para guardarmos o livro e falarmos com você sobre o pedido. Sem cartão: você só paga se quiser o livro completo.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className={LABEL}>Nome</span>
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={60} autoComplete="given-name" placeholder="Marina" className={FIELD} required autoFocus />
              </label>
              <label className="flex flex-col gap-2">
                <span className={LABEL}>Sobrenome</span>
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={60} autoComplete="family-name" placeholder="Duarte" className={FIELD} required />
              </label>
              <label className="flex flex-col gap-2">
                <span className={LABEL}>E-mail</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} autoComplete="email" placeholder="marina@email.com" className={FIELD} required />
              </label>
              <label className="flex flex-col gap-2">
                <span className={LABEL}>WhatsApp</span>
                <input type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} maxLength={20} autoComplete="tel" placeholder="(31) 99999-9999" className={FIELD} required />
                <span className={HELP}>É por aqui que o PDF chega.</span>
              </label>
            </div>
            <label className="flex flex-col gap-2">
              <span className={LABEL}>
                Cupom de indicação <span className={HELP}>(opcional)</span>
              </span>
              <div className="flex items-center gap-3">
                <input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} maxLength={30} placeholder="CODIGO10" className={cn(FIELD, "max-w-xs uppercase")} />
                {validCoupon && <Chip className="bg-success">Cupom válido · 10% de desconto</Chip>}
              </div>
            </label>
            <label className="flex items-start gap-3 rounded-[14px] border-2 border-ink bg-background p-4 text-[13px] font-medium leading-snug">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-ink" required />
              <span>
                Autorizo o Falaped a usar meu contato e a foto da criança só para criar este livro e falar comigo sobre ele, conforme a{" "}
                <Link href="/books/lp/privacidade" target="_blank" className="font-bold underline decoration-secondary decoration-2 underline-offset-2">
                  política de privacidade
                </Link>
                . Posso pedir a exclusão a qualquer momento.
              </span>
            </label>
            <div className="flex items-center justify-between gap-3 border-t-2 border-ink pt-6">
              <span className="flex items-center gap-2 text-[12.5px] font-medium text-[#3f3f46]">
                <Shield className="size-3.5" strokeWidth={2.2} aria-hidden />
                Dados protegidos (LGPD)
              </span>
              <BkButton type="submit" variant="warning" busy={busy} busyLabel="Salvando..." className="px-[22px] text-[15px]">
                Continuar
                <ChevronRight className="size-4" strokeWidth={2.6} aria-hidden />
              </BkButton>
            </div>
          </form>
        </LpCard>
      )}

      {step === 1 && (
        <LpCard className={CARD}>
          <form onSubmit={submitChild} className="flex flex-col gap-6">
            {initial.lead && (
              <p className="text-[14px] font-medium text-[#3f3f46]">
                Olá, {firstName}! Vamos criar o livro.{" "}
                <button type="button" onClick={() => setStep(0)} className="font-bold underline decoration-secondary decoration-2 underline-offset-2">
                  Não é você?
                </button>
              </p>
            )}
            <label className="flex flex-col gap-2">
              <span className={LABEL}>Nome da criança</span>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Samuel" className={FIELD} autoFocus />
              <span className={HELP}>É assim que o nome aparece no livro inteiro.</span>
            </label>
            <fieldset className="flex flex-col gap-2.5 border-0 p-0">
              <legend className={cn(LABEL, "mb-2.5")}>Gênero</legend>
              <div className="flex flex-wrap gap-3">
                {(["menino", "menina"] as const).map((g) => {
                  const on = gender === g
                  return (
                    <label
                      key={g}
                      className={cn(
                        "inline-flex h-12 cursor-pointer items-center gap-2.5 rounded-full border-2 border-ink pl-3 pr-[18px] text-[15px]",
                        on ? "bg-primary font-bold shadow-hard-xs" : "bg-white font-semibold hover:bg-accent",
                      )}
                    >
                      <input type="radio" name="gender" value={g} checked={on} onChange={() => setGender(g)} className="sr-only" />
                      <span className="grid size-5 place-items-center rounded-full border-2 border-ink bg-white">{on && <span className="size-2.5 rounded-full bg-ink" />}</span>
                      {g === "menino" ? "Menino" : "Menina"}
                    </label>
                  )
                })}
              </div>
            </fieldset>
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-baseline gap-2.5">
                <span className={LABEL}>Fotos da criança</span>
                <span className={HELP}>1 ou 2 fotos do rosto, bem iluminadas e de frente</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {photos.map((f, i) => (
                  <PhotoSlot key={i} n={i + 1} file={f} onPick={(file) => setPhotos((p) => p.map((x, j) => (j === i ? file : x)))} onRemove={() => setPhotos((p) => p.map((x, j) => (j === i ? null : x)))} />
                ))}
              </div>
              <ul className="flex flex-wrap gap-2 text-[12.5px] font-semibold">
                {["Rosto visível e de frente", "Boa luz, sem sombras fortes", "Sem óculos, chapéu ou chupeta"].map((t) => (
                  <li key={t} className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-accent px-[11px] py-1.5">
                    <Check className="size-3" strokeWidth={3} aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
              <p className="flex items-center gap-2 text-[12.5px] font-medium text-[#3f3f46]">
                <Shield className="size-3.5" strokeWidth={2.2} aria-hidden />
                A foto fica em área privada, só para desenhar o personagem. Nunca aparece em anúncios.
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 border-t-2 border-ink pt-6">
              <BkButton variant="secondary" onClick={() => setStep(0)}>
                <ChevronLeft className="size-4" strokeWidth={2.6} aria-hidden />
                Voltar
              </BkButton>
              <button type="submit" className={cn("inline-flex h-12 items-center gap-2 rounded-full border-2 border-ink bg-warning px-[22px] text-[15px] font-bold shadow-hard")}>
                Continuar
                <ChevronRight className="size-4" strokeWidth={2.6} aria-hidden />
              </button>
            </div>
          </form>
        </LpCard>
      )}

      {step === 2 && (
        <div className="mt-6">
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 className="font-display text-[19px] font-extrabold sm:text-[22px]">Escolha o tema da história</h2>
            <span className="text-[13px] font-medium text-muted-foreground">As 20 páginas da história seguem o tema.</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
            {themes.map((t, i) => {
              const on = t.slug === theme
              const [a, b] = TINTS[i % TINTS.length]
              return (
                <label
                  key={t.slug}
                  className={cn(
                    "block cursor-pointer overflow-hidden rounded-[14px] border-2 border-ink bg-white transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg",
                    on ? "shadow-hard outline-3 outline-offset-2 outline-warning" : "shadow-hard-xs",
                  )}
                >
                  <input type="radio" name="theme" value={t.slug} checked={on} onChange={() => setTheme(t.slug)} className="sr-only" />
                  <span className="relative block aspect-square border-b-2 border-ink" style={{ background: `repeating-linear-gradient(135deg,${a} 0 10px,${b} 10px 20px)` }}>
                    {on && (
                      <span className="absolute right-1.5 top-1.5 grid size-[26px] place-items-center rounded-full border-2 border-ink bg-warning shadow-hard-sm">
                        <Check className="size-3" strokeWidth={3.2} aria-hidden />
                      </span>
                    )}
                  </span>
                  <span className="block px-3 pb-3 pt-2.5 font-display text-sm font-bold leading-tight text-pretty">
                    {t.label}
                    <span className="mt-0.5 block font-sans text-[11.5px] font-medium leading-snug text-muted-foreground">{t.hint}</span>
                  </span>
                </label>
              )
            })}
          </div>
          <div className="mt-7 flex flex-col gap-4 border-t-2 border-ink pt-6 sm:flex-row sm:items-center sm:justify-between">
            <BkButton variant="secondary" disabled={busy} onClick={() => setStep(1)} className="order-2 sm:order-1">
              <ChevronLeft className="size-4" strokeWidth={2.6} aria-hidden />
              Voltar
            </BkButton>
            <div className="order-1 flex flex-col items-stretch gap-2 sm:order-2 sm:items-end">
              <BkButton variant="warning" onClick={() => void submitTheme()} busy={busy} busyLabel="Enviando a foto..." className="h-[52px] px-6 text-base">
                <Sparkles className="size-4" strokeWidth={2.4} aria-hidden />
                Criar o livro
              </BkButton>
              <span className="text-xs font-medium text-muted-foreground">Um livro por cadastro: confira o nome, o tema e a foto, porque não dá para refazer.</span>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="mt-6 flex flex-col items-center gap-7 sm:mt-9">
          {/* A capa manda na tela: grande, centrada e ampliável. */}
          <div className="relative w-full max-w-[420px] sm:max-w-[460px]">
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[18px] border-[3px] border-ink bg-muted shadow-hard-xl">
              {coverUrl ? (
                <button type="button" onClick={() => setZoom(true)} className="group size-full cursor-zoom-in" aria-label={`Ampliar a capa do livro de ${name}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverUrl} alt={`Capa do livro de ${name}`} className="size-full object-cover" />
                  <span className="absolute bottom-3 right-3 inline-flex h-10 items-center gap-2 rounded-full border-2 border-ink bg-white px-4 text-[13px] font-bold shadow-hard-sm transition-transform duration-100 group-hover:-translate-y-0.5">
                    <Maximize2 className="size-4" strokeWidth={2.6} aria-hidden />
                    Ampliar
                  </span>
                </button>
              ) : (
                <>
                  <BrandBlur pulse={!coverError} />
                  <div className="relative grid size-full place-items-center p-6 text-center">
                    {coverError ? (
                      <div className="flex flex-col items-center gap-3">
                        <p className="text-[13.5px] font-bold">{coverError}</p>
                        <BkButton
                          variant="secondary"
                          onClick={() => {
                            setCoverError(null)
                            generating.current = false
                            setCoverUrl(null)
                          }}
                        >
                          Tentar de novo
                        </BkButton>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="size-6 animate-spin" aria-hidden />
                        <p className="text-[13.5px] font-bold">Montando o livro de {name || "sua criança"}...</p>
                        <p className="text-xs font-medium text-[#3f3f46]">Leva cerca de 2 minutos. Pode deixar esta página aberta.</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            {coverUrl && <Sticker className="absolute -left-2 -top-3 rotate-[-4deg] bg-warning">Página 1 de 20</Sticker>}
          </div>

          <div className="flex w-full max-w-[600px] flex-col items-center gap-4 text-center">
            <Chip className="bg-secondary uppercase tracking-[.04em]">{selectedTheme?.label}</Chip>
            <h2 className="font-display text-[24px] font-extrabold leading-tight text-balance sm:text-[32px]">
              {coverUrl ? `${name} já é protagonista.` : `Estamos desenhando ${name || "sua criança"}.`}
            </h2>
            <p className="max-w-[46ch] text-[14px] font-medium leading-relaxed text-[#3f3f46] text-pretty">
              {coverUrl
                ? "Esta é a primeira página, do jeito que ela vai ficar. As outras 19 páginas são montadas assim que o pagamento cair, e o PDF chega no seu WhatsApp na hora."
                : "Leva cerca de 2 minutos. Nada é cobrado: você vê antes de decidir."}
            </p>

            {coverUrl &&
              (leadStatus === "paid" ? (
                <p className="mt-1 inline-flex items-center gap-2 rounded-full border-2 border-ink bg-success px-4 py-2 text-[14px] font-bold">
                  <Check className="size-4" strokeWidth={3} aria-hidden />
                  Pagamento confirmado. Seu livro está sendo montado.
                </p>
              ) : (
                <div className="mt-1 flex w-full flex-col items-center gap-3 rounded-[18px] border-2 border-ink bg-warning p-5 shadow-hard sm:p-6">
                  <div className="flex items-baseline gap-2.5">
                    <span className="font-display text-[40px] font-extrabold leading-none tracking-[-.03em] sm:text-[46px]">R$ {price}</span>
                    {validCoupon && <span className="text-[14px] font-bold line-through opacity-60">R$ {BOOK_PRICE_BRL}</span>}
                  </div>
                  <p className="text-[12.5px] font-bold">As 19 páginas restantes · PDF · Pix pelo WhatsApp{validCoupon ? ` · cupom ${validCoupon}` : ""}</p>
                  <BkButton variant="primary" busy={busy} busyLabel="Abrindo o WhatsApp..." onClick={() => void checkout()} className="h-[54px] w-full max-w-[380px] text-base">
                    <MessageCircle className="size-4" strokeWidth={2.4} aria-hidden />
                    Quero o livro completo
                  </BkButton>
                  <p className="text-xs font-medium text-[#3f3f46]">
                    {leadStatus === "checkout" ? "Pedido registrado. Se a conversa não abriu, toque de novo." : "Abre a conversa no WhatsApp com o seu pedido já escrito."}
                  </p>
                </div>
              ))}
          </div>

          {coverUrl && (
            <Dialog open={zoom} onOpenChange={setZoom}>
              {/* Mesmo lightbox das páginas do livro (components/books/page-card.tsx). */}
              <DialogContent
                className="books-theme w-auto max-w-[calc(100vw-2rem)] gap-0 overflow-hidden rounded-[20px] border-2 border-ink bg-white p-0 shadow-hard-xl"
                style={{ background: "#fff" }}
              >
                <DialogTitle className="sr-only">Capa do livro de {name}</DialogTitle>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverUrl} alt={`Capa do livro de ${name}`} className="block max-h-[calc(100svh-2rem)] w-auto max-w-full object-contain" />
                <DialogClose
                  aria-label="Fechar"
                  className="absolute right-3 top-3 grid size-9 place-items-center rounded-full border-2 border-ink bg-white text-ink shadow-hard-xs hover:bg-warning"
                >
                  <X className="size-4" strokeWidth={2.6} aria-hidden />
                </DialogClose>
              </DialogContent>
            </Dialog>
          )}
        </div>
      )}
    </div>
  )
}
