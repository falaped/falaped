"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Sparkles } from "lucide-react"

import { createBookAction } from "@/actions/books"
import { MAX_BOOK_PHOTOS } from "@/modules/books/constants"

type Props = { themes: { slug: string; label: string }[] }

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-5">
      <legend className="mb-4 flex items-center gap-3">
        <span className="bk-sticker bg-primary">{n}</span>
        <span className="text-lg font-black uppercase tracking-tight">{title}</span>
      </legend>
      {children}
    </fieldset>
  )
}

export function BookForm({ themes }: Props) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const photos = formData.getAll("photos").filter((f) => f instanceof File && f.size > 0)
    if (photos.length < 1 || photos.length > MAX_BOOK_PHOTOS) {
      toast.error(`Envie de 1 a ${MAX_BOOK_PHOTOS} fotos da criança.`)
      return
    }
    setSubmitting(true)
    const result = await createBookAction(formData)
    setSubmitting(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success("Livro criado. Agora gere a capa.")
    router.push(`/books/${result.bookId}`)
  }

  return (
    <form onSubmit={onSubmit} className="bk-card grid max-w-3xl gap-10 p-6 sm:p-10">
      <Section n="01" title="A criança">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="grid gap-2">
            <label htmlFor="childName" className="bk-label">Nome</label>
            <input id="childName" name="childName" required minLength={2} maxLength={40} className="bk-input" placeholder="Samuel" />
          </div>
          <div className="grid gap-2">
            <label htmlFor="childGender" className="bk-label">Gênero</label>
            <select id="childGender" name="childGender" required className="bk-input" defaultValue="">
              <option value="" disabled>Escolha</option>
              <option value="menino">Menino</option>
              <option value="menina">Menina</option>
            </select>
          </div>
        </div>
        <div className="grid gap-2">
          <label htmlFor="photos" className="bk-label">Fotos (1 a {MAX_BOOK_PHOTOS}, rosto nítido)</label>
          <input id="photos" name="photos" type="file" accept="image/png,image/jpeg,image/webp" multiple required className="bk-input" />
        </div>
      </Section>

      <Section n="02" title="O livro">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="grid gap-2">
            <label htmlFor="theme" className="bk-label">Tema</label>
            <select id="theme" name="theme" required className="bk-input" defaultValue={themes[0]?.slug}>
              {themes.map((t) => (
                <option key={t.slug} value={t.slug}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <label htmlFor="quality" className="bk-label">Qualidade das imagens</label>
            <select id="quality" name="quality" required className="bk-input" defaultValue="high">
              <option value="high">Alta (≈ US$ 0,13 por página)</option>
              <option value="medium">Média (≈ US$ 0,05 por página)</option>
            </select>
          </div>
        </div>
        <div className="grid gap-2">
          <label htmlFor="dedication" className="bk-label">Dedicatória (opcional)</label>
          <textarea
            id="dedication"
            name="dedication"
            maxLength={400}
            rows={3}
            className="bk-input"
            placeholder="Vazio usa a dedicatória padrão do tema. Aceita {nome} e {ele|ela}."
          />
        </div>
      </Section>

      <Section n="03" title="O pediatra">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="grid gap-2">
            <label htmlFor="pediatricianName" className="bk-label">Nome (opcional)</label>
            <input id="pediatricianName" name="pediatricianName" maxLength={80} className="bk-input" placeholder="Dra. Lia" />
          </div>
          <div className="grid gap-2">
            <label htmlFor="pediatricianLogo" className="bk-label">Logo (opcional)</label>
            <input id="pediatricianLogo" name="pediatricianLogo" type="file" accept="image/png,image/jpeg,image/webp" className="bk-input" />
          </div>
        </div>
      </Section>

      <button type="submit" disabled={submitting} className="bk-btn bk-btn-primary bk-btn-lg w-full sm:w-auto sm:justify-self-start">
        <Sparkles className="size-5" aria-hidden />
        {submitting ? "Enviando..." : "Criar livro"}
      </button>
    </form>
  )
}
