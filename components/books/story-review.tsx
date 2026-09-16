"use client"

import { Loader2, RefreshCw, Sparkles } from "lucide-react"

import { BkButton, Chip, Sticker } from "@/components/books/books-ui"
import type { BookStory } from "@/lib/schemas/book"
import { FIRST_STORY_INDEX } from "@/modules/books/constants"
import { countWords, STORY_FORBIDDEN_CHARS, STORY_HARD_MAX_WORDS, STORY_HARD_MIN_WORDS, STORY_MAX_WORDS, STORY_MIN_WORDS } from "@/modules/books/story/rules"
import { cn } from "@/lib/utils"

/** Problema que impede criar o livro; avisos (fora de 20–36) não bloqueiam. */
export function pageTextError(text: string): string | null {
  const words = countWords(text)
  if (words < STORY_HARD_MIN_WORDS) return `Escreva pelo menos ${STORY_HARD_MIN_WORDS} palavras.`
  if (words > STORY_HARD_MAX_WORDS) return `Use até ${STORY_HARD_MAX_WORDS} palavras: mais que isso não cabe na imagem.`
  if (STORY_FORBIDDEN_CHARS.test(text)) return "Troque aspas e travessões por dois-pontos ou vírgula: o modelo erra ao desenhá-los."
  if (/[{}]/.test(text)) return "Sem chaves no texto."
  return null
}

const TOKEN = /\{\{([a-z][a-z0-9]*)\}\}/g

type Props = {
  story: BookStory | null
  loading: boolean
  personalized: boolean
  onChangeText: (position: number, text: string) => void
  onRegenerate: () => void
}

/** Passo "História": os 17 textos em blocos editáveis, com contador e os extras de cada página. */
export function StoryReview({ story, loading, personalized, onChangeText, onRegenerate }: Props) {
  if (loading || !story) {
    return (
      <div className="mt-6 flex flex-col items-center gap-4 rounded-[20px] border-2 border-dashed border-ink bg-white px-6 py-14 text-center shadow-hard-lg">
        <Sticker className="-rotate-3 bg-warning">
          <Loader2 className="mr-1.5 inline size-3 animate-spin" aria-hidden />
          Escrevendo
        </Sticker>
        <p className="max-w-[440px] text-[15px] font-medium leading-relaxed text-[#3f3f46]">
          {personalized ? "Encaixando os detalhes na história. Leva alguns segundos." : "Preparando os textos do tema."}
        </p>
      </div>
    )
  }

  const castLabel = (key: string) => story.cast.find((c) => c.key === key)?.label.split(",")[0] ?? key
  const invalid = story.pages.filter((p) => pageTextError(p.text)).length

  return (
    <div className="mt-6 flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-[20px] border-2 border-ink bg-white p-5 shadow-hard-lg sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-[19px] font-extrabold sm:text-[22px]">Revise os textos das 17 páginas</h2>
          <p className="text-[13px] font-medium text-muted-foreground">
            Ajuste o que quiser. O texto vai exatamente assim para dentro da ilustração, e não pode mais ser mudado depois de criar o livro.
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Chip>{STORY_MIN_WORDS} a {STORY_MAX_WORDS} palavras por página</Chip>
            <Chip>Sem aspas nem travessão</Chip>
            {personalized && story.cast.length > 0 && <Chip>Na história: {story.cast.map((c) => c.label.split(",")[0]).join(", ")}</Chip>}
            {invalid > 0 && <Chip className="bg-danger-soft">{invalid} {invalid === 1 ? "página precisa de ajuste" : "páginas precisam de ajuste"}</Chip>}
          </div>
        </div>
        {personalized && (
          <BkButton variant="secondary" onClick={onRegenerate} className="shrink-0">
            <RefreshCw className="size-4" strokeWidth={2.4} aria-hidden />
            Gerar de novo
          </BkButton>
        )}
      </div>

      <ol className="flex flex-col gap-3.5">
        {story.pages.map((page, position) => {
          const words = countWords(page.text)
          const error = pageTextError(page.text)
          const warn = !error && (words < STORY_MIN_WORDS || words > STORY_MAX_WORDS)
          const extras = [...page.scene.matchAll(TOKEN)].map((m) => castLabel(m[1]))
          const id = `story-page-${position + FIRST_STORY_INDEX}`
          return (
            <li key={position} className={cn("rounded-[14px] border-2 border-ink bg-white p-4 shadow-hard-sm", error && "bg-danger-soft")}>
              <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                <label htmlFor={id} className="font-display text-[15px] font-extrabold">
                  Página {position + FIRST_STORY_INDEX}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {extras.map((label) => (
                    <Chip key={label} className="bg-warning">
                      <Sparkles className="mr-1 inline size-3" strokeWidth={2.4} aria-hidden />
                      {label}
                    </Chip>
                  ))}
                  <Chip className={cn(error ? "bg-destructive text-white" : warn ? "bg-warning" : "bg-success")}>{words} palavras</Chip>
                </div>
              </div>
              <textarea
                id={id}
                value={page.text}
                onChange={(e) => onChangeText(position, e.target.value)}
                rows={3}
                className="w-full resize-y rounded-xl border-2 border-ink bg-white px-3.5 py-2.5 font-serif text-[17px] leading-snug text-ink outline-none focus:shadow-[0_0_0_4px_#b8e0f5]"
              />
              {error && <p className="mt-1.5 text-[12.5px] font-semibold text-danger-text">{error}</p>}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
