import type { BookTheme } from "@/modules/books/themes/types"

// Personagens fixos do tema. Descritos em toda cena em que aparecem; a
// primeira aparição vira página-âncora (refs) para as seguintes.
const TEACHER =
  "the teacher, a young woman with dark curly hair in a high bun, hoop earrings and a blue apron dress over a white shirt"
const GRANDMA =
  "the grandmother, a gentle woman with short silver curly hair, round glasses and a light-green knitted cardigan"
const MOM =
  "the mother, a warm woman with long straight black hair and a mustard-yellow blouse"
const FRIEND =
  "a classmate boy with short blond hair, a red t-shirt and a small green backpack"
const GLOW =
  "a soft warm golden glow shining gently from the center of the child's chest"

/**
 * Tema "Fé e coragem". Arco: apresentação na escola anunciada → medo, voz
 * que não sai → noite sem dormir → a avó ensina uma oração curta e a imagem
 * da luzinha no peito → de manhã o medo continua → a mamãe explica que o
 * coração acelera para se preparar e ensina a respirar devagar (soprar a
 * velinha) → treino em casa → o dia chega, mão da mamãe, oração baixinha → voz
 * tremida, depois firme → aplausos → ajuda um colega com medo → agradece à
 * noite com a avó. Fé cristã genérica, acolhedora, sem denominação.
 * Índices do livro: 0 capa, 1 dedicatória, 2..18 história, 19 final.
 */
export const feECoragem: BookTheme = {
  slug: "fe-e-coragem",
  label: "Fé e coragem",
  title: "A Luz {do|da} {nome}",
  subtitle: "Uma história sobre fé, coragem e um coração tranquilo.",
  defaultDedication:
    "Você descobriu que a coragem já morava dentro de você. Bastou respirar fundo e acreditar.",
  outfit:
    "a coral t-shirt with a small white star on the chest, denim overalls and white sneakers",
  coverScene: `a small school stage with a deep-blue curtain; the {boy|girl} stands at the center in a warm spotlight, feet apart, one hand resting flat on the chest and the other arm open wide, chin up with a brave smile; ${GLOW}; tiny golden sparkles float around.`,
  dedicationScene: `the {boy|girl}'s bedroom at night, no people: on the wooden nightstand a small lit candle in a glass and a framed blank picture; a soft golden light warms the pillow; the upper half of the image is the plain, dimly lit lavender wall, visually quiet, with no objects, pictures or patterns.`,
  endingScene: `soft evening light; the {boy|girl} stands at the open front door of a cozy house waving toward the viewer with a calm, happy smile, one hand on the chest; ${GLOW}; the lower third of the image is the plain wooden porch floor, visually quiet, with no characters or objects.`,
  pages: [
    {
      text: "Na escola, a professora deu a notícia: na sexta-feira, cada criança ia cantar uma música sozinha, na frente de todo mundo. A barriga de {nome} virou um nó apertado.",
      scene: `bright classroom with a blank board and paper garlands; ${TEACHER} stands by the board smiling and gesturing to an empty small stage area; the {boy|girl} sits at a small desk in the front, eyes wide, hands squeezing the edge of the desk.`,
      panel: "upper",
      refs: [],
    },
    {
      text: "Em casa, {nome} ficou na frente do espelho e tentou cantar. A voz não saiu. Só de imaginar todos aqueles olhos, as pernas tremiam feito gelatina.",
      scene: `the {boy|girl}'s bedroom in afternoon light; the {boy|girl} stands in front of a tall mirror with the mouth barely open and shoulders hunched, hands twisted together; the reflection shows the same worried face.`,
      panel: "lower",
      refs: [],
    },
    {
      text: "Naquela noite, {nome} rolou de um lado para o outro. A barriga doía de medo. A vovó, que estava dormindo lá em casa, ouviu o barulho e apareceu na porta.",
      scene: `dim bedroom at night lit by a small lamp; the {boy|girl} lies tangled in the blanket with eyes open and a frown; ${GRANDMA} stands at the half-open door in the warm hallway light, looking in with tenderness.`,
      panel: "upper",
      refs: [],
    },
    {
      text: "A vovó sentou na cama e contou um segredo: ela também tinha medo quando era pequena. Aí ensinou uma oração curtinha, de mãos juntas: Deus, me dá coragem. Só isso.",
      scene: `${GRANDMA} sits on the edge of the bed with her hands folded; the {boy|girl} sits up beside her with small hands pressed together and eyes closed; warm lamp light on both faces.`,
      panel: "lower",
      refs: [4],
    },
    {
      text: "Depois a vovó disse: imagine uma luzinha bem no meio do peito. Cada vez que você respira fundo, ela cresce e fica quentinha. E o medo vai ficando pequenininho perto dela.",
      scene: `the {boy|girl} lies on the pillow with eyes closed and one hand resting flat on the chest; ${GLOW}; ${GRANDMA} sits beside the bed smiling softly with a hand on the blanket.`,
      panel: "upper",
      refs: [4],
    },
    {
      text: "De manhã, o medo ainda estava lá. Mas parecia um pouquinho menor. No café, a mamãe percebeu a carinha de {nome} e sentou do lado. Pode contar, ela disse baixinho.",
      scene: `sunny kitchen at breakfast; the {boy|girl} sits at the table with the chin resting on one hand, cereal untouched; ${MOM} leans down beside {him|her} with a gentle, curious look, a hand on the child's shoulder.`,
      panel: "lower",
      refs: [],
    },
    {
      text: "{nome} contou tudo sobre a apresentação e o nó na barriga. A mamãe pegou a mão {dele|dela} e colocou no peito: sente? Esse coração está batendo rápido de tanto se preparar.",
      scene: `sunny kitchen; ${MOM} sits beside the {boy|girl} at the table, guiding the child's hand flat onto the child's own chest with a kind, attentive face; the {boy|girl} looks down at the hand with wide eyes; a faint ${GLOW}.`,
      panel: "upper",
      refs: [7],
    },
    {
      text: "A mamãe explicou: o coração acelera porque está se preparando, como um motor de foguete. E ensinou um truque: respirar devagar, soprando como quem apaga uma velinha.",
      scene: `${MOM} sits face to face with the {boy|girl} at the kitchen table, cheeks puffed, blowing gently toward one raised finger as if it were a candle; the {boy|girl} copies her with puffed cheeks and eyes on the finger.`,
      panel: "lower",
      refs: [7],
    },
    {
      text: "Em casa, {nome} treinou. Respirou fundo, soprou a velinha imaginária e sentiu a luzinha crescer. Aí cantou baixinho para a vovó. A voz saiu. Fininha, mas saiu!",
      scene: `living room in warm afternoon light; the {boy|girl} stands on a small rug singing with the mouth open and one hand on the chest; ${GLOW}; ${GRANDMA} sits on the sofa clapping with a wide smile.`,
      panel: "upper",
      refs: [4],
    },
    {
      text: "Sexta-feira chegou. Na porta da escola, {nome} apertou a mão da mamãe bem forte. Respirou fundo, fechou os olhos e orou baixinho: Deus, me dá coragem.",
      scene: `the front gate of a colorful school in morning light; the {boy|girl} stands holding the hand of ${MOM} with eyes closed and lips slightly parted, the other hand on the chest; ${GLOW}; the mother looks down at {him|her} with pride.`,
      panel: "lower",
      refs: [7],
    },
    {
      text: "Atrás da cortina, as crianças esperavam a sua vez. Um colega de camiseta vermelha tremia tanto que a mochila balançava. Ele não queria entrar. {nome} viu e lembrou do próprio medo.",
      scene: `backstage behind a deep-blue curtain; ${FRIEND} stands hugging his backpack straps with a pale, frightened face; the {boy|girl} stands a step away looking at him with recognition; ${TEACHER} peeks through the curtain gap.`,
      panel: "upper",
      refs: [2],
    },
    {
      text: "A professora chamou: {nome}! As pernas ficaram moles. {Ele|Ela} colocou a mão no peito, sentiu a luzinha lá dentro e subiu no palco, um degrau de cada vez.",
      scene: `${TEACHER} holds the curtain open with an encouraging smile; the {boy|girl} climbs the small wooden steps to the stage with one hand flat on the chest and a determined face; ${GLOW}; warm spotlight ahead.`,
      panel: "lower",
      refs: [2],
    },
    {
      text: "A primeira palavra saiu tremida. {nome} respirou devagar, soprou a velinha e tentou de novo. A voz ficou firme, depois bonita, depois cheia. A luzinha parecia iluminar o palco inteiro.",
      scene: `the {boy|girl} stands alone at the center of the stage in a warm spotlight, mouth open in full song, arms slightly open, face glowing with joy; ${GLOW} spreading wide across the stage; deep-blue curtain behind.`,
      panel: "upper",
      refs: [],
    },
    {
      text: "Quando a música acabou, veio uma chuva de palmas. Na primeira fila, a mamãe e a vovó batiam palmas mais alto que todo mundo. {nome} fez uma reverência engraçada.",
      scene: `view from the stage; the {boy|girl} bows deeply with one arm sweeping out, grinning; in the front row ${MOM} and ${GRANDMA} clap with raised hands and beaming faces; warm stage light.`,
      panel: "lower",
      refs: [7, 4],
    },
    {
      text: "Atrás da cortina, o colega de camiseta vermelha ainda tremia. {nome} pegou a mão dele e ensinou: mão no peito, respira fundo, sopra a velinha. E, baixinho: Deus, me dá coragem.",
      scene: `backstage; the {boy|girl} stands facing ${FRIEND}, guiding his hand flat onto his own chest and holding one finger up like a candle; the boy puffs his cheeks blowing at it, eyes on the {boy|girl}.`,
      panel: "upper",
      refs: [12],
    },
    {
      text: "O colega subiu no palco e cantou. A voz tremeu no começo e depois ficou firme, igualzinho. {nome} bateu palmas tão alto que a professora riu.",
      scene: `${FRIEND} stands at the center of the stage singing with a brave smile in the spotlight; at the side of the stage the {boy|girl} claps with raised hands and an open-mouthed cheer; ${TEACHER} stands beside the {boy|girl} laughing.`,
      panel: "lower",
      refs: [12, 2],
    },
    {
      text: "À noite, {nome} e a vovó juntaram as mãos de novo. Dessa vez, para agradecer. A coragem estava dentro {dele|dela} o tempo todo. Só precisava de fé para acender.",
      scene: `peaceful bedroom at night with a small lamp; the {boy|girl} sits on the bed with hands pressed together and a calm smile, ${GLOW}; ${GRANDMA} sits beside {him|her} with folded hands and closed eyes, smiling.`,
      panel: "upper",
      refs: [4],
    },
  ],
}
