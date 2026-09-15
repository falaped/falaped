export type BookGender = "menino" | "menina"

export type BookChild = {
  name: string
  gender: BookGender
}

/**
 * Renderiza um texto de tema substituindo `{nome}` pelo nome da criança e
 * `{formaMasculina|formaFeminina}` pela forma correspondente ao gênero.
 * Serve tanto para o texto das páginas quanto para os prompts de cena.
 */
export function renderBookText(text: string, child: BookChild): string {
  return text
    .replaceAll("{nome}", child.name.trim())
    .replace(/\{([^{}|]*)\|([^{}|]*)\}/g, (_, m: string, f: string) =>
      child.gender === "menino" ? m : f,
    )
}
