export type BookGender = "menino" | "menina"

export type BookChild = {
  name: string
  gender: BookGender
  /** Nome do pediatra como digitado no formulário. Vazio usa "Dra. Lia". */
  pediatricianName?: string | null
}

const DEFAULT_PEDIATRICIAN = "Dra. Lia"
const TITLE = /^(dr|dra|doutor|doutora)\.?\s+(.+)$/i

/**
 * Nome do pediatra para os textos e seu gênero gramatical, deduzido do título
 * (Dr./Doutor = masculino; Dra./Doutora ou sem título = feminino). Com título,
 * normaliza para "Dr. Nome" / "Dra. Nome"; sem título, mantém como digitado.
 */
export function pediatricianDisplay(raw?: string | null): { display: string; male: boolean } {
  const name = raw?.trim() || DEFAULT_PEDIATRICIAN
  const m = name.match(TITLE)
  if (!m) return { display: name, male: false }
  const male = /^(dr|doutor)$/i.test(m[1])
  return { display: `${male ? "Dr." : "Dra."} ${m[2].trim()}`, male }
}

/**
 * Renderiza um texto de tema: `{nome}` vira o nome da criança,
 * `{formaMasculina|formaFeminina}` segue o gênero da criança, `{pediatra}`
 * vira o nome do pediatra e `[formaFeminina|formaMasculina]` segue o gênero
 * do pediatra. Serve para textos das páginas, dedicatória e prompts de cena.
 */
export function renderBookText(text: string, child: BookChild): string {
  const pediatrician = pediatricianDisplay(child.pediatricianName)
  return text
    .replaceAll("{nome}", child.name.trim())
    .replaceAll("{pediatra}", pediatrician.display)
    .replace(/\{([^{}|]*)\|([^{}|]*)\}/g, (_, m: string, f: string) =>
      child.gender === "menino" ? m : f,
    )
    .replace(/\[([^[\]|]*)\|([^[\]|]*)\]/g, (_, f: string, m: string) =>
      pediatrician.male ? m : f,
    )
}
