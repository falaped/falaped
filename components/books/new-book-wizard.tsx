"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, Camera, Check, ChevronLeft, ChevronRight, Shield, Sparkles, Upload, X } from "lucide-react"

import { createBookAction } from "@/actions/books"
import { BkButton, Sticker, bkButton } from "@/components/books/books-ui"
import { MAX_BOOK_PHOTOS, type BookQuality } from "@/modules/books/constants"
import { renderBookText, type BookGender } from "@/modules/books/render-book-text"
import { cn } from "@/lib/utils"

export type WizardTheme = { slug: string; label: string; hint: string; title: string }

const STEPS = ["Criança", "Tema", "Revisão"] as const
const ACCEPT = "image/png,image/jpeg,image/webp"
const MAX_BYTES = 8 * 1024 * 1024
const TINTS = [
  ["#e1f1fa", "#cfe8f6"],
  ["#fbe4de", "#f5c4b8"],
  ["#fdf1c2", "#f9e39a"],
  ["#e1f3e6", "#cdebd3"],
]

const FIELD = "h-[50px] w-full rounded-xl border-2 border-ink bg-white px-4 text-base font-medium text-ink outline-none focus:shadow-[0_0_0_4px_#b8e0f5]"
const LABEL = "font-display text-[15px] font-extrabold"
const HELP = "text-[12.5px] font-normal text-muted-foreground"

function formatBytes(n: number) {
  return n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : `${Math.round(n / 1024)} KB`
}

function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-1.5 text-xs font-bold sm:gap-0 sm:text-[13px]">
      {STEPS.map((name, i) => {
        const done = i < current
        const active = i === current
        return (
          <li key={name} className="flex items-center">
            <span
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full border-2 border-ink py-0 pl-1.5 pr-2.5 sm:h-9 sm:gap-2 sm:pl-1.5 sm:pr-3.5",
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

function PhotoSlot({
  n,
  file,
  onPick,
  onRemove,
}: {
  n: number
  file: File | null
  onPick: (f: File) => void
  onRemove: () => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!file) return setUrl(null)
    const u = URL.createObjectURL(file)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [file])

  function accept(f: File | undefined) {
    if (!f) return
    if (!ACCEPT.split(",").includes(f.type)) return toast.error("Use uma foto JPG, PNG ou WebP.")
    if (f.size > MAX_BYTES) return toast.error("Foto muito grande. Envie até 8 MB.")
    onPick(f)
  }

  if (file && url)
    return (
      <div className="relative h-[220px] overflow-hidden rounded-2xl border-2 border-ink bg-muted shadow-hard">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={`Foto ${n}`} className="size-full object-cover" />
        <Sticker className="absolute left-2.5 top-2.5 -rotate-4 bg-secondary px-2 py-1.5 text-[11px] shadow-none">Foto {n}</Sticker>
        <button
          type="button"
          aria-label="Remover foto"
          onClick={onRemove}
          className="absolute right-2.5 top-2.5 grid size-[30px] place-items-center rounded-full border-2 border-ink bg-white text-ink hover:bg-destructive"
        >
          <X className="size-3" strokeWidth={2.8} aria-hidden />
        </button>
        <div className="absolute inset-x-0 bottom-0 flex justify-between border-t-2 border-ink bg-white px-3 py-2 text-xs font-semibold">
          <span className="truncate">{file.name}</span>
          <span className="shrink-0 text-muted-foreground">{formatBytes(file.size)}</span>
        </div>
      </div>
    )

  return (
    <button
      type="button"
      onClick={() => input.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        accept(e.dataTransfer.files[0])
      }}
      className="flex h-[220px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink bg-white p-4 text-center hover:bg-accent focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-warning"
    >
      <span className="grid size-11 place-items-center rounded-full border-2 border-ink bg-white">
        <Upload className="size-5" strokeWidth={2.2} aria-hidden />
      </span>
      <span className="text-[13.5px] font-bold">Arraste ou clique para adicionar</span>
      <span className="text-xs font-medium text-muted-foreground">JPG, PNG ou WebP · até 8 MB</span>
      <input ref={input} type="file" accept={ACCEPT} className="hidden" onChange={(e) => accept(e.target.files?.[0])} />
    </button>
  )
}

export function NewBookWizard({ themes }: { themes: WizardTheme[] }) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [name, setName] = useState("")
  const [gender, setGender] = useState<BookGender | "">("")
  const [photos, setPhotos] = useState<(File | null)[]>(Array.from({ length: MAX_BOOK_PHOTOS }, () => null))
  const [theme, setTheme] = useState(themes[0]?.slug ?? "")
  const [quality, setQuality] = useState<BookQuality>("high")
  const [dedication, setDedication] = useState("")
  const [pediatricianName, setPediatricianName] = useState("")
  const [logo, setLogo] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const logoInput = useRef<HTMLInputElement>(null)

  const files = photos.filter((f): f is File => !!f)
  const selectedTheme = themes.find((t) => t.slug === theme) ?? themes[0]
  const title = useMemo(
    () => (selectedTheme && name.trim() && gender ? renderBookText(selectedTheme.title, { name: name.trim(), gender }) : ""),
    [selectedTheme, name, gender],
  )
  const firstPhotoUrl = useMemo(() => (files[0] ? URL.createObjectURL(files[0]) : null), [files[0]]) // eslint-disable-line react-hooks/exhaustive-deps

  function next() {
    if (step === 0) {
      if (name.trim().length < 2) return toast.error("Informe o nome da criança.")
      if (!gender) return toast.error("Escolha menino ou menina.")
      if (!files.length) return toast.error("Envie pelo menos 1 foto.")
    }
    if (step === 1 && !theme) return toast.error("Escolha um tema.")
    setStep((s) => Math.min(s + 1, 2))
  }

  async function submit() {
    if (!gender) return
    setSubmitting(true)
    const fd = new FormData()
    fd.set("childName", name.trim())
    fd.set("childGender", gender)
    fd.set("theme", theme)
    fd.set("quality", quality)
    fd.set("dedication", dedication)
    fd.set("pediatricianName", pediatricianName)
    files.forEach((f) => fd.append("photos", f))
    if (logo) fd.set("pediatricianLogo", logo)
    const result = await createBookAction(fd)
    if (!result.ok) {
      setSubmitting(false)
      toast.error(result.error)
      return
    }
    toast.success("Livro criado.", { description: "A capa começa agora e leva cerca de 2 minutos." })
    router.push(`/books/${result.bookId}?start=cover`)
  }

  const wide = step === 1
  return (
    <div className={cn("mx-auto px-4 pb-8 pt-[18px] sm:px-10 sm:pb-14 sm:pt-7", wide ? "max-w-[1000px]" : "max-w-[800px]")}>
      <Link href="/books" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-ink underline decoration-secondary decoration-2 underline-offset-4">
        <ArrowLeft className="size-3.5" strokeWidth={2.2} aria-hidden />
        Todos os livros
      </Link>
      <div className="mt-3.5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <h1 className="font-display text-[30px] font-extrabold leading-none tracking-[-.03em] sm:text-[48px]">Novo livro</h1>
        <Stepper current={step} />
      </div>

      {step === 0 && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            next()
          }}
          className="mt-6 flex flex-col gap-7 rounded-[20px] border-2 border-ink bg-white p-5 shadow-hard-lg sm:mt-7 sm:p-8"
        >
          <label className="flex flex-col gap-2">
            <span className={LABEL}>Nome da criança</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Samuel" className={FIELD} autoFocus />
            <span className={HELP}>É assim que o nome aparece no livro.</span>
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
                    <span className="grid size-5 place-items-center rounded-full border-2 border-ink bg-white">
                      {on && <span className="size-2.5 rounded-full bg-ink" />}
                    </span>
                    {g === "menino" ? "Menino" : "Menina"}
                  </label>
                )
              })}
            </div>
          </fieldset>

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline gap-2.5">
              <span className={LABEL}>Fotos da criança</span>
              <span className={HELP}>1 ou 2 fotos · a capa é gerada a partir delas</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {photos.map((f, i) => (
                <PhotoSlot
                  key={i}
                  n={i + 1}
                  file={f}
                  onPick={(file) => setPhotos((p) => p.map((x, j) => (j === i ? file : x)))}
                  onRemove={() => setPhotos((p) => p.map((x, j) => (j === i ? null : x)))}
                />
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
              As fotos ficam guardadas só com este livro e somem quando você o excluir.
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 border-t-2 border-ink pt-6">
            <Link href="/books" className={bkButton("secondary")}>
              Cancelar
            </Link>
            <button type="submit" className={bkButton("primary", "px-[22px] text-[15px]")}>
              Continuar
              <ChevronRight className="size-4" strokeWidth={2.6} aria-hidden />
            </button>
          </div>
        </form>
      )}

      {step === 1 && (
        <div className="mt-6">
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 className="font-display text-[19px] font-extrabold sm:text-[22px]">Escolha o tema da história</h2>
            <span className="text-[13px] font-medium text-muted-foreground">O tema define as 17 páginas de história.</span>
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
          <div className="mt-7 flex items-center justify-between gap-3 border-t-2 border-ink pt-6">
            <BkButton variant="secondary" onClick={() => setStep(0)}>
              <ChevronLeft className="size-4" strokeWidth={2.6} aria-hidden />
              Voltar
            </BkButton>
            <BkButton variant="primary" onClick={next} className="px-[22px] text-[15px]">
              Continuar
              <ChevronRight className="size-4" strokeWidth={2.6} aria-hidden />
            </BkButton>
          </div>
        </div>
      )}

      {step === 2 && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
          className="mt-6 flex flex-col gap-7 rounded-[20px] border-2 border-ink bg-white p-5 shadow-hard-lg sm:mt-7 sm:p-8"
        >
          <div className="flex flex-col gap-2">
            <span className={LABEL}>Título do livro</span>
            <div className="flex h-14 items-center rounded-[14px] border-2 border-ink bg-white px-4 font-display text-lg font-bold">{title}</div>
            <span className={HELP}>Definido pelo tema a partir do nome da criança.</span>
          </div>

          <div className="flex flex-col gap-3">
            <span className={LABEL}>Qualidade das imagens</span>
            <label
              className={cn(
                "flex cursor-pointer items-center gap-4 rounded-[14px] border-2 border-ink px-[18px] py-4",
                quality === "high" ? "bg-accent shadow-hard" : "bg-white",
              )}
            >
              <input type="checkbox" checked={quality === "high"} onChange={(e) => setQuality(e.target.checked ? "high" : "medium")} className="sr-only" />
              <span className={cn("relative h-[34px] w-[60px] shrink-0 rounded-full border-2 border-ink", quality === "high" ? "bg-warning" : "bg-[#ededeb]")}>
                <span className={cn("absolute top-0.5 size-[26px] rounded-full border-2 border-ink bg-white transition-[left]", quality === "high" ? "left-7" : "left-0.5")} />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-[15px] font-bold">{quality === "high" ? "Alta — mais detalhe no rosto" : "Média — mais rápida"}</span>
                <span className="text-[12.5px] font-medium leading-snug text-[#3f3f46]">
                  {quality === "high"
                    ? "≈ 2 min por página, cerca de 30 min no livro inteiro. Desligue para Média: ≈ 1 min por página e metade do tempo."
                    : "≈ 1 min por página, cerca de 15 min no livro inteiro. Ligue para Alta: mais detalhe no rosto."}
                </span>
              </span>
            </label>
          </div>

          <label className="flex flex-col gap-2">
            <span className={LABEL}>
              Dedicatória <span className={HELP}>(opcional)</span>
            </span>
            <textarea
              value={dedication}
              onChange={(e) => setDedication(e.target.value)}
              maxLength={400}
              rows={3}
              placeholder="Vazio usa a dedicatória padrão do tema. Aceita {nome} e {ele|ela}."
              className={cn(FIELD, "h-auto py-3")}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className={LABEL}>
                Pediatra <span className={HELP}>(opcional)</span>
              </span>
              <input value={pediatricianName} onChange={(e) => setPediatricianName(e.target.value)} maxLength={80} placeholder="Dra. Marina Duarte" className={FIELD} />
              <span className={HELP}>Aparece na página final do livro.</span>
            </label>
            <div className="flex flex-col gap-2">
              <span className={LABEL}>
                Logo <span className={HELP}>(opcional)</span>
              </span>
              <button
                type="button"
                onClick={() => logoInput.current?.click()}
                className="flex h-[50px] items-center justify-between rounded-xl border-2 border-dashed border-ink bg-white px-4 text-sm font-semibold hover:bg-accent"
              >
                <span className="truncate">{logo ? logo.name : "Escolher imagem"}</span>
                <Upload className="size-4 shrink-0" strokeWidth={2.2} aria-hidden />
              </button>
              <input ref={logoInput} type="file" accept={ACCEPT} className="hidden" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} />
              {logo && (
                <button type="button" onClick={() => setLogo(null)} className="self-start text-xs font-bold underline decoration-2 underline-offset-2">
                  Remover logo
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-4 rounded-[14px] border-2 border-ink bg-background p-4 sm:gap-[18px] sm:p-[18px]">
            <div className="relative h-32 w-24 shrink-0 overflow-hidden rounded-[10px] border-2 border-ink bg-muted">
              {firstPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={firstPhotoUrl} alt={`Foto de ${name}`} className="size-full object-cover" />
              ) : (
                <div className="grid size-full place-items-center">
                  <Camera className="size-5" aria-hidden />
                </div>
              )}
            </div>
            <dl className="grid content-center gap-x-4 gap-y-2 text-[13.5px] font-medium sm:grid-cols-[auto_1fr]">
              <dt className="text-muted-foreground">Criança</dt>
              <dd className="font-bold">
                {name.trim()} · {gender}
              </dd>
              <dt className="text-muted-foreground">Tema</dt>
              <dd className="font-bold">{selectedTheme?.label}</dd>
              <dt className="text-muted-foreground">Páginas</dt>
              <dd className="font-bold">20 (capa, dedicatória, 17 de história, final)</dd>
              <dt className="text-muted-foreground">Fotos</dt>
              <dd className="font-bold">{files.length}</dd>
            </dl>
          </div>

          <div className="flex flex-col gap-4 border-t-2 border-ink pt-6 sm:flex-row sm:items-center sm:justify-between">
            <BkButton variant="secondary" disabled={submitting} onClick={() => setStep(1)} className="order-2 sm:order-1">
              <ChevronLeft className="size-4" strokeWidth={2.6} aria-hidden />
              Voltar
            </BkButton>
            <div className="order-1 flex flex-col items-stretch gap-2 sm:order-2 sm:items-end">
              <BkButton variant="primary" busy={submitting} busyLabel="Criando livro..." className="h-[52px] px-6 text-base">
                <Sparkles className="size-4" strokeWidth={2.4} aria-hidden />
                Criar livro e gerar a capa
              </BkButton>
              <span className="text-xs font-medium text-muted-foreground">A capa começa na hora e leva ≈ 2 min.</span>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
