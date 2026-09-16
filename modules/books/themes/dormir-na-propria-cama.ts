import type { BookTheme } from "@/modules/books/themes/types"

// Personagens fixos do tema. Descritos em toda cena em que aparecem; a
// primeira aparição vira página-âncora (refs) para as seguintes.
const MOM =
  "the mother, a warm woman with wavy chestnut hair to the shoulders, wearing a soft lilac pajama set"
const DAD =
  "the father, a tall man with short dark hair, a trimmed beard, a gray t-shirt and navy pajama pants"
const DINO =
  "Dino, a plush green dinosaur with a cream belly, a stitched smile and small felt spikes, about the size of the child's torso"
const COUSIN =
  "the smaller cousin, a little girl with straight black hair in a ponytail and a peach pajama set, hugging a small white pillow"

/**
 * Roteiro validado no teste "A Cama do Samuel" (15/09/2026), expandido de 10
 * para 17 páginas. Arco: cama dos pais toda noite → plano da mamãe (banho,
 * história, luz baixa, amigo de pelúcia) → primeira noite com medo → volta
 * sozinho para a cama → chuva e trovão → recaída acolhida → ensina a prima →
 * dorme na própria cama. A criança fica de pijama em todas as cenas; sem
 * pediatra na história (só no encerramento).
 * Índices do livro: 0 capa, 1 dedicatória, 2..18 história, 19 final.
 */
export const dormirNaPropriaCama: BookTheme = {
  slug: "dormir-na-propria-cama",
  label: "Dormir na própria cama",
  title: "A Cama {do|da} {nome}",
  subtitle: "Uma história sobre dormir na própria cama.",
  defaultDedication:
    "Para {nome}, que descobriu que a cama {dele|dela} é o lugar mais seguro e gostoso do mundo. Boa noite, {capitão|capitã}.",
  outfit:
    "light-blue pajamas with small white stars, long sleeves and long pants, barefoot",
  coverScene: `night; the {boy|girl} sits proudly on a blue bed as if on a throne, back straight, chin up, one hand resting on ${DINO} beside {him|her}; the bedroom has a soft blue wall and a ceiling covered in small glowing yellow stars; a warm bedside lamp glows on the nightstand.`,
  dedicationScene: `the {boy|girl}'s bedroom in soft morning light, no people: the blue bed is neatly made and ${DINO} sits on the pillow; the upper half of the image is the plain, softly lit blue wall, visually quiet, with no objects, pictures or patterns.`,
  endingScene: `night, warm hallway light; the {boy|girl} stands at the open door of {his|her} bedroom waving goodnight toward the viewer with a sleepy smile, ${DINO} under one arm, glowing yellow stars visible on the ceiling behind; the lower third of the image is the plain wooden floor, visually quiet, with no characters or objects.`,
  pages: [
    {
      text: "{nome} tinha um quarto só {dele|dela}, com uma cama azul e estrelinhas no teto. Mas toda noite, quando a luz apagava, {ele|ela} aparecia na cama da mamãe e do papai.",
      scene: `dim hallway at night; the {boy|girl} tiptoes through the open door of the parents' bedroom hugging ${DINO}; inside, ${MOM} and ${DAD} sit up in a big bed, sleepy and surprised, lit by a small lamp.`,
      panel: "upper",
      refs: [],
    },
    {
      text: "Na cama grande ficava todo mundo apertado. O papai dormia torto, a mamãe quase caía e ninguém descansava direito. De manhã, os três bocejavam no café.",
      scene: `sunny kitchen at breakfast; ${MOM}, ${DAD} and the {boy|girl} sit at the table yawning with heavy eyes, ${DINO} on the child's lap; a bowl of cereal and mugs on the table.`,
      panel: "lower",
      refs: [2],
    },
    {
      text: "Foi aí que a mamãe teve uma ideia. {Meninos|Meninas} grandes conseguem dormir na própria cama, ela disse. E {nome} já era grande o bastante para tentar. {Ele|Ela} ficou pensando naquilo.",
      scene: `same sunny kitchen; ${MOM} talks gently to the {boy|girl}, one finger raised with a bright-idea face; the {boy|girl} listens with wide eyes, holding ${DINO}; ${DAD} pours coffee behind them.`,
      panel: "upper",
      refs: [2],
    },
    {
      text: "A mamãe contou o plano nos dedos: um banho quentinho, uma história, a luz bem baixa e um amigo de pelúcia para fazer companhia a noite inteira. O Dino se ofereceu na hora.",
      scene: `sunny kitchen; ${MOM} crouches at the child's height showing four fingers with a kind smile; the {boy|girl} holds ${DINO} up toward her with both hands and nods eagerly.`,
      panel: "lower",
      refs: [2],
    },
    {
      text: "Naquela noite começou o plano. Primeiro, o banho quentinho com espuma até as orelhas. Depois, o pijama de estrelas. O Dino esperava sentado no banquinho, todo orgulhoso.",
      scene: `cozy bathroom with warm light and gentle steam; the {boy|girl}, already in the star pajamas, dries {his|her} hair with a fluffy blue towel; ${DINO} sits on a small wooden stool by the door; ${MOM} folds a towel beside the sink.`,
      panel: "upper",
      refs: [2],
    },
    {
      text: "Depois, o papai sentou na beirada da cama e leu a história favorita de {nome}. A luz do abajur deixava o quarto dourado e o Dino escutava tudo bem quietinho.",
      scene: `the {boy|girl}'s bedroom at night, warm lamp light; ${DAD} sits on the edge of the blue bed holding a closed picture book with a blank cover, reading aloud; the {boy|girl} lies under the blanket hugging ${DINO}, eyes on the father; glowing yellow stars on the ceiling.`,
      panel: "lower",
      refs: [2],
    },
    {
      text: "Então a luz apagou. As sombras do armário pareciam um monstro de braços compridos. {nome} puxou o cobertor até o nariz e ficou só com os olhos de fora.",
      scene: `dark bedroom lit only by the glowing ceiling stars; a long shadow of the wardrobe and a coat rack stretches across the wall shaped like a lanky monster with long arms; the {boy|girl} is under the blanket up to the nose, only wide eyes showing, ${DINO} peeking out beside {him|her}.`,
      panel: "upper",
      refs: [],
    },
    {
      text: "Aí {nome} lembrou da dica. Respirou fundo três vezes, abraçou o Dino bem forte e começou a contar as estrelinhas do teto. Uma, duas, três... dez.",
      scene: `same dark bedroom; the {boy|girl} lies on the back with eyes open, hugging ${DINO} tightly against the chest, a calm focused face, lips slightly parted as if counting; the ceiling stars glow softly above.`,
      panel: "lower",
      refs: [],
    },
    {
      text: "No meio da noite, {nome} acordou e caminhou até a porta da mamãe e do papai. Parou. Olhou para trás, para o seu quarto cheio de estrelinhas. E voltou {sozinho|sozinha} para a sua cama.",
      scene: `night hallway; the {boy|girl} stands with the back to the closed door of the parents' bedroom, hugging ${DINO}, head turned to look at {his|her} own open bedroom door, which glows softly with the light of the ceiling stars.`,
      panel: "upper",
      refs: [],
    },
    {
      text: "De manhã, o sol entrou pela janela e {nome} acordou na própria cama. Na cozinha, a mamãe e o papai bateram palmas. {Ele|Ela} levantou os braços como {campeão|campeã}. O Dino também.",
      scene: `sunny kitchen; ${MOM} and ${DAD} clap with big proud smiles; the {boy|girl} stands on a chair with both arms raised in victory, holding ${DINO} up high with one hand.`,
      panel: "upper",
      refs: [2],
    },
    {
      text: "Na segunda noite, choveu forte e um trovão sacudiu a janela. {nome} apertou o Dino e imaginou que a cama era um barco firme, navegando tranquilo no meio do mar.",
      scene: `night bedroom with heavy rain streaking the window and a flash of lightning outside; the blue bed floats on gentle imaginary blue waves painted across the floor, clearly a daydream; the {boy|girl} sits at the headboard like a captain holding ${DINO}, calm and determined.`,
      panel: "lower",
      refs: [],
    },
    {
      text: "Na terceira noite, o papai nem terminou a história. Quando olhou, {nome} já dormia, com o Dino debaixo do braço e um sorrisinho no rosto.",
      scene: `warm lamp light; ${DAD} sits on the edge of the bed slowly closing the blank-covered picture book, looking down tenderly; the {boy|girl} sleeps peacefully on the side, ${DINO} tucked under one arm, a small smile on the face.`,
      panel: "upper",
      refs: [7],
    },
    {
      text: "Nem toda noite foi fácil. Numa delas, {nome} teve um sonho ruim e chamou bem alto. A mamãe veio, sentou na cama e fez cafuné até o medo ir embora.",
      scene: `dim bedroom at night; ${MOM} sits on the edge of the blue bed gently stroking the hair of the {boy|girl}, who lies with a worried face and ${DINO} held tight; the ceiling stars glow softly.`,
      panel: "lower",
      refs: [2],
    },
    {
      text: "Antes de sair, a mamãe fez um combinado: um beijo, um abraço apertado e a porta um pouquinho aberta, com a luz do corredor entrando. E {nome} dormiu de novo, na sua cama.",
      scene: `the bedroom seen from the bed; ${MOM} stands at the half-open door blowing a kiss, warm hallway light spilling through the gap onto the floor; the {boy|girl} lies tucked in with ${DINO}, eyes closing, relaxed.`,
      panel: "upper",
      refs: [2],
    },
    {
      text: "Dias depois, a prima menor veio dormir na casa de {nome}. Na hora de deitar, ela ficou parada na porta, abraçada ao travesseiro. Ela tinha medo do escuro.",
      scene: `the {boy|girl}'s bedroom at night, lamp on; ${COUSIN} stands frozen at the doorway with a nervous face; the {boy|girl} sits on the blue bed with ${DINO}, looking at her kindly and patting the mattress.`,
      panel: "lower",
      refs: [],
    },
    {
      text: "{nome} ensinou a dica da mamãe: respira fundo, abraça o amigo e conta as estrelinhas. Emprestou o Dino e as duas cabeças ficaram olhando para o teto juntas.",
      scene: `both children lie side by side on the blue bed looking up; the {boy|girl} points at the glowing ceiling stars; ${COUSIN} hugs ${DINO} against her chest, now smiling softly, her pillow beside her.`,
      panel: "upper",
      refs: [16],
    },
    {
      text: "Hoje {nome} dorme toda noite na própria cama, como {capitão|capitã} do seu barco. E descobriu que o quarto {dele|dela} é o lugar mais gostoso do mundo para sonhar.",
      scene: `peaceful night bedroom; the {boy|girl} sleeps soundly in the blue bed under the blanket, ${DINO} tucked under one arm, a calm smile; the ceiling stars glow gently and a sliver of warm hallway light comes through the slightly open door.`,
      panel: "lower",
      refs: [],
    },
  ],
}
