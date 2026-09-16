import type { BookTheme } from "@/modules/books/themes/types"

// Personagens fixos do tema. Descritos em toda cena em que aparecem; a
// primeira aparição vira página-âncora (refs) para as seguintes.
const MOM =
  "the mother, a warm woman with short auburn hair, light freckles, a navy-and-white striped shirt and jeans"
const DRA =
  "Dra. Lia, a friendly pediatrician with short brown hair, a white coat over teal scrubs, a colorful stethoscope and a warm smile"
const GRANDPA =
  "the grandfather, a stocky man with white hair, a thick white mustache, a brown checked shirt and suspenders"
const GLOW =
  "soft glowing sparkles in orange, green, red, yellow and purple, floating like a gentle daydream"

/**
 * Arco: só macarrão e nuggets → na consulta, o pediatra propõe o prato
 * arco-íris (cada cor um poder) e a regra de ouro: provar um pedacinho, não
 * precisa gostar → feira caçando cores → cozinha junto → prova o brócolis com
 * careta → gosta da cenoura → semana do arco-íris com cartaz → jantar em que
 * não gosta e tudo bem → ensina o vovô → prato colorido e poderes. Sem
 * chantagem, castigo ou sobremesa como prêmio. Roupa de dia única.
 * Índices do livro: 0 capa, 1 dedicatória, 2..18 história, 19 final.
 */
export const comerDeTudo: BookTheme = {
  slug: "comer-de-tudo",
  label: "Comer de tudo",
  title: "O Arco-íris {do|da} {nome}",
  subtitle: "Uma história sobre experimentar comidas novas.",
  defaultDedication:
    "Para {nome}, que aprendeu que provar já é ser {corajoso|corajosa}. Que seu prato e sua vida tenham sempre todas as cores.",
  outfit:
    "a white t-shirt with a small rainbow on the chest, orange shorts and blue sneakers",
  coverScene: `sunny kitchen; the {boy|girl} stands on a wooden stool in a heroic pose holding up a white plate arranged like a rainbow of carrot sticks, broccoli, cherry tomatoes, banana slices and grapes, big proud smile; ${GLOW} arcs behind {him|her} like a small rainbow.`,
  dedicationScene: `sunny kitchen table in soft morning light, no people: a white plate with a colorful circle of carrot sticks, broccoli florets, cherry tomatoes, banana slices and grapes, a small fork beside it; the upper half of the image is the plain, softly lit cream wall, visually quiet, with no objects, pictures or patterns.`,
  endingScene: `golden afternoon backyard; the {boy|girl} stands by the open kitchen door waving toward the viewer with a big smile, a carrot stick in the other hand, ${GLOW} floating gently around; the lower third of the image is the plain sunlit grass, visually quiet, with no characters or objects.`,
  pages: [
    {
      text: "{nome} comia macarrão. Só macarrão. E nuggets, quando dava sorte. Se aparecia algo verde no prato, {ele|ela} empurrava tudo para longe e cruzava os braços. Ninguém passava daquela muralha.",
      scene: `bright kitchen at dinner; the {boy|girl} sits at the table with arms crossed and a stubborn pout, a plate with a single broccoli floret pushed to the far edge; ${MOM} stands beside the table holding a serving spoon, tired but patient.`,
      panel: "upper",
      refs: [],
    },
    {
      text: "A mamãe já tinha tentado de tudo: aviãozinho, carinha de cenoura, brócolis escondido no arroz. {nome} achava todos. Tinha um faro de detetive para legumes.",
      scene: `same kitchen; the {boy|girl} holds up a tiny piece of broccoli picked out of a bowl of rice with two fingers, squinting at it like a detective examining a clue; ${MOM} covers her face with one hand, laughing.`,
      panel: "lower",
      refs: [2],
    },
    {
      text: "Na consulta, [a|o] {pediatra} pesou, mediu e perguntou o que {nome} gostava de comer. Macarrão, respondeu {ele|ela}. E o que mais? Macarrão de novo. [A|O] {pediatra} sorriu.",
      scene: `bright consulting room; the {boy|girl} stands on a scale with a blank display, looking up; ${DRA} crouches beside it holding a clipboard with blank pages, smiling warmly; ${MOM} sits on a chair by the wall.`,
      panel: "upper",
      refs: [2],
    },
    {
      text: "Então [ela|ele] propôs um jogo: o prato arco-íris. Cada cor de comida dá um poder diferente. Quanto mais cores no prato, mais poderes {nome} ganha. {nome} arregalou os olhos.",
      scene: `${DRA} holds up a large drawing of a round plate divided into colorful wedges of orange, green, red, yellow and purple (a picture only, no letters); the {boy|girl} sits on the exam table leaning forward with wide, excited eyes.`,
      panel: "lower",
      refs: [4],
    },
    {
      text: "Laranja da cenoura: olhos de coruja. Verde do brócolis: braços fortes. Vermelho do tomate: coração valente. Amarelo da banana: energia de foguete. Roxo da uva: cabeça de gênio.",
      scene: `dreamy imagination scene; the {boy|girl} stands in the center in a superhero stance surrounded by five floating glowing pictures: a carrot with owl eyes, a broccoli with a flexing arm, a heart-shaped tomato, a banana with rocket flames, a bunch of grapes wearing a tiny crown; ${GLOW} all around; no letters anywhere.`,
      panel: "upper",
      refs: [],
    },
    {
      text: "E a regra de ouro: provar um pedacinho de cada cor. Só provar. Não precisa gostar. Gostar pode demorar dez tentativas, disse [a|o] {pediatra}. Provar já vale o poder.",
      scene: `${DRA} holds up one finger with a playful wink, standing by the consulting room door; the {boy|girl} nods seriously beside ${MOM}, holding the rolled-up rainbow plate drawing under one arm.`,
      panel: "lower",
      refs: [4, 2],
    },
    {
      text: "No sábado, {nome} foi à feira com a mamãe caçar cores. Cenoura laranja, tomate vermelho brilhante, uva roxa, banana amarela. E um brócolis verde, que parecia uma árvore pequenininha.",
      scene: `sunny open-air market stall piled with colorful vegetables and fruit, all tags blank; the {boy|girl} holds a head of broccoli up like a small tree, delighted; ${MOM} holds a woven basket with carrots, tomatoes and grapes.`,
      panel: "upper",
      refs: [2],
    },
    {
      text: "Em casa, {nome} virou ajudante de cozinha. Lavou os tomates, quebrou o brócolis em arvorezinhas e montou o prato com as cores em roda, como um arco-íris de verdade.",
      scene: `kitchen counter; the {boy|girl} stands on a stool arranging carrot sticks, cherry tomatoes, broccoli florets, banana slices and grapes in a colorful circle on a white plate, tongue poking out in concentration; ${MOM} washes tomatoes at the sink.`,
      panel: "lower",
      refs: [2],
    },
    {
      text: "Hora do verde. {nome} pegou uma arvorezinha de brócolis, fechou os olhos e deu uma mordidinha. A careta foi enorme. Mas provou. E provar já valia o poder dos braços fortes.",
      scene: `close view at the dinner table; the {boy|girl} holds a small broccoli floret with a tiny bite taken out, eyes squeezed shut and face scrunched in a huge grimace; ${MOM} across the table gives a thumbs up with a proud smile.`,
      panel: "upper",
      refs: [2],
    },
    {
      text: "A cenoura foi diferente. Crocante, docinha, fazia croc croc. {nome} comeu uma, depois outra. Na terceira, já estava certo: os olhos de coruja tinham chegado. Dava até para ver no escuro.",
      scene: `kitchen at dusk; the {boy|girl} crunches a carrot stick with a surprised, happy face, cheeks full; two soft glowing orange rings float around {his|her} eyes like cartoon owl eyes, clearly a daydream.`,
      panel: "lower",
      refs: [],
    },
    {
      text: "Foi a semana do arco-íris. Na geladeira, um cartaz com cinco círculos coloridos. Cada cor provada ganhava um risquinho. Na quarta-feira, o roxo da uva já estava cheio de risquinhos.",
      scene: `kitchen; the {boy|girl} draws a small tally mark with a purple crayon on a hand-made poster on the fridge showing five colored circles and no letters or numbers; a bowl of grapes on the counter; ${MOM} peels a banana nearby.`,
      panel: "upper",
      refs: [2],
    },
    {
      text: "Numa noite, o jantar tinha abobrinha. {nome} provou um pedacinho e não gostou nada. Tudo bem, disse a mamãe. Provou, valeu. A abobrinha podia esperar até a próxima tentativa.",
      scene: `dinner table; the {boy|girl} pushes a slice of zucchini gently to the side of the plate with a fork, calm and unbothered; ${MOM} shrugs with a warm smile and pats the child's shoulder; the rest of the plate is colorful.`,
      panel: "lower",
      refs: [2],
    },
    {
      text: "No domingo, o vovô veio almoçar. Ele olhou o brócolis no prato e fez a mesma careta que {nome} fazia antes. Vovô também tinha uma muralha.",
      scene: `sunny dining room; ${GRANDPA} sits at the table poking a broccoli floret with his fork, nose wrinkled in a comic grimace; the {boy|girl} beside him watches with a knowing grin, chin resting on both hands.`,
      panel: "upper",
      refs: [],
    },
    {
      text: "{nome} explicou tudo: as cores, os poderes e a regra de ouro. Só provar um pedacinho, vovô. Não precisa gostar. O vovô respirou fundo e mordeu a arvorezinha.",
      scene: `${GRANDPA} bites a small broccoli floret with his eyes closed and eyebrows raised; the {boy|girl} stands on the chair beside him holding up one finger like a tiny teacher, very serious; ${MOM} watches from the kitchen doorway, amused.`,
      panel: "lower",
      refs: [14, 2],
    },
    {
      text: "O vovô mastigou, pensou e disse que não era tão ruim. Depois pediu mais um. {nome} deu um risquinho para ele no cartaz. Poder dos braços fortes para o vovô.",
      scene: `kitchen; the {boy|girl} draws a green tally mark on the fridge poster (colored circles only, no letters) while ${GRANDPA} flexes his arm playfully beside it, laughing, a second broccoli floret in his other hand.`,
      panel: "upper",
      refs: [14],
    },
    {
      text: "Semanas depois, o prato de {nome} tinha todas as cores. Laranja, verde, vermelho, amarelo, roxo. E o macarrão continuava lá, no meio, como um velho amigo que veio ver a festa.",
      scene: `dinner table seen from slightly above; a white plate arranged like a rainbow of carrot, broccoli, tomato, banana and grapes around a small nest of pasta in the center; the {boy|girl} holds a fork above it, beaming; ${MOM} sets down a glass of water.`,
      panel: "lower",
      refs: [2],
    },
    {
      text: "Hoje {nome} prova de tudo, pelo menos um pedacinho. Às vezes gosta, às vezes não. Mas sente os poderes: olhos de coruja, braços fortes e um coração bem valente.",
      scene: `sunny backyard; the {boy|girl} stands in a superhero pose, fists on hips, holding a carrot stick like a tiny sword; ${GLOW} swirls around {him|her} in a gentle arc like a small rainbow.`,
      panel: "upper",
      refs: [],
    },
  ],
}
