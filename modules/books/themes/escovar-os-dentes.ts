import type { BookTheme } from "@/modules/books/themes/types"

// Personagens fixos do tema. Descritos em toda cena em que aparecem; a
// primeira aparição vira página-âncora (refs) para as seguintes.
const MOM =
  "the mother, a warm woman with straight black hair in a high ponytail, wearing a mustard-yellow sweater and jeans"
const DAD =
  "the father, a tall man with short curly brown hair, round glasses, a green polo shirt and khaki pants"
const DRA =
  "Dra. Lia, a friendly pediatrician with short brown hair, a white coat over teal scrubs, a colorful stethoscope and a warm smile"
const DENTIST =
  "the dentist, a cheerful man with a shaved head, a short gray beard, a light-blue tunic and small round mirror tool in hand"
const COUSIN =
  "the little cousin, a toddler girl with two small dark hair buns and a mint-green dress"
const BUGS =
  "tiny cartoon sugar bugs, round and sticky-looking, in pastel pink and green, with big silly eyes"
const BRUSH =
  "a red toothbrush with a small cartoon dinosaur head on the handle"

/**
 * Arco: foge da escova → na consulta (2 páginas), o pediatra mostra os
 * bichinhos do açúcar e dá a dica (2 minutos com música, manhã e noite, adulto
 * termina) → a criança imagina a escova heroína e conta ao papai → escova
 * nova de dinossauro → escovação vira brincadeira → esquece um dia e
 * sente o gosto ruim → calendário → dentista sem medo → ensina a prima →
 * sorriso brilhante. Roupa de dia única em todas as cenas.
 * Índices do livro: 0 capa, 1 dedicatória, 2..18 história, 19 final.
 */
export const escovarOsDentes: BookTheme = {
  slug: "escovar-os-dentes",
  label: "Escovar os dentes",
  title: "O Sorriso {do|da} {nome}",
  subtitle: "Uma história sobre escovar os dentes todo dia.",
  defaultDedication:
    "Para {nome}, que descobriu que cuidar do sorriso é uma aventura de dois minutos. Que ele brilhe sempre, {pequeno herói|pequena heroína}.",
  outfit:
    "a light-green t-shirt with a small white star on the chest, blue denim shorts and red sneakers",
  coverScene: `sunny bathroom; the {boy|girl} stands on a small wooden stool in a heroic pose, holding ${BRUSH} up high like a sword, a huge bright smile with sparkling teeth; a few ${BUGS} run away in the background; soft light-blue wall behind.`,
  dedicationScene: `bathroom in soft morning light, no people: ${BRUSH} and a small pink toothpaste tube with a blank label rest in a cup on the edge of the white sink; the upper half of the image is the plain, softly lit light-blue wall, visually quiet, with no objects, pictures or patterns.`,
  endingScene: `bright morning; the {boy|girl} stands at the bathroom door waving toward the viewer with a big sparkling smile, ${BRUSH} in the other hand; the lower third of the image is the plain wooden hallway floor, visually quiet, with no characters or objects.`,
  pages: [
    {
      text: "Toda noite, a mesma corrida. Quando a mamãe aparecia com a escova, {nome} sumia debaixo da mesa, atrás do sofá ou embaixo do cobertor. Escovar os dentes? Nem pensar.",
      scene: `evening living room; the {boy|girl} peeks out from under the dining table with a mischievous grin, only head and hands visible; ${MOM} stands in the doorway holding a toothbrush and a tube of toothpaste with a blank label, one eyebrow raised, smiling.`,
      panel: "upper",
      refs: [],
    },
    {
      text: "A pasta tinha gosto forte, a escova fazia cócegas e demorava um tempão. {nome} preferia mil vezes mais uma história, um pulo no sofá ou um pedaço de bolo de chocolate.",
      scene: `bathroom at night; the {boy|girl} stands on a small wooden stool at the sink making a sour face with the tongue out, a plain toothbrush held far away from the mouth, toothpaste foam on the chin; ${MOM} beside {him|her} holds back a laugh.`,
      panel: "lower",
      refs: [2],
    },
    {
      text: "Na consulta, {nome} abriu a boca bem grande. [A|O] {pediatra} olhou com a lanterninha e mostrou um desenho: bichinhos grudentos que adoram açúcar e fazem buraquinhos nos dentes. Que nojo, disse {nome}.",
      scene: `bright consulting room; the {boy|girl} sits on the exam table with the mouth wide open, nose wrinkled; ${DRA} shines a small penlight into the child's mouth with one hand and holds up a drawing of a big cartoon tooth covered with ${BUGS} (a picture only, no letters) with the other; ${MOM} watches from a chair by the wall.`,
      panel: "upper",
      refs: [2],
    },
    {
      text: "Mas os bichinhos têm uma inimiga: a escova. [A|O] {pediatra} ensinou o plano: dois minutos, com música, de manhã e antes de dormir. E um adulto dá a passada final nos dentes de trás.",
      scene: `${DRA} crouches at the child's height holding up two fingers with a kind smile; the {boy|girl} copies the gesture, two fingers up, standing beside ${MOM} near the consulting room door.`,
      panel: "lower",
      refs: [4, 2],
    },
    {
      text: "No caminho de casa, {nome} não parava de pensar nos bichinhos. Imaginou a escova chegando de capa, varrendo todo mundo para fora. Uma escova heroína! Precisava de uma dessas.",
      scene: `sunny sidewalk; the {boy|girl} walks beside ${MOM} looking up dreamily; above the child's head a soft daydream cloud shows a cartoon toothbrush with a tiny cape sweeping ${BUGS} off a shiny tooth (a picture only, no letters).`,
      panel: "upper",
      refs: [2],
    },
    {
      text: "Em casa, {nome} contou tudo para o papai: os visitantes grudentos, a escova heroína, os dois minutos com música. O papai arregalou os olhos e perguntou: e onde a gente acha uma heroína dessas?",
      scene: `evening living room; the {boy|girl} stands on the rug gesturing with both arms wide, telling a story with an excited face; ${DAD} sits on the sofa leaning forward with raised eyebrows and a playful surprised smile.`,
      panel: "lower",
      refs: [],
    },
    {
      text: "Na farmácia, {nome} escolheu uma escova nova, vermelha, com um dinossauro no cabo. E uma pasta de gosto suave, de morango. O dinossauro parecia pronto para a batalha.",
      scene: `colorful pharmacy aisle with shelves of blank boxes; the {boy|girl} holds up ${BRUSH} with both hands like a trophy, eyes shining; ${MOM} holds a small pink toothpaste tube with a blank label beside {him|her}.`,
      panel: "upper",
      refs: [2],
    },
    {
      text: "Naquela noite, o papai ligou a música e a batalha começou. {nome} escovou em cima, embaixo, na frente, atrás. No espelho, fez cara de leão, de peixe e de robô.",
      scene: `bathroom at night, warm light; the {boy|girl} stands on the stool brushing with ${BRUSH}, foam around the mouth, pulling a wide roaring lion face at the mirror; ${DAD} stands behind holding a phone with a blank screen, swaying to the music.`,
      panel: "lower",
      refs: [7],
    },
    {
      text: "Quando a música acabou, o papai deu a passada final nos dentes de trás. {nome} passou a língua: tudo liso, tudo fresquinho. Nenhum bichinho tinha sobrado para contar história.",
      scene: `${DAD} kneels beside the stool gently brushing the back teeth of the {boy|girl} with ${BRUSH}; the child tilts the head back with the mouth wide open and eyes squeezed shut in a giggle; warm bathroom light.`,
      panel: "upper",
      refs: [9],
    },
    {
      text: "Numa manhã de sono, {nome} pulou a escovação e saiu correndo. Na escola, a boca ficou com um gosto esquisito, meio azedo. Os bichinhos tinham voltado para a festa.",
      scene: `sunny classroom corner; the {boy|girl} sits alone at a small table with a blank workbook, running the tongue over the teeth with a puzzled, sour expression; a faint daydream of ${BUGS} dancing above {his|her} head.`,
      panel: "lower",
      refs: [],
    },
    {
      text: "Em casa, {nome} fez um calendário com a mamãe: um sol para a escovação da manhã e uma lua para a da noite. Cada dia completo ganhava um adesivo brilhante.",
      scene: `kitchen table; the {boy|girl} presses a shiny star sticker onto a hand-drawn chart with small sun and moon drawings and no letters or numbers, tongue poking out in concentration; ${MOM} holds the sheet of stickers beside {him|her}.`,
      panel: "upper",
      refs: [2],
    },
    {
      text: "Uma semana depois, o calendário estava cheio de adesivos. Escovar virou coisa automática, como calçar o sapato. E {nome} nem lembrava mais do gosto azedo.",
      scene: `morning kitchen; the {boy|girl} stands proudly in front of the fridge where the chart hangs, now covered with shiny star stickers (drawings only, no letters), pointing at it with ${BRUSH} in the other hand.`,
      panel: "lower",
      refs: [],
    },
    {
      text: "Chegou o dia do dentista. A cadeira subia como um foguete, a luz era forte e o dentista tinha um espelhinho na ponta de um cabo. {nome} abriu a boca sem medo.",
      scene: `bright dental office; the {boy|girl} lies back on a big reclining dental chair with the mouth wide open, hands relaxed on the belly; ${DENTIST} leans in holding the small round mirror tool; a large lamp glows above.`,
      panel: "upper",
      refs: [],
    },
    {
      text: "O dentista contou os dentes um por um e não achou nenhum buraquinho. Disse que eram os dentes mais brilhantes da semana. {nome} quase não cabia de orgulho.",
      scene: `${DENTIST} gives a big thumbs up beside the dental chair; the {boy|girl} sits up on the chair showing a huge toothy grin, chest puffed out; ${MOM} claps from the doorway.`,
      panel: "lower",
      refs: [14, 2],
    },
    {
      text: "No fim de semana, a prima menor veio brincar. Na hora de dormir, ela fez careta para a escova e tentou fugir. {nome} conhecia bem aquela cara.",
      scene: `bathroom door at night; ${COUSIN} stands with arms crossed and a pouting face, turning away from a small purple toothbrush on the sink; the {boy|girl} watches from the doorway with a knowing smile, ${BRUSH} in hand.`,
      panel: "upper",
      refs: [],
    },
    {
      text: "Então {nome} ligou a música, subiu no banquinho e mostrou: cara de leão, cara de peixe, cara de robô. A prima riu tanto que escovou os dentes sem perceber.",
      scene: `the {boy|girl} and ${COUSIN} stand side by side on two stools at the sink, both brushing with foam around their mouths, pulling silly puffed-cheek fish faces at the mirror; a toothpaste tube with a blank label on the sink.`,
      panel: "lower",
      refs: [16],
    },
    {
      text: "Hoje {nome} escova de manhã e antes de dormir, sem ninguém pedir. No espelho, o sorriso brilha como uma estrela. E os bichinhos? Nunca mais voltaram para a festa.",
      scene: `sunny bathroom morning; the {boy|girl} stands on the stool smiling widely at the mirror, sparkling clean teeth with a tiny star glint, ${BRUSH} held up like a sword; the mirror reflection shows the same bright smile.`,
      panel: "upper",
      refs: [],
    },
  ],
}
