import type { ScaleDefinition } from "./types"

/** Idade gestacional do Capurro somático: 204 dias mais o escore. */
function gestationalAge(score: number): string {
  const days = 204 + score
  const weeks = Math.floor(days / 7)
  const rest = days % 7
  const restText = rest === 0 ? "" : ` e ${rest} ${rest === 1 ? "dia" : "dias"}`
  return `IG estimada de ${weeks} semanas${restText}`
}

/**
 * Capurro somático — idade gestacional do recém-nascido pelo exame físico. Cinco
 * itens; o escore vai de 0 a 94 e a IG é 204 dias mais o escore (29 semanas e
 * 1 dia a 42 semanas e 4 dias).
 *
 * A saída que interessa é a IG, não o escore: `describeScore` converte, e as
 * faixas são os cortes de 37 semanas (259 dias) e 42 semanas (294 dias).
 *
 * Conteúdo clínico pendente de revisão do médico antes do merge.
 */
export const CAPURRO: ScaleDefinition = {
  key: "capurro",
  name: "Capurro somático — idade gestacional",
  category: "neonatologia",
  summary: "Idade gestacional do recém-nascido pelo exame físico. Cinco itens.",
  minAgeMonths: 0,
  maxAgeMonths: 0,
  describeScore: gestationalAge,
  items: [
    {
      key: "skin_texture",
      label: "Textura da pele",
      options: [
        { value: 0, label: "Muito fina, gelatinosa" },
        { value: 5, label: "Fina e lisa" },
        { value: 10, label: "Algo mais grossa, discreta descamação superficial" },
        { value: 15, label: "Grossa, rugas superficiais, descamação nas mãos e nos pés" },
        { value: 20, label: "Grossa, apergaminhada, com gretas profundas" },
      ],
    },
    {
      key: "ear_shape",
      label: "Forma da orelha",
      options: [
        { value: 0, label: "Chata, disforme, pavilhão não encurvado" },
        { value: 8, label: "Pavilhão parcialmente encurvado na borda" },
        { value: 16, label: "Pavilhão parcialmente encurvado em toda a parte superior" },
        { value: 24, label: "Pavilhão totalmente encurvado" },
      ],
    },
    {
      key: "breast_gland",
      label: "Glândula mamária",
      options: [
        { value: 0, label: "Não palpável" },
        { value: 5, label: "Palpável, menor que 5 mm" },
        { value: 10, label: "Palpável, entre 5 e 10 mm" },
        { value: 15, label: "Palpável, maior que 10 mm" },
      ],
    },
    {
      key: "nipple",
      label: "Formação do mamilo",
      options: [
        { value: 0, label: "Apenas visível, sem aréola" },
        { value: 5, label: "Aréola lisa e chata, diâmetro menor que 0,75 cm" },
        { value: 10, label: "Aréola pontilhada, borda não levantada, menor que 0,75 cm" },
        { value: 15, label: "Aréola pontilhada, borda levantada, maior que 0,75 cm" },
      ],
    },
    {
      key: "plantar_creases",
      label: "Pregas plantares",
      options: [
        { value: 0, label: "Sem pregas" },
        { value: 5, label: "Marcas mal definidas na metade anterior" },
        { value: 10, label: "Marcas bem definidas na metade anterior e sulcos no terço anterior" },
        { value: 15, label: "Sulcos na metade anterior" },
        { value: 20, label: "Sulcos em mais da metade anterior" },
      ],
    },
  ],
  bands: [
    { min: 0, max: 54, label: "Pré-termo" },
    { min: 55, max: 89, label: "A termo" },
    { min: 90, max: 94, label: "Pós-termo" },
  ],
  source: "Método de Capurro somático (Capurro et al., 1978). Conteúdo a revisar com o médico.",
}
