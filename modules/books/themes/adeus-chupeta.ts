import type { BookTheme } from "@/modules/books/themes/types"

// Personagens fixos do tema. Descritos em toda cena em que aparecem; a
// primeira aparição vira página-âncora (refs) para as seguintes.
const MOM =
  "the mother, a warm woman with long straight black hair, a thin gold necklace and a sage-green linen dress"
const DAD =
  "the father, a stocky man with a shaved head, a short dark beard and a striped navy-and-white t-shirt"
const DRA =
  "Dra. Lia, a friendly pediatrician with short brown hair, a white coat over teal scrubs, a colorful stethoscope and a warm smile"
const PACIFIER =
  "the pacifier, a light-blue pacifier with a small white star on its round shield"
const NEIGHBOR =
  "the neighbor Dona Rosa, an elderly woman with short white hair, round red glasses and a flowery apron"
const BABY =
  "baby Theo, a chubby baby boy with a single dark curl on top of his head, wearing a yellow onesie"
const NINA =
  "Nina, a girl the same age with two braids tied with red ribbons, a purple dress and white sandals, a pink pacifier in her mouth"
const BOX =
  "a small gift box covered in shiny stickers and a big red bow"

/**
 * Despedida da chupeta. Arco: a chupeta vai a todo lugar → falar com ela é
 * difícil → consulta: o desenho da boca e o espaço para falar bonito →
 * a criança escolhe o dia da despedida → decide dar de presente para um bebê →
 * enfeita a caixinha → entrega → primeira noite difícil, abraço e canção →
 * dias bons e ruins → lembra do bebê feliz → boca livre → elogio na volta ao
 * consultório → ajuda a amiga Nina → sorriso largo e frase inteira.
 * Índices do livro: 0 capa, 1 dedicatória, 2..18 história, 19 final.
 */
export const adeusChupeta: BookTheme = {
  slug: "adeus-chupeta",
  label: "Adeus, chupeta",
  title: "O Presente {do|da} {nome}",
  subtitle: "Uma história sobre se despedir da chupeta.",
  defaultDedication:
    "Para {nome}, que escolheu {sozinho|sozinha} o dia da despedida e descobriu um sorriso ainda maior. Que boca linda para falar coisas bonitas.",
  outfit:
    "a coral t-shirt with a white sailboat on the chest, denim shorts with rolled cuffs and white sneakers",
  coverScene: `sunny front porch of a small house; the {boy|girl} stands holding ${BOX} out toward the viewer with both hands, a huge open smile showing small white teeth, chin up with pride; potted flowers and a wooden door softly blurred behind.`,
  dedicationScene: `the {boy|girl}'s bedroom in soft morning light, no people: ${BOX} sits open and empty on the wooden nightstand beside a small lamp, its red bow untied; the upper half of the image is the plain, softly lit peach wall, visually quiet, with no objects, pictures or patterns.`,
  endingScene: `golden late afternoon on the front porch; the {boy|girl} stands at the top of the steps waving toward the viewer with a wide smile showing small white teeth, the other hand on the hip; the lower third of the image is the plain sunlit stone path, visually quiet, with no characters or objects.`,
  pages: [
    {
      text: "{nome} tinha uma chupeta azul com uma estrelinha branca. Ela ia a todo lugar: no café, no parque, no banho e na cama. Até para pular corda a chupeta ia junto.",
      scene: `sunny playground; the {boy|girl} stands on the grass holding a skipping rope in both hands, ${PACIFIER} in the mouth and its clip fastened to the t-shirt, cheeks puffed; a wooden swing set behind.`,
      panel: "upper",
      refs: [],
    },
    {
      text: "Só tinha um problema: falar com a chupeta na boca era difícil. {nome} pedia suco e saía fufu. Pedia bola e saía bubu. A mamãe ria e não entendia nada.",
      scene: `bright kitchen; the {boy|girl} points at a jug of orange juice on the counter with ${PACIFIER} in the mouth, eyebrows raised; ${MOM} bends toward {him|her} with a hand cupped behind her ear and a puzzled, amused smile.`,
      panel: "lower",
      refs: [],
    },
    {
      text: "Na consulta, [a|o] {pediatra} mostrou um desenho de uma boca sorridente. Explicou que a chupeta empurra os dentinhos e que a boca precisa de espaço para crescer e falar bonito.",
      scene: `bright consulting room with animal murals; ${DRA} sits on a low stool holding up a blank drawing pad showing a simple picture of a big smiling mouth with teeth, no letters; the {boy|girl} sits on the exam table leaning forward with ${PACIFIER} in the mouth; ${MOM} sits on a chair beside.`,
      panel: "upper",
      refs: [3],
    },
    {
      text: "[Ela|Ele] perguntou se {nome} queria escolher um dia para se despedir. {nome} pensou, pensou e apontou no calendário: sábado. [A|O] {pediatra} sorriu e disse que era uma ótima escolha.",
      scene: `same consulting room; the {boy|girl} stands on tiptoe pressing one finger on a large blank calendar grid on the wall, ${PACIFIER} clipped to the shirt; ${DRA} nods with a proud smile beside {him|her}; ${MOM} watches from her chair with hands together.`,
      panel: "lower",
      refs: [4, 3],
    },
    {
      text: "Em casa, {nome} teve uma ideia. A chupeta não ia para o lixo. Ia ser um presente! Os bebês precisavam de chupeta, e {nome} já era grande. Ia dar para um bebê.",
      scene: `sunny living room; the {boy|girl} stands on the rug with one finger raised and a bright idea face, ${PACIFIER} held in the other hand; ${MOM} sits on the sofa behind with a surprised smile.`,
      panel: "upper",
      refs: [3],
    },
    {
      text: "{nome} enfeitou uma caixinha com adesivos brilhantes e um laço vermelho. Colocou a chupeta dentro, bem no meio. Deu um último beijo nela e fechou a tampa devagar.",
      scene: `child's desk by a window; the {boy|girl} sits placing ${PACIFIER} inside ${BOX}, lips puckered in a small kiss toward it; sheets of shiny stickers and a roll of red ribbon scattered on the desk.`,
      panel: "lower",
      refs: [],
    },
    {
      text: "No sábado, {nome} atravessou a rua com a caixinha. A vizinha Dona Rosa abriu a porta com o bebê Theo no colo. {nome} entregou o presente e o Theo agarrou a caixa, gargalhando.",
      scene: `front porch of a neighboring house with flower pots; ${NEIGHBOR} stands at the open door holding ${BABY} on her hip; the {boy|girl} holds ${BOX} up toward the baby, who grabs at it with both little hands and a huge laugh.`,
      panel: "upper",
      refs: [],
    },
    {
      text: "A primeira noite foi difícil. A boca de {nome} parecia vazia e estranha. {Ele|Ela} chamou a mamãe e pediu a chupeta. A mamãe sentou na cama e ofereceu um abraço apertado.",
      scene: `dim bedroom at night with a small lamp; the {boy|girl} sits up in bed with a pout and teary eyes, one hand touching the own lips; ${MOM} sits on the edge of the bed with both arms open wide toward {him|her}.`,
      panel: "lower",
      refs: [3],
    },
    {
      text: "Depois do abraço, veio uma canção baixinha, daquelas que a mamãe cantava quando {nome} era bebê. Demorou um pouco. Mas os olhos foram pesando, pesando, até fechar.",
      scene: `same dim bedroom; ${MOM} sits on the edge of the bed stroking the hair of the {boy|girl}, who lies curled under the blanket with heavy half-closed eyes and a calm face; the lamp glows warm.`,
      panel: "upper",
      refs: [3],
    },
    {
      text: "Alguns dias foram fáceis: {nome} brincava e nem lembrava da chupeta. Outros foram difíceis. Um dia {ele|ela} caiu de joelho no quintal e quis a chupeta. O papai soprou o joelho e abraçou.",
      scene: `sunny backyard with grass and a small vegetable patch; the {boy|girl} sits on the ground holding one scraped knee with a trembling lip; ${DAD} kneels beside {him|her} with cheeks puffed, blowing gently on the knee, one arm around the child's shoulders.`,
      panel: "lower",
      refs: [],
    },
    {
      text: "Nas horas difíceis, {nome} lembrava do Theo. Imaginava o bebê com a chupeta azul na boca, dormindo tranquilo. A chupeta estava fazendo alguém feliz. Isso deixava {nome} feliz também.",
      scene: `the {boy|girl} sits on the backyard steps with the chin resting on the hands and a soft dreamy smile; above {him|her} a large rounded thought bubble shows ${BABY} sleeping in a crib with ${PACIFIER} in his mouth.`,
      panel: "upper",
      refs: [8],
    },
    {
      text: "Sem a chupeta, a boca de {nome} descobriu coisas novas. Soprou bolhas de sabão enormes. Tentou assobiar e saiu só vento. Cantou tão alto que o cachorro do vizinho latiu junto.",
      scene: `sunny backyard; the {boy|girl} blows a giant soap bubble through a bubble wand, cheeks round and eyes crossed looking at it; a scruffy brown dog behind the wooden fence has its head tilted up, mouth open in a howl.`,
      panel: "lower",
      refs: [],
    },
    {
      text: "Na volta ao consultório, [a|o] {pediatra} pediu para {nome} abrir bem a boca. Olhou os dentinhos e disse: que espaço lindo! {nome} ganhou um adesivo de estrela e um elogio enorme.",
      scene: `bright consulting room; the {boy|girl} sits on the exam table with the mouth open wide while ${DRA} shines a small penlight at it, smiling; ${MOM} stands beside holding a sheet of star stickers ready.`,
      panel: "upper",
      refs: [4, 3],
    },
    {
      text: "No parque, {nome} viu a Nina, sua amiga de tranças. Ela estava no balanço com a chupeta rosa na boca e um olhar tristonho. A mãe dela tinha pedido para largar a chupeta.",
      scene: `sunny playground; ${NINA} sits still on a wooden swing with drooping shoulders and sad eyes; the {boy|girl} stands a few steps away looking at her with a kind, curious face.`,
      panel: "lower",
      refs: [],
    },
    {
      text: "{nome} sentou no balanço ao lado e contou tudo: a caixinha, o laço, o bebê Theo e a canção da mamãe. A Nina tirou a chupeta da boca para escutar melhor. E sorriu.",
      scene: `the two swings side by side; the {boy|girl} leans toward ${NINA} talking with hands raised in the shape of a box; Nina holds her pink pacifier in one hand away from her mouth, smiling shyly with her mouth free.`,
      panel: "upper",
      refs: [15],
    },
    {
      text: "Em casa, {nome} correu para o espelho do banheiro e abriu o maior sorriso do mundo. Os dentinhos brancos estavam todos ali, retinhos, com espaço de sobra para crescer.",
      scene: `bathroom mirror seen from behind the child's shoulder; the {boy|girl} stands on a small stool leaning toward the mirror, the reflection showing a huge wide smile with small white teeth and squeezed happy eyes.`,
      panel: "lower",
      refs: [],
    },
    {
      text: "Naquela noite, antes de dormir, {nome} olhou para a mamãe e disse bem alto e claro, sem nenhum fufu: mamãe, eu te amo muito! A mamãe entendeu cada palavra.",
      scene: `cozy bedroom at night with a warm lamp; the {boy|girl} sits up in bed with arms stretched wide and a bright open smile; ${MOM} sits on the edge of the bed with a hand on her heart and shining eyes.`,
      panel: "upper",
      refs: [3],
    },
  ],
}
