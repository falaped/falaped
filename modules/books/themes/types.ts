export type BookPage = {
  /** Texto da página em PT-BR, com `{nome}` e `{masc|fem}`. 1 a 3 frases curtas. */
  text: string
  /** Descrição da cena para o modelo de imagem (inglês), sem descrever o rosto. */
  scene: string
}

export type BookTheme = {
  slug: string
  /** Título da capa, ex.: "{nome} vai ao pediatra". */
  title: string
  subtitle: string
  /** Texto da página de dedicatória. */
  dedication: string
  coverScene: string
  dedicationScene: string
  /** Cena da página final (CTA do Falaped). */
  endingScene: string
  /** Exatamente 16 páginas de história. */
  pages: BookPage[]
}
