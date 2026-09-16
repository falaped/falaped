import type { BookTheme } from "@/modules/books/themes/types"

// Personagens fixos do tema. Descritos em toda cena em que aparecem; a
// primeira aparição vira página-âncora (refs) para as seguintes.
const MOM =
  "the mother, a warm woman with dark curly hair tied in a high bun, small hoop earrings and a mustard-yellow blouse"
const DAD =
  "the father, a tall man with short reddish hair, freckles and a light-blue shirt with rolled sleeves"
const DRA =
  "Dra. Lia, a friendly pediatrician with short brown hair, a white coat over teal scrubs, a colorful stethoscope and a warm smile"
const FOX =
  "Tato, a plush orange fox with a cream muzzle, a fluffy tail and a tiny green scarf, about the size of the child's head"
const COUSIN =
  "the smaller cousin, a toddler boy with straight blond hair, a white onesie and a bulky diaper showing under it"
const THRONE =
  "the throne, a small bright red potty with a rounded backrest and golden star stickers along the sides"

/**
 * Desfralde. Arco: a fralda incomoda → o peniquinho chega como um trono →
 * consulta: a formiguinha na barriga avisa e a dica dos três momentos (ao
 * acordar, depois das refeições, antes de dormir) → treino sem resultado →
 * primeiro xixi: festa → acidente sem bronca → calendário de estrelas →
 * parque com aviso a tempo → cocô no trono → ensina o Tato e o primo →
 * noite sem fralda → cueca/calcinha de super-herói. Criança sempre vestida;
 * o trono aparece antes ou depois, nunca em uso.
 * Índices do livro: 0 capa, 1 dedicatória, 2..18 história, 19 final.
 */
export const adeusFralda: BookTheme = {
  slug: "adeus-fralda",
  label: "Adeus, fralda",
  title: "O Trono {do|da} {nome}",
  subtitle: "Uma história sobre deixar a fralda.",
  defaultDedication:
    "Para {nome}, que aprendeu a escutar o próprio corpo e subiu no trono como {um rei|uma rainha}. Que orgulho de você.",
  outfit:
    "a mint-green t-shirt with a small orange fox on the chest, soft gray shorts with an elastic waistband and white socks",
  coverScene: `sunny bathroom with white tiles and a round window; the {boy|girl} stands proudly beside ${THRONE} wearing a paper crown decorated with gold stars, one fist raised high, ${FOX} tucked under the other arm; a fluffy yellow bath mat on the floor.`,
  dedicationScene: `the bathroom in soft morning light, no people: ${THRONE} sits on the fluffy yellow bath mat with a paper crown resting on its backrest and ${FOX} sitting beside it; the upper half of the image is the plain, softly lit white tiled wall, visually quiet, with no objects, pictures or patterns.`,
  endingScene: `sunny hallway at home; the {boy|girl} stands in front of the open bathroom door waving toward the viewer with a huge smile, a paper crown on the head and ${FOX} under one arm, ${THRONE} visible on the bath mat behind; the lower third of the image is the plain wooden floor, visually quiet, with no characters or objects.`,
  pages: [
    {
      text: "{nome} adorava correr, pular e rolar no tapete. Mas a fralda ficava pesada, quente e cheia de barulho. Toda vez que {ele|ela} pulava, ela balançava: plec, plec, plec.",
      scene: `sunny living room with a big round rug; the {boy|girl} stands beside a toppled tower of colorful blocks, tugging at the waistband of the shorts with an uncomfortable frown, a bulky diaper showing above the waistband; ${FOX} lies on the rug.`,
      panel: "upper",
      refs: [],
    },
    {
      text: "Um dia, o papai chegou com uma caixa enorme. Dentro, um peniquinho vermelho com estrelinhas douradas. {nome} olhou bem e decidiu: aquilo não era um penico. Era um trono.",
      scene: `living room; ${DAD} kneels beside an open cardboard box; the {boy|girl} stands in front of it with wide sparkling eyes and both hands on the cheeks, looking at ${THRONE} sitting on the floor in front of the box.`,
      panel: "lower",
      refs: [],
    },
    {
      text: "Na consulta, [a|o] {pediatra} fez cócegas na barriga de {nome} e explicou: quando o xixi quer sair, o corpo avisa. É como uma formiguinha andando bem embaixo do umbigo.",
      scene: `bright consulting room with animal murals; the {boy|girl} sits on the exam table giggling while ${DRA} gently points one finger at the child's belly with a playful smile; ${MOM} stands beside the table holding ${FOX}.`,
      panel: "upper",
      refs: [],
    },
    {
      text: "[Ela|Ele] deu uma dica contada nos dedos: sentar no trono ao acordar, depois de comer e antes de dormir. Sem pressa. Se nada acontecer, tudo bem. É só treino.",
      scene: `same consulting room; ${DRA} sits on a low stool at the child's height holding up three fingers, a blank drawing pad with a simple picture of a small red potty resting on her knee; the {boy|girl} counts on {his|her} own fingers, tongue out in concentration; ${MOM} smiles behind.`,
      panel: "lower",
      refs: [4],
    },
    {
      text: "Em casa, o treino começou. {nome} sentou no trono de shorts e tudo, só para experimentar. O Tato, sua raposa de pelúcia, assistiu tudo. Nada aconteceu. Mas o trono era bem confortável.",
      scene: `sunny bathroom; the {boy|girl}, fully dressed, sits on ${THRONE} with ${FOX} on the lap, eyes closed and mouth open in a happy song, one hand raised like a conductor; a fluffy yellow bath mat under the potty.`,
      panel: "upper",
      refs: [],
    },
    {
      text: "Na manhã seguinte, a formiguinha andou. {nome} correu para o trono, sentou e... aconteceu! O primeiro xixi no trono! O papai dançou e a mamãe bateu palmas na porta.",
      scene: `bathroom doorway; the {boy|girl} stands beside ${THRONE} with both arms raised in victory and a huge open-mouthed smile; ${DAD} does a silly dance step in the doorway and ${MOM} claps beside him, both beaming.`,
      panel: "lower",
      refs: [3, 4],
    },
    {
      text: "Nem sempre a formiguinha avisava a tempo. Uma tarde, apareceu uma poça no tapete. {nome} ficou {quieto|quieta}. A mamãe só sorriu, trouxe um shorts seco e disse: acontece.",
      scene: `living room; the {boy|girl} stands looking down at a small puddle on the round rug with a shy face and hands behind the back; ${MOM} kneels beside {him|her} holding a folded pair of gray shorts identical to the ones worn, smiling kindly.`,
      panel: "upper",
      refs: [4],
    },
    {
      text: "A mamãe pregou um calendário na parede da cozinha. Cada xixi no trono valia uma estrela dourada. Em poucos dias, o calendário parecia um céu cheio de estrelas.",
      scene: `kitchen wall with a large blank calendar grid covered in golden star stickers; the {boy|girl} stands on a small stool pressing another star sticker onto it with one finger, proud; ${FOX} sits on the counter watching.`,
      panel: "lower",
      refs: [],
    },
    {
      text: "No meio da brincadeira mais divertida, a formiguinha andou. {nome} largou os blocos na hora e correu. Chegou a tempo! O Tato ficou esperando no tapete, sem entender nada.",
      scene: `living room seen from the rug; a half-built tower of colorful blocks stands abandoned in the foreground with ${FOX} propped beside it; in the background the {boy|girl} runs down the hallway toward the bathroom door, arms pumping.`,
      panel: "upper",
      refs: [],
    },
    {
      text: "No sábado, todos foram ao parque. No alto do escorregador, a formiguinha avisou. {nome} gritou para o papai, desceu rapidinho e chegou ao banheiro do parque bem a tempo. Ufa!",
      scene: `sunny playground; the {boy|girl} stands at the top of a red slide with one hand cupped at the mouth, calling out; below, ${DAD} looks up with arms open to catch {him|her} and ${MOM} points toward a small blue restroom building behind the trees.`,
      panel: "lower",
      refs: [3, 4],
    },
    {
      text: "Um dia, a formiguinha avisou diferente. Era cocô. {nome} sentou no trono, respirou fundo e esperou com calma. Deu certo! Depois, o papai levou tudo ao vaso e {nome} deu tchau.",
      scene: `bathroom; the {boy|girl} stands beside the toilet waving goodbye into it with a proud grin while ${DAD} presses the flush button with one hand and gives a thumbs up with the other; ${THRONE} sits on the bath mat.`,
      panel: "upper",
      refs: [3],
    },
    {
      text: "Agora {nome} era {professor|professora}. Sentou o Tato no trono e explicou tudo: a formiguinha, o sentar sem pressa, a estrela. O Tato escutou de orelhas bem abertas.",
      scene: `bathroom; ${FOX} sits propped on ${THRONE}; the {boy|girl} kneels in front of it pointing at the fox's belly with one finger, mouth open mid-explanation, eyebrows raised like a teacher.`,
      panel: "lower",
      refs: [],
    },
    {
      text: "Na semana seguinte, o primo menor veio visitar. Ele ainda usava fralda. {nome} pegou a mão dele e mostrou o trono, o calendário e todas as estrelas douradas.",
      scene: `sunny kitchen; the {boy|girl} holds the hand of ${COUSIN} and points up at the star-covered blank calendar on the wall; ${THRONE} sits on the floor beside them; the cousin looks up with his mouth open in awe.`,
      panel: "upper",
      refs: [],
    },
    {
      text: "O primo sentou no trono de roupa e tudo, igualzinho ao primeiro treino de {nome}. Não aconteceu nada. {nome} bateu palmas mesmo assim: o primeiro passo é sentar.",
      scene: `bathroom; ${COUSIN} sits fully dressed on ${THRONE} with a confused little smile; the {boy|girl} kneels in front clapping with a big encouraging grin; ${FOX} sits on the bath mat beside them.`,
      panel: "lower",
      refs: [14],
    },
    {
      text: "Chegou a noite mais importante: dormir sem fralda. {nome} fez xixi no trono, vestiu o pijama e deitou. A mamãe deixou a luz do corredor acesa, só um pouquinho.",
      scene: `the {boy|girl}'s bedroom at night; the {boy|girl} lies tucked in bed hugging ${FOX}, eyes half closed; ${MOM} stands at the half-open door blowing a kiss, warm hallway light spilling through the gap onto the floor.`,
      panel: "upper",
      refs: [4],
    },
    {
      text: "De manhã, {nome} apalpou o lençol. Seco! Sequinho! Correu para a cozinha gritando a novidade. O papai levantou {ele|ela} no alto e a mamãe fez panquecas em formato de estrela.",
      scene: `sunny kitchen; ${DAD} lifts the {boy|girl} high above his head, both laughing; ${MOM} stands at the stove holding a plate with star-shaped pancakes; ${FOX} sits on a chair.`,
      panel: "lower",
      refs: [3, 4],
    },
    {
      text: "Hoje {nome} usa {cueca de super-herói|calcinha de super-heroína}, vermelha com um raio amarelo. A fralda ficou no passado, junto com o plec, plec, plec. E o trono continua ali, esperando por {ele|ela}.",
      scene: `sunny bedroom; the {boy|girl}, fully dressed, holds up a folded pair of red underwear with a yellow lightning bolt like a trophy, chest out and chin up; ${FOX} sits on the bed wearing a tiny paper crown; a rolled-up diaper pack peeks out of an open closet.`,
      panel: "upper",
      refs: [],
    },
  ],
}
