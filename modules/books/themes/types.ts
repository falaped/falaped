export type BookStoryPage = {
  /** Texto da página em PT-BR (26 a 35 palavras), com `{nome}` e `{masc|fem}`. Sem travessão nem aspas. */
  text: string
  /** Cena em inglês. Descreve ação pelo resultado físico; personagens fixos via `cast`. */
  scene: string
  /** Painel de texto no terço superior ou inferior. */
  panel: "upper" | "lower"
  /**
   * Índices (0..19) de páginas já geradas que servem de referência visual
   * para personagens secundários (primeira aparição de cada um). A capa
   * (índice 0) é sempre incluída automaticamente.
   */
  refs: number[]
}

export type BookTheme = {
  slug: string
  /** Nome exibido no formulário. */
  label: string
  /** Título da capa, ex.: "O Escudo {do|da} {nome}". */
  title: string
  subtitle: string
  /** Dedicatória padrão (página 1) quando o usuário não escreve a sua. */
  defaultDedication: string
  /** Roupa fixa da criança em todas as cenas (inglês). Nunca a da foto. */
  outfit: string
  coverScene: string
  /** Cena da dedicatória (página 1): sem pessoas, metade superior visualmente quieta. */
  dedicationScene: string
  /** Cena da página final (19): terço inferior visualmente quieto para o CTA. */
  endingScene: string
  /** Exatamente 17 páginas de história (índices 2..18). */
  pages: BookStoryPage[]
}
