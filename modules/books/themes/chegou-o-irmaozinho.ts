import type { BookTheme } from "@/modules/books/themes/types"

// Personagens fixos do tema. Descritos em toda cena em que aparecem; a
// primeira aparição vira página-âncora (refs) para as seguintes.
const MOM =
  "the mother, a warm woman with long straight dark hair, a mustard-yellow blouse and jeans"
const DAD =
  "the father, a tall man with short curly black hair, a light-gray sweater and dark trousers"
const GRANDMA =
  "the grandmother, a short woman with silver hair in a bun, round glasses and a purple floral dress"
const BABY =
  "the newborn baby, tiny, with round cheeks, a few wisps of dark hair and a mint-green onesie"

/**
 * Arco: a barriga da mamãe cresce e a criança sente o chute → a casa muda
 * (berço, visitas só falam do bebê) → o bebê chega, pequeno e barulhento →
 * ciúme e birra → a vovó volta, olha o desenho e faz a criança de capitão do
 * time (ouvir o coração do bebê, o choro é pedido de ajuda) e dá a dica do
 * tempo só com a mamãe → primeiras missões: fralda, cantar → primeiro sorriso do bebê
 * → dia difícil acolhido (amor multiplica) → foto do time → palminha → os dois
 * lendo na cama. O bebê não tem gênero no texto.
 * Índices do livro: 0 capa, 1 dedicatória, 2..18 história, 19 final.
 */
export const chegouOIrmaozinho: BookTheme = {
  slug: "chegou-o-irmaozinho",
  label: "Chegou o irmãozinho",
  title: "O Time {do|da} {nome}",
  subtitle: "Uma história sobre ganhar um irmãozinho.",
  defaultDedication:
    "{Capitão|Capitã} do time que só cresceu. O amor não divide: ele multiplica.",
  outfit:
    "a red t-shirt with a small white star on the chest, denim overalls and white sneakers",
  coverScene: `sunny living room; the {boy|girl} stands proudly on the sofa cushion with one arm raised like a team captain, the other hand resting gently on the head of ${BABY}, who lies on a soft blanket beside {him|her}; warm light, plants and a big window softly blurred behind.`,
  dedicationScene: `the {boy|girl}'s bedroom in soft morning light, no people: a small blue bed and a white crib side by side, a red baby rattle and a crayon drawing with colorful scribbles (no letters) on the rug between them; the upper half of the image is the plain, softly lit cream wall, visually quiet, with no objects, pictures or patterns.`,
  endingScene: `golden late afternoon in the living room; the {boy|girl} stands by the window waving toward the viewer with a big smile, ${BABY} lying safely on a soft blanket on the sofa behind {him|her}; the lower third of the image is the plain wooden floor, visually quiet, with no characters or objects.`,
  pages: [
    {
      text: "A barriga da mamãe estava ficando enorme. {nome} encostou a orelha ali e sentiu um chute de dentro. Era o bebê dizendo oi. {Ele|Ela} deu risada e disse oi de volta.",
      scene: `sunny living room; the {boy|girl} kneels on the sofa with one ear pressed against the big round belly of ${MOM}, eyes wide with delight; ${MOM} sits smiling with one hand on her belly.`,
      panel: "upper",
      refs: [],
    },
    {
      text: "A casa começou a mudar. Um berço branco apareceu bem no quarto de {nome}. O papai apertava os parafusos e assobiava. {nome} olhava da porta, sem saber se gostava daquilo.",
      scene: `the {boy|girl}'s bedroom; ${DAD} kneels tightening a screw on a new white crib placed beside the child's small blue bed; the {boy|girl} stands at the doorway holding a crayon drawing with colorful scribbles (no letters), lips pressed in doubt.`,
      panel: "lower",
      refs: [],
    },
    {
      text: "A vovó chegou com uma sacola cheia de presentinhos e só falava da barriga. {nome} mostrou o desenho novo, o mais bonito de todos. Ninguém olhou. A barriga ganhou até um beijo.",
      scene: `living room; ${GRANDMA} leans toward the big belly of ${MOM}, kissing it, a gift bag full of tiny baby clothes at her feet; the {boy|girl} stands beside them holding up the crayon drawing (colorful scribbles, no letters), shoulders drooping.`,
      panel: "upper",
      refs: [2],
    },
    {
      text: "Um dia, o bebê chegou. Era pequenininho, vermelho e enrugado, e fazia um barulho de gatinho. {nome} ficou na ponta dos pés para ver. Parecia um bonequinho de verdade.",
      scene: `living room; ${MOM} sits in an armchair holding ${BABY} wrapped in a blanket; the {boy|girl} stands on tiptoe beside the armchair, chin over the armrest, peeking at the baby with a curious, surprised face.`,
      panel: "lower",
      refs: [2],
    },
    {
      text: "De noite, o bebê chorava alto. Muito alto. A luz acendia, os passos iam e vinham, e {nome} enfiava a cabeça debaixo do travesseiro. Ninguém dormia direito naquela casa.",
      scene: `the {boy|girl}'s bedroom at night, lamp on; the {boy|girl} lies in the small blue bed with a pillow pressed over the head, only the eyes showing; in the white crib beside it ${BABY} cries with a wide open mouth and tiny fists; ${MOM} leans over the crib, hair messy, tired.`,
      panel: "upper",
      refs: [2, 5],
    },
    {
      text: "A mamãe agora estava sempre com o bebê no colo. {nome} pediu colo também e ouviu: espera um pouquinho. {Ele|Ela} jogou o ursinho no chão e cruzou os braços, {emburrado|emburrada}.",
      scene: `living room; ${MOM} sits on the sofa feeding ${BABY} with a bottle, looking down at the baby; in the foreground the {boy|girl} stands with arms crossed and a deep frown, a brown teddy bear lying on the rug at {his|her} feet.`,
      panel: "lower",
      refs: [2, 5],
    },
    {
      text: "A vovó voltou para ajudar e percebeu a cara emburrada de {nome}. Sentou no tapete, olhou o desenho com atenção e disse: um time precisa de {capitão|capitã}. E chamou {nome} para o cargo.",
      scene: `living room rug; ${GRANDMA} sits on the floor holding the child's crayon drawing (colorful scribbles, no letters) and looking at it with real attention; the {boy|girl} sits beside her with arms still half crossed but a curious face; the brown teddy bear on the rug.`,
      panel: "upper",
      refs: [4],
    },
    {
      text: "A primeira tarefa foi ouvir. A vovó encostou a orelha de {nome} no peito do bebê. Tum-tum, tum-tum, apressadinho. Era o coração dele, igual ao chute na barriga. {nome} arregalou os olhos.",
      scene: `sunny living room; ${BABY} lies on a soft blanket on the sofa; the {boy|girl} kneels with one ear pressed gently against the baby's chest, eyes wide and mouth open in amazement; ${GRANDMA} kneels beside them with a hand on the child's back, smiling.`,
      panel: "lower",
      refs: [8, 5],
    },
    {
      text: "A vovó explicou que o bebê chora porque ainda não sabe falar. O choro é o jeito dele de pedir ajuda. E deu uma dica para a mamãe: um tempinho só com {nome} todo dia.",
      scene: `living room; ${GRANDMA} sits on the sofa at the child's height talking to the {boy|girl} with open hands, gentle face; ${MOM} stands behind holding ${BABY}, nodding; warm afternoon light.`,
      panel: "upper",
      refs: [8, 2, 5],
    },
    {
      text: "Naquela tarde, o papai ficou com o bebê e a mamãe saiu só com {nome}. Foram ao parque, comeram picolé e balançaram alto. Era o tempo {deles|delas}, e ninguém chorou.",
      scene: `sunny park; the {boy|girl} sits on a swing at the top of its arc with legs stretched out, laughing, a half-eaten orange popsicle in one hand; ${MOM} stands behind the swing with both hands raised after the push, smiling widely.`,
      panel: "lower",
      refs: [2],
    },
    {
      text: "Em casa, veio a primeira missão de ajudante: buscar a fralda limpa. {nome} correu pelo corredor, escolheu a mais macia e entregou para o papai. Missão cumprida, e o bebê nem reclamou.",
      scene: `home hallway into the bedroom; the {boy|girl} holds out a clean white diaper with both hands and a proud grin toward ${DAD}, who kneels at a changing table where ${BABY} lies kicking tiny feet.`,
      panel: "upper",
      refs: [3, 5],
    },
    {
      text: "O bebê começou a chorar e a mamãe estava no banho. {nome} lembrou da dica: ele estava pedindo ajuda. Então cantou a música da escola, bem baixinho. O choro parou. Funcionou!",
      scene: `the {boy|girl}'s bedroom; the {boy|girl} stands on a small stool beside the white crib, leaning over the rail, hands on the rail, singing with a soft face; ${BABY} lies inside looking up quietly with big eyes.`,
      panel: "lower",
      refs: [5],
    },
    {
      text: "Na manhã seguinte, {nome} fez uma careta engraçada para o bebê. E o bebê abriu um sorriso enorme, sem dentes, o primeiro da vida. Foi para {nome}. Só para {nome}.",
      scene: `sunny bedroom; ${BABY} lies on a soft blanket on the bed with a huge toothless smile; the {boy|girl} lies on the tummy right in front, face close to the baby, cheeks puffed and eyes crossed in a silly face.`,
      panel: "upper",
      refs: [5],
    },
    {
      text: "Mas um dia {nome} chorou muito e disse que queria tudo como antes. A mamãe sentou no chão e abraçou {ele|ela} apertado. O amor não divide, explicou. Ele multiplica.",
      scene: `living room rug; ${MOM} sits on the floor hugging the {boy|girl} tightly, her cheek against the child's head; the {boy|girl} has wet cheeks and clings to her blouse; soft afternoon light.`,
      panel: "lower",
      refs: [2],
    },
    {
      text: "No domingo, todo mundo se arrumou para a foto no sofá. O papai apertou o botão e correu para sentar. {nome} segurou a mãozinha do bebê e sorriu. O time estava completo.",
      scene: `living room; ${MOM}, ${DAD} and the {boy|girl} sit close together on the sofa, ${BABY} on the mother's lap; the {boy|girl} holds the baby's tiny hand and smiles at the viewer; a phone on a tripod stands in the foreground, screen blank.`,
      panel: "upper",
      refs: [2, 3, 5],
    },
    {
      text: "{nome} ensinou o bebê a bater palminha. Pegou as mãozinhas gordinhas e bateu uma na outra, bem devagar. Palma, palma, palma. O bebê deu um gritinho de alegria.",
      scene: `sunny bedroom rug; the {boy|girl} sits cross-legged facing ${BABY}, who is propped on a cushion; the child holds the baby's two tiny hands together in a clap, both laughing.`,
      panel: "lower",
      refs: [5],
    },
    {
      text: "Hoje, antes de dormir, {nome} senta na cama com o bebê no colo e lê a história favorita. Do jeito {dele|dela}, inventando tudo. E o time inteiro dorme junto, tranquilo.",
      scene: `the {boy|girl}'s bedroom at night, warm lamp light; the {boy|girl} sits against the pillows of the small blue bed with ${BABY} resting on {his|her} lap and an open picture book with blank pages; ${MOM} stands at the doorway watching with a tender smile.`,
      panel: "upper",
      refs: [5, 2],
    },
  ],
}
