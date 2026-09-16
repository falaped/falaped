import type { BookTheme } from "@/modules/books/themes/types"

// Personagens fixos do tema. Descritos em toda cena em que aparecem; a
// primeira aparição vira página-âncora (refs) para as seguintes.
const MOM =
  "the mother, a woman with curly auburn hair in a ponytail, a white linen shirt and olive trousers"
const DRA =
  "Dra. Lia, a friendly pediatrician with short brown hair, a white coat over teal scrubs, a colorful stethoscope and a warm smile"
const TEACHER =
  "the teacher, Tia Bia, a young woman with a short black bob, a yellow apron with big pockets over a striped t-shirt"
const TEO =
  "Téo, a classmate boy the same age as the main character, with freckles, short red hair and a green t-shirt"
const BACKPACK = "a small orange backpack with a white cloud patch"

/**
 * Arco: mochila nova e perguntas na noite anterior → na consulta o pediatra
 * explica o friozinho na barriga (motor que liga antes das coisas novas) e
 * ensina o ritual: beijo, abraço apertado, aceno pela janela, a mamãe sempre
 * volta → manhã sem soltar a mão → portão, professora → ritual → sala com
 * cheiro de giz, lugar da tartaruga → colega chorando ganha o giz e vira amigo
 * → pátio, lanche, hora da história → relógio e espera → a mamãe volta →
 * conta tudo → segundo dia entra sozinho → mochila cheia de desenhos.
 * Índices do livro: 0 capa, 1 dedicatória, 2..18 história, 19 final.
 */
export const primeiroDiaNaEscola: BookTheme = {
  slug: "primeiro-dia-na-escola",
  label: "Primeiro dia na escola",
  title: "A Mochila {do|da} {nome}",
  subtitle: "Uma história sobre o primeiro dia na escola.",
  defaultDedication:
    "Para {nome}, que descobriu que o friozinho na barriga é só o motor da coragem ligando.",
  outfit:
    "a light-blue polo shirt, navy shorts, white socks and red sneakers",
  coverScene: `sunny morning in front of a colorful school gate; the {boy|girl} stands with feet apart and a proud grin, both thumbs hooked into the straps of ${BACKPACK}, chin up; a cheerful low school building with a red roof softly blurred behind, bright blue sky.`,
  dedicationScene: `the {boy|girl}'s bedroom in soft morning light, no people: ${BACKPACK} sits zipped on a small wooden chair beside a neatly made bed, a pair of red sneakers on the floor below it; the upper half of the image is the plain, softly lit pale-green wall, visually quiet, with no objects, pictures or patterns.`,
  endingScene: `golden late afternoon at the school gate; the {boy|girl} stands wearing ${BACKPACK}, waving goodbye toward the viewer with a wide smile, a rolled crayon drawing in the other hand; the lower third of the image is the plain sunlit pavement, visually quiet, with no characters or objects.`,
  pages: [
    {
      text: "A mochila nova estava na cadeira, pronta desde cedo. Mas {nome} não conseguia dormir. E se ninguém quisesse brincar? E se a mamãe esquecesse a hora de buscar? A barriga gelou.",
      scene: `the {boy|girl}'s bedroom at night, lamp on; the {boy|girl} sits up in bed hugging the knees with a worried face, staring at ${BACKPACK} sitting on a small wooden chair; ${MOM} sits on the edge of the bed with a hand on the child's foot.`,
      panel: "upper",
      refs: [],
    },
    {
      text: "Naquela semana teve consulta. {nome} contou do friozinho na barriga. [A|O] {pediatra} sorriu e explicou: é um motor que liga antes das coisas novas. Ele avisa que algo importante vai começar.",
      scene: `bright consulting room; the {boy|girl} sits on the padded exam table with both hands on the belly; ${DRA} sits in front at the child's height, one hand on her own chest, explaining with a warm smile; ${MOM} stands beside the table.`,
      panel: "lower",
      refs: [2],
    },
    {
      text: "Depois [a|o] {pediatra} ensinou um segredo para a despedida: um beijo, um abraço apertado e um aceno pela janela. E uma promessa que nunca falha: a mamãe sempre volta.",
      scene: `consulting room; ${DRA} holds up three fingers with a playful face while the {boy|girl} copies her, holding up three fingers too; ${MOM} laughs beside them; a blank poster on the wall.`,
      panel: "upper",
      refs: [3, 2],
    },
    {
      text: "A manhã chegou rápido demais. {nome} vestiu a roupa nova, comeu só metade do pão e segurou a mão da mamãe com força. No caminho inteiro, não soltou nem um segundinho.",
      scene: `sunny sidewalk lined with trees; the {boy|girl} walks pressed close to ${MOM}, gripping her hand with both hands, wearing ${BACKPACK}, eyes fixed ahead; the mother looks down at the child with a gentle smile.`,
      panel: "lower",
      refs: [2],
    },
    {
      text: "No portão da escola tinha barulho de criança por todo lado. Uma moça de avental amarelo se abaixou e disse: oi, {nome}! Eu sou a Tia Bia. Ela já sabia o nome {dele|dela}!",
      scene: `colorful school gate with a low red-roofed building behind; ${TEACHER} crouches at the child's height with open hands and a big smile; the {boy|girl} stands half behind ${MOM}, peeking out, wearing ${BACKPACK}.`,
      panel: "upper",
      refs: [2],
    },
    {
      text: "Hora do segredo. Um beijo. Um abraço apertado, daqueles que quase estalam. Depois a mamãe foi até a janela e acenou. {nome} acenou de volta, com o friozinho ligado, mas de pé.",
      scene: `inside the school entrance seen from within; the {boy|girl} stands at a big window with one hand raised in a wave, ${TEACHER} standing behind with a hand on the child's shoulder; outside the glass ${MOM} waves back with a bright smile.`,
      panel: "lower",
      refs: [2, 6],
    },
    {
      text: "A sala tinha cheiro de giz de cera e um tapete colorido. Cada cabide tinha um bichinho. O de {nome} era uma tartaruga verde. Era o lugar {dele|dela}, e de mais ninguém.",
      scene: `bright classroom with a round colorful rug and low tables; the {boy|girl} hangs ${BACKPACK} on a wooden hook marked with a small painted green turtle (a picture only, no letters), looking at it with a small proud smile; ${TEACHER} arranges crayons on a table behind.`,
      panel: "upper",
      refs: [6],
    },
    {
      text: "Na mesa ao lado, um menino de cabelo vermelho chorava baixinho. {nome} lembrou do friozinho. Pegou o giz azul, o mais bonito, e colocou na frente dele. O menino parou de chorar.",
      scene: `classroom table; ${TEO} sits with tears on his freckled cheeks and a blank sheet of paper in front of him; the {boy|girl} stands beside him holding out a blue crayon; a box of crayons on the table.`,
      panel: "lower",
      refs: [],
    },
    {
      text: "O menino se chamava Téo. Ele desenhou um foguete e {nome} desenhou a tartaruga do cabide. Os dois riram do foguete torto. Pronto: {nome} tinha um amigo, e nem tinha chegado o lanche.",
      scene: `classroom table; the {boy|girl} and ${TEO} sit side by side laughing, each holding up a sheet with colorful crayon scribbles (no letters); crayons scattered on the table between them.`,
      panel: "upper",
      refs: [9],
    },
    {
      text: "No pátio, o escorregador era enorme e brilhava no sol. {nome} subiu, respirou fundo e desceu gritando de alegria. Téo veio logo atrás. Os dois caíram na grama, rindo sem parar.",
      scene: `sunny schoolyard with a tall yellow slide; the {boy|girl} sits at the bottom of the slide on the grass with arms up and mouth open in a laugh, ${TEO} sitting right behind {him|her} at the end of the slide, both with grass on their knees.`,
      panel: "lower",
      refs: [9],
    },
    {
      text: "Na hora do lanche, {nome} abriu a lancheira e achou um bilhete de coração da mamãe. Trocou metade da banana por metade do biscoito do Téo. Ficou o melhor lanche do mundo.",
      scene: `low lunch table in the classroom; the {boy|girl} and ${TEO} sit facing each other, each holding half a banana and half a cookie, grinning; an open blue lunchbox with a small red paper heart (no letters) propped inside it.`,
      panel: "upper",
      refs: [9],
    },
    {
      text: "Depois, Tia Bia sentou no tapete e abriu um livro grande. Todo mundo chegou perto. {nome} sentou bem na frente, com o Téo do lado, e esqueceu do friozinho por um tempão.",
      scene: `classroom rug; ${TEACHER} sits cross-legged holding open a big picture book with blank pages toward the children; the {boy|girl} and ${TEO} sit at the front of the rug, leaning forward with open mouths; no other children visible.`,
      panel: "lower",
      refs: [6, 9],
    },
    {
      text: "Perto do fim, {nome} olhou para o relógio grande da parede. As outras crianças começaram a ir embora. O friozinho voltou. {Ele|Ela} respirou fundo e lembrou: a mamãe sempre volta.",
      scene: `classroom by the window, late afternoon light; the {boy|girl} stands alone holding the straps of ${BACKPACK}, looking up at a big round wall clock with plain hands and no numbers; a calm but tense face.`,
      panel: "upper",
      refs: [],
    },
    {
      text: "E ela voltou. Bem ali no portão, com os braços abertos, exatamente como tinha prometido. {nome} correu tão rápido que a mochila pulava nas costas. O abraço quase estalou de novo.",
      scene: `school gate in golden light; ${MOM} kneels with arms wide open; the {boy|girl} is a step away leaning into the hug, ${BACKPACK} bouncing on the back, huge smile; ${TEACHER} watches from the doorway behind.`,
      panel: "lower",
      refs: [2, 6],
    },
    {
      text: "No caminho de casa, {nome} falou sem parar: do Téo, da tartaruga verde, do escorregador gigante e do foguete torto. A mamãe ouviu tudo, três vezes. E pediu para contar de novo.",
      scene: `sunny sidewalk on the way home; the {boy|girl} walks beside ${MOM} gesturing with both arms wide, telling a story with an excited face, ${BACKPACK} on the back; the mother listens laughing.`,
      panel: "upper",
      refs: [2],
    },
    {
      text: "No segundo dia, {nome} deu o beijo e o abraço no portão e entrou {sozinho|sozinha}. Da janela, acenou para a mamãe. Téo já estava lá, guardando o giz azul para {ele|ela}.",
      scene: `inside the school entrance; the {boy|girl} stands at the big window waving with a confident smile, ${TEO} beside {him|her} holding up a blue crayon; outside the glass ${MOM} waves back.`,
      panel: "lower",
      refs: [2, 9],
    },
    {
      text: "Hoje a mochila de {nome} volta cheia de desenhos todo dia. Tem foguete, tem tartaruga, tem a Tia Bia de avental. O friozinho ainda aparece às vezes. Mas agora {ele|ela} sabe: é só o motor ligando.",
      scene: `home kitchen in warm evening light; the {boy|girl} stands on a stool sticking a crayon drawing with colorful scribbles (no letters) onto a fridge already covered with drawings, ${BACKPACK} open on the counter; ${MOM} holds out another drawing, smiling.`,
      panel: "upper",
      refs: [2],
    },
  ],
}
