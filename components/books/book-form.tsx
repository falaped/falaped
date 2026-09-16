"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { createBookAction } from "@/actions/books"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { MAX_BOOK_PHOTOS } from "@/modules/books/constants"

type Props = { themes: { slug: string; label: string }[] }

const selectClass =
  "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"

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
    <form onSubmit={onSubmit} className="grid max-w-2xl gap-5">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="childName">Nome da criança</Label>
          <Input id="childName" name="childName" required minLength={2} maxLength={40} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="childGender">Gênero</Label>
          <select id="childGender" name="childGender" required className={selectClass} defaultValue="">
            <option value="" disabled>
              Escolha
            </option>
            <option value="menino">Menino</option>
            <option value="menina">Menina</option>
          </select>
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="photos">Fotos da criança (1 a {MAX_BOOK_PHOTOS}, rosto nítido)</Label>
        <Input id="photos" name="photos" type="file" accept="image/png,image/jpeg,image/webp" multiple required />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="theme">Tema</Label>
          <select id="theme" name="theme" required className={selectClass} defaultValue={themes[0]?.slug}>
            {themes.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="quality">Qualidade das imagens</Label>
          <select id="quality" name="quality" required className={selectClass} defaultValue="high">
            <option value="high">Alta (≈ US$ 0,13 por página)</option>
            <option value="medium">Média (≈ US$ 0,05 por página)</option>
          </select>
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="dedication">Dedicatória (opcional)</Label>
        <Textarea
          id="dedication"
          name="dedication"
          maxLength={400}
          rows={3}
          placeholder="Vazio usa a dedicatória padrão do tema. Aceita {nome} e {ele|ela}."
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="pediatricianName">Nome do pediatra (opcional)</Label>
          <Input id="pediatricianName" name="pediatricianName" maxLength={80} placeholder="Dra. Lia" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="pediatricianLogo">Logo do pediatra (opcional)</Label>
          <Input id="pediatricianLogo" name="pediatricianLogo" type="file" accept="image/png,image/jpeg,image/webp" />
        </div>
      </div>

      <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
        {submitting ? "Enviando..." : "Criar livro"}
      </Button>
    </form>
  )
}
