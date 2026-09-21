import type { BookTheme } from "@/modules/books/themes/types"

// Personagens fixos do tema. Descritos em toda cena em que aparecem; a
// primeira aparição vira página-âncora (refs) para as seguintes.
const MOM =
  "the mother, a warm woman with long wavy auburn hair, a white blouse and a mustard-yellow skirt"
const DRA =
  "Dra. Lia, a friendly pediatrician with short brown hair, a white coat over teal scrubs, a colorful stethoscope and a warm smile"
const BOY =
  "a smaller boy with curly red hair, freckles and a blue-and-white striped t-shirt, holding a small red toy car"

/**
 * Tema "Visita ao pediatra". Arco: aviso da consulta → medo do consultório
 * (lembrança do cheiro de álcool e da picadinha) → sala de espera colorida →
 * o pediatra transforma cada etapa em missão (balança, fita na parede,
 * estetoscópio, lanterninha, barriga, martelinho do joelho) → gráfico de
 * crescimento → quatro segredos para crescer forte → adesivo de check-up →
 * ajuda outra criança com medo → volta para casa com orgulho.
 * Índices do livro: 0 capa, 1 dedicatória, 2..18 história, 19 final.
 */
export const visitaAoPediatra: BookTheme = {
  slug: "visita-ao-pediatra",
  label: "Visita ao pediatra",
  title: "O Check-up {do|da} {nome}",
  subtitle: "Uma história sobre cuidar do corpo com o pediatra.",
  defaultDedication:
    "Você descobriu que cuidar do corpo é uma missão de {herói|heroína}. E que crescer forte começa com coragem.",
  outfit:
    "a green t-shirt with a small white sailboat on the chest, khaki shorts and red sneakers",
  coverScene: `bright pediatric consulting room; the {boy|girl} stands proudly on a small step stool with fists on hips and chin up, a colorful stethoscope hanging around the neck and a round green sticker with a smiling sun on the t-shirt; a blank growth chart poster and a wooden toy box softly blurred behind; warm daylight from a window.`,
  dedicationScene: `a cozy pediatric consulting room in soft morning light, no people: a colorful stethoscope and a round green sticker with a smiling sun lie on the wooden desk beside a small potted plant; the upper half of the image is the plain, softly lit mint-green wall, visually quiet, with no objects, pictures or patterns.`,
  endingScene: `golden late afternoon; the {boy|girl} stands on the sunny sidewalk in front of a cozy clinic with a red roof, waving toward the viewer with a big proud smile, the round green sticker with a smiling sun on the t-shirt; the lower third of the image is the plain sunlit pavement, visually quiet, with no characters or objects.`,
  pages: [
    {
      text: "Naquela manhã, a mamãe avisou: hoje era dia de consulta com [a|o] {pediatra}. {nome} lembrou na hora do cheiro de álcool e da picadinha da última vez. A barriga gelou.",
      scene: `sunny morning bedroom; the {boy|girl} sits on the edge of the bed with a worried face, hands gripping the mattress; ${MOM} stands at the open door holding the red sneakers and smiling gently.`,
      panel: "upper",
      refs: [],
    },
    {
      text: "No caminho, {nome} perguntou baixinho se ia ter injeção. A mamãe riu e explicou: hoje era check-up, o dia de descobrir quanto {ele|ela} tinha crescido. Nada de agulha.",
      scene: `sunny sidewalk lined with flower beds; the {boy|girl} walks holding hands with ${MOM}, looking up at her with a doubtful face; she looks down at {him|her} with a reassuring smile; a cozy clinic with a red roof at the end of the street.`,
      panel: "lower",
      refs: [2],
    },
    {
      text: "A sala de espera tinha peixes pintados na parede e uma caixa cheia de brinquedos. Mesmo assim, {nome} sentou {grudado|grudada} na mamãe. Do outro lado, um menino de carrinho também parecia nervoso.",
      scene: `colorful pediatric waiting room with painted fish on the wall and a wooden toy box; the {boy|girl} sits pressed against ${MOM} on a bench, hands on the knees, eyes on a closed door; across the room ${BOY} sits on a small chair squeezing his toy car.`,
      panel: "upper",
      refs: [2],
    },
    {
      text: "A porta abriu e [a|o] {pediatra} apareceu com um sorriso enorme. [Ela|Ele] disse que precisava de {um ajudante|uma ajudante} para uma missão: descobrir todos os segredos do corpo de {nome}.",
      scene: `the consulting room door opens onto the waiting room; ${DRA} crouches at the doorway holding out a hand in invitation, smiling warmly at the {boy|girl}, who sits beside ${MOM} and looks at her with surprise.`,
      panel: "lower",
      refs: [2],
    },
    {
      text: "Primeira missão: a balança. {nome} subiu, tirou os sapatos e ficou bem {paradinho|paradinha}. [A|O] {pediatra} olhou e anunciou: mais {pesado|pesada} do que da última vez. Sinal de que estava crescendo.",
      scene: `bright consulting room; the {boy|girl} stands barefoot and very still on a white scale with a blank display, arms at the sides, tongue poking out in concentration; ${DRA} crouches beside it looking at the display; the red sneakers sit on the floor.`,
      panel: "upper",
      refs: [5],
    },
    {
      text: "Segunda missão: a régua da parede. Calcanhar encostado, costas retas, queixo para cima. [A|O] {pediatra} marcou com a mão e disse: três dedos mais alto. {nome} abriu um sorriso gigante.",
      scene: `the {boy|girl} stands with the back and heels against a wall-mounted height ruler with blank marks, chin up and eyes wide with pride; ${DRA} rests a flat hand on top of the child's head, smiling.`,
      panel: "lower",
      refs: [5],
    },
    {
      text: "Terceira missão: o estetoscópio. Estava geladinho! [A|O] {pediatra} escutou o coração e disse que parecia um tambor: tum, tum, tum. Depois deixou {nome} escutar também.",
      scene: `the {boy|girl} sits on the exam table wearing the colorful stethoscope earpieces, pressing the chest piece against {his|her} own chest, mouth open in wonder; ${DRA} sits beside {him|her} with a delighted smile.`,
      panel: "upper",
      refs: [5],
    },
    {
      text: "Quarta missão: a lanterninha. {nome} abriu a boca bem grande e fez ááá. Depois a luz espiou dentro de cada ouvido. [A|O] {pediatra} não achou nenhum bichinho escondido lá dentro.",
      scene: `close view; the {boy|girl} sits on the exam table with the mouth wide open and eyes squeezed shut; ${DRA} holds a small penlight near the child's face, leaning in with a playful expression.`,
      panel: "lower",
      refs: [5],
    },
    {
      text: "Quinta missão: a barriga. [A|O] {pediatra} apertou de leve de um lado e do outro. Fez cócegas! {nome} riu tanto que a mamãe riu junto, e a missão virou brincadeira.",
      scene: `the {boy|girl} lies on the exam table laughing with the head thrown back, hands over the belly; ${DRA} gently presses the belly with both hands, laughing too; ${MOM} stands at the head of the table covering a giggle.`,
      panel: "upper",
      refs: [5, 2],
    },
    {
      text: "Sexta missão: o martelinho. Um toque bem leve no joelho e a perna de {nome} pulou sozinha! {Ele|Ela} arregalou os olhos e pediu para fazer de novo. E de novo.",
      scene: `the {boy|girl} sits on the edge of the exam table with one leg kicked straight out, eyes wide and mouth open in surprise; ${DRA} holds a small rubber reflex hammer near the other knee, grinning.`,
      panel: "lower",
      refs: [5],
    },
    {
      text: "Missão cumprida! [A|O] {pediatra} mostrou um desenho com uma linha subindo como uma montanha. Cada pontinho era uma visita. O último, lá no alto, era {nome} hoje.",
      scene: `${DRA} sits beside the {boy|girl} holding a large blank chart showing only a rising curved line with small dots along it (a picture only, no letters or numbers); the {boy|girl} points at the highest dot with a proud smile; ${MOM} stands behind them.`,
      panel: "upper",
      refs: [5, 2],
    },
    {
      text: "Antes de ir, [a|o] {pediatra} contou nos dedos os quatro segredos para crescer forte: dormir cedo, brincar bastante, comer de todas as cores e beber muita água. {nome} contou nos dedos também.",
      scene: `${DRA} holds up four fingers with a warm smile; the {boy|girl} sits facing her on the exam table holding up four small fingers too, tongue between the teeth in concentration.`,
      panel: "lower",
      refs: [5],
    },
    {
      text: "Então veio a melhor parte: a gaveta de adesivos. {nome} escolheu um sol sorridente e colou bem no meio da camiseta. Era o certificado oficial de {campeão|campeã} do check-up.",
      scene: `${DRA} holds open a drawer full of colorful stickers; the {boy|girl} presses a round green sticker with a smiling sun onto the middle of the green t-shirt, looking down at it with pride.`,
      panel: "upper",
      refs: [5],
    },
    {
      text: "Na sala de espera, o menino do carrinho estava com os olhos cheios de lágrimas. Era a vez dele, e ele não queria entrar de jeito nenhum. Apertava o carrinho com as duas mãos.",
      scene: `back in the waiting room; ${BOY} sits on the small chair with tears on his cheeks, squeezing the toy car with both hands and shaking his head; the {boy|girl}, sun sticker on the shirt, notices him from beside ${MOM}.`,
      panel: "lower",
      refs: [4, 2],
    },
    {
      text: "{nome} sentou ao lado dele e mostrou o adesivo. Contou da balança, do coração que parece tambor e do joelho que pula sozinho. O menino parou de chorar e deu uma risadinha.",
      scene: `the {boy|girl} sits on a small chair next to ${BOY}, turned toward him, pointing at the sun sticker on the shirt and kicking one leg out to show the knee jump; the boy has stopped crying and laughs, still holding his car.`,
      panel: "upper",
      refs: [4],
    },
    {
      text: "Quando [a|o] {pediatra} chamou, o menino levantou, respirou fundo e entrou com o carrinho na mão. Da porta, ele olhou para {nome} e fez sinal de positivo.",
      scene: `${BOY} stands at the consulting room door beside ${DRA}, toy car in one hand, turning back to give a thumbs up with a small brave smile; the {boy|girl} waves at him from the bench.`,
      panel: "lower",
      refs: [4, 5],
    },
    {
      text: "No caminho de casa, {nome} andou de peito estufado, com o sol brilhando na camiseta. Agora sabia os quatro segredos e uma coisa a mais: check-up não dá medo. Dá orgulho.",
      scene: `golden late afternoon on the sunny sidewalk; the {boy|girl} walks hand in hand with ${MOM}, chest puffed out, the sun sticker shining on the t-shirt; the clinic with the red roof softly blurred behind them.`,
      panel: "upper",
      refs: [2],
    },
  ],
}
