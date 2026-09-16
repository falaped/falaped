/** Regras do texto de uma página de história, compartilhadas por temas, IA e revisão do usuário. */

export const STORY_MIN_WORDS = 20
export const STORY_MAX_WORDS = 36
/** Limite duro da revisão manual: acima disso o texto não cabe no painel da imagem. */
export const STORY_HARD_MAX_WORDS = 40
export const STORY_HARD_MIN_WORDS = 8

/** Travessões e aspas tipográficas: o modelo de imagem erra ao desenhá-los. */
export const STORY_FORBIDDEN_CHARS = /[—–"“”]/

export function countWords(text: string): number {
  const t = text.trim()
  return t ? t.split(/\s+/).length : 0
}
