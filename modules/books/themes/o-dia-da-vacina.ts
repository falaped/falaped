import type { BookTheme } from "@/modules/books/themes/types"

// Personagens fixos do tema. Descritos em toda cena em que aparecem; a
// primeira aparição vira página-âncora (refs) para as seguintes.
const MOM =
  "the mother, a warm woman with dark hair in a low bun, small gold earrings and a beige cardigan over a white top"
const DRA =
  "Dra. Lia, a friendly pediatrician with short brown hair, a white coat over teal scrubs, a colorful stethoscope and a warm smile"
const NURSE =
  "the nurse Beto, a young man with short black hair, round glasses and light-blue scrubs"
const GIRL =
  "a smaller girl with two curly puffs of hair and a pink dress, hugging a white plush bunny"
const SOLDIERS =
  "tiny friendly cartoon soldiers made of soft golden light, each holding a small round glowing shield"

/**
 * Tema validado no teste "O Escudo do Samuel" (20/20 one-shot, gpt-image-2 high).
 * Arco: aviso da vacina → medo → soldadinhos → consulta → escolhas → picada →
 * adesivo → ajuda outra criança → volta para casa mais forte.
 * Índices do livro: 0 capa, 1 dedicatória, 2..18 história, 19 final.
 */
export const oDiaDaVacina: BookTheme = {
  slug: "o-dia-da-vacina",
  label: "O dia da vacina",
  title: "O Escudo {do|da} {nome}",
  subtitle: "Uma história sobre coragem no dia da vacina.",
  defaultDedication:
    "Você descobriu que coragem não é não ter medo. É dar o primeiro passo mesmo com ele.",
  outfit:
    "a yellow t-shirt with a small white cloud on the chest, navy shorts and blue sneakers",
  coverScene: `the {boy|girl} stands in a heroic pose on a sunny clinic path, chest out and fists on hips, a round gold star sticker on the t-shirt and a small colorful bandage on the left upper arm; around {him|her} float ${SOLDIERS}; a cozy pediatric clinic with a red roof softly blurred behind; bright blue sky.`,
  dedicationScene: `the {boy|girl}'s bedroom in soft morning light, no people: a round gold star sticker and a small colorful bandage wrapper lie on the wooden nightstand beside a small lamp; the upper half of the image is the plain, softly lit blue wall, visually quiet, with no objects, pictures or patterns.`,
  endingScene: `golden late afternoon; the {boy|girl} stands at the clinic gate waving goodbye toward the viewer with a big smile, the gold star sticker on the t-shirt and the bandage on the left arm, ${SOLDIERS} floating around; the lower third of the image is the plain sunlit path, visually quiet, with no characters or objects.`,
  pages: [
    {
      text: "Naquela manhã, {nome} acordou com o sol no rosto e um aviso da mamãe: hoje era dia de vacina. A palavra vacina fez a barriga {dele|dela} dar uma cambalhota.",
      scene: `sunny morning bedroom; the {boy|girl} sits up in bed with a worried face and the blanket on the lap, barefoot; ${MOM} stands at the open door smiling gently; the yellow t-shirt is laid out on a chair.`,
      panel: "upper",
      refs: [],
    },
    {
      text: "No café da manhã, {nome} mexeu o cereal sem comer. {Ele|Ela} lembrava da última vez, do cheiro do álcool e daquela picadinha rápida. Só de pensar, o braço já doía um pouquinho.",
      scene: `bright kitchen at breakfast; the {boy|girl} sits at the table stirring a bowl of cereal without eating, chin resting on the other hand, gloomy eyes; ${MOM} pours juice beside {him|her} and looks at {him|her} with tenderness.`,
      panel: "lower",
      refs: [2],
    },
    {
      text: "No caminho, a mamãe explicou que a vacina é como um treino para o corpo. Ela ensina os soldadinhos de dentro a reconhecer os vilões antes de eles chegarem.",
      scene: `sunny sidewalk lined with flowers; the {boy|girl} walks holding hands with ${MOM}, looking up at her while she talks and gestures with her free hand; a small dog behind a fence watches them.`,
      panel: "upper",
      refs: [2],
    },
    {
      text: "{nome} imaginou um exército de soldadinhos dentro {dele|dela}, com escudos brilhantes, prontos para proteger cada cantinho do corpo. A ideia até fez {ele|ela} sorrir um pouco.",
      scene: `same sunny sidewalk; the {boy|girl} walks beside ${MOM} with a small smile, imagining: ${SOLDIERS} march in a cheerful line along {his|her} arm and around {his|her} head, clearly a glowing daydream.`,
      panel: "lower",
      refs: [2],
    },
    {
      text: "A clínica tinha paredes coloridas e uma caixa de brinquedos. Mas {nome} ficou {sentado|sentada} bem juntinho da mamãe, segurando forte a mão dela e olhando para a porta.",
      scene: `colorful pediatric waiting room with animal murals and a wooden toy box; the {boy|girl} sits pressed against ${MOM} on a bench, holding her hand tightly and staring at a closed door; across the room ${GIRL} sits on a small chair, also nervous.`,
      panel: "upper",
      refs: [2],
    },
    {
      text: "A porta abriu e [a|o] {pediatra} apareceu com seu jaleco branco e um sorriso enorme. [Ela|Ele] chamou {nome} pelo nome e disse que tinha uma missão importante para {ele|ela}.",
      scene: `the consulting room door opens onto the waiting room; ${DRA} crouches at the doorway waving warmly at the {boy|girl}, who sits with ${MOM} and looks at her with surprise.`,
      panel: "lower",
      refs: [2],
    },
    {
      text: "No consultório, [a|o] {pediatra} mostrou um desenho do corpo com os soldadinhos de escudo. [Ela|Ele] contou que a vacina entrega para eles a foto do vilão, para nunca mais serem enganados.",
      scene: `bright consulting room; ${DRA} sits beside the {boy|girl} holding a large drawing of a child's body outline with ${SOLDIERS} inside it (a picture only, no letters); the {boy|girl} leans in, curious, mouth slightly open.`,
      panel: "upper",
      refs: [7, 5],
    },
    {
      text: "{nome} olhou para a bandeja com a seringa e engoliu em seco. As pernas quiseram correr. [A|O] {pediatra} percebeu e disse que ter medo era normal, até para os corajosos.",
      scene: `the {boy|girl} sits on the exam table, shoulders raised, staring at a metal tray with a small syringe and cotton balls on the counter; ${DRA} kneels in front with a hand on {his|her} knee and a calm, kind face; ${MOM} stands behind.`,
      panel: "lower",
      refs: [7, 2],
    },
    {
      text: "[A doutora|O doutor] deixou {nome} escolher: o braço direito ou o esquerdo, olhar ou não olhar, e o que contar durante a picada. {Ele|Ela} escolheu o esquerdo, não olhar, e contar até três.",
      scene: `the {boy|girl} on the exam table points firmly at {his|her} own left arm with a determined face; ${DRA} smiles and nods; beside the counter ${NURSE} prepares a cotton ball, seen in profile.`,
      panel: "upper",
      refs: [7],
    },
    {
      text: "O enfermeiro Beto passou o algodão gelado no braço. Cheiro de álcool, o mesmo de sempre. {nome} respirou fundo, apertou a mão da mamãe e fechou os olhos.",
      scene: `close view: ${NURSE} gently wipes the {boy|girl}'s left upper arm with a cotton ball; the {boy|girl} has the eyes shut tight and lips pressed, squeezing the hand of ${MOM}, who stands at the right side.`,
      panel: "lower",
      refs: [10, 2],
    },
    {
      text: "Um, dois... A picadinha veio antes do três. Foi rápida como um beliscão de formiga, e quando {nome} abriu os olhos, já tinha acabado.",
      scene: `the {boy|girl} opens the eyes wide in surprise, mouth in a small o; ${NURSE} is already pressing a small colorful bandage onto {his|her} left upper arm; ${DRA} gives a thumbs up with a big smile.`,
      panel: "upper",
      refs: [10, 7],
    },
    {
      text: "[A|O] {pediatra} abriu uma gaveta cheia de adesivos e deixou {nome} escolher. {Ele|Ela} pegou uma estrela dourada e colou bem no meio da camiseta, como uma medalha.",
      scene: `${DRA} holds open a drawer full of colorful stickers; the {boy|girl} presses a round gold star sticker onto the middle of the yellow t-shirt, looking down at it with pride, the small bandage visible on the left arm.`,
      panel: "lower",
      refs: [7],
    },
    {
      text: "Antes de sair, [a doutora|o doutor] explicou que o braço podia ficar dolorido ou um pouco quente. Isso era sinal de que os soldadinhos estavam trabalhando, e passaria logo.",
      scene: `${DRA} stands at the consulting room door talking to ${MOM} and the {boy|girl}, gently pointing at the {boy|girl}'s bandaged left arm; the {boy|girl}, star sticker on the shirt, listens and nods.`,
      panel: "upper",
      refs: [7, 2],
    },
    {
      text: "Na sala de espera, a menina de vestido rosa continuava lá, abraçada ao coelhinho, com os olhos cheios de lágrimas. Era a vez dela, e ela não queria ir.",
      scene: `back in the waiting room; ${GIRL} sits on the small chair with tears on her cheeks, hugging the bunny tightly and shaking her head; the {boy|girl}, star sticker on the shirt, notices her from beside ${MOM}.`,
      panel: "lower",
      refs: [6, 2],
    },
    {
      text: "{nome} sentou ao lado dela e mostrou o curativo. Contou dos soldadinhos, do beliscão de formiga e do adesivo de estrela. A menina parou de chorar para ouvir.",
      scene: `the {boy|girl} sits on the small chair next to ${GIRL}, turned toward her, showing the colorful bandage on the left arm and pointing at the gold star on the shirt; she has stopped crying and looks at the bandage, curious.`,
      panel: "upper",
      refs: [6],
    },
    {
      text: "Quando [a|o] {pediatra} chamou, a menina levantou, respirou fundo e escolheu o braço direito. Da porta, ela olhou para {nome} e fez sinal de positivo.",
      scene: `${GIRL} stands at the consulting room door beside ${DRA}, bunny under one arm, and turns back to give a thumbs up with a small brave smile; the {boy|girl} waves at her from the bench.`,
      panel: "lower",
      refs: [6, 7],
    },
    {
      text: "No caminho de casa, {nome} andou com a estrela brilhando no peito. {Ele|Ela} sabia que dentro {dele|dela} um exército inteiro tinha ganhado um novo escudo. E {ele|ela} também.",
      scene: `golden late afternoon on the way home; the {boy|girl} walks hand in hand with ${MOM}, the gold star sticker shining on the chest, bandage on the left arm; faint ${SOLDIERS} glow around {him|her} like a gentle aura.`,
      panel: "upper",
      refs: [2, 5],
    },
  ],
}
