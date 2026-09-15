import type { BookTheme } from "@/modules/books/themes/types"

/**
 * Tema 1: a primeira ida "de verdade" ao pediatra, do medo à curiosidade.
 * Arco: manhã em casa → caminho → sala de espera → consulta (medir, pesar,
 * ouvir o coração, garganta, ouvido, barriga) → adesivo → volta pra casa.
 */
export const visitaAoPediatra: BookTheme = {
  slug: "visita-ao-pediatra",
  title: "{nome} vai ao pediatra",
  subtitle: "Uma história sobre coragem, curiosidade e cuidar da saúde.",
  dedication:
    "Que você cresça forte e saudável, {nome}, e descubra que cuidar de você também pode ser uma aventura.",
  coverScene:
    "The {boy|girl} walks happily along a sunny cobblestone path lined with flowers toward a cozy pediatric clinic with a red-tiled roof and a small heart sign, holding a teddy bear. Bright morning sky, birds flying.",
  dedicationScene:
    "Cozy child's bedroom bathed in soft morning light: a wooden nightstand with a small toy stethoscope, a teddy bear with a tiny bandage, a framed drawing of a smiling doctor on the wall. No people.",
  endingScene:
    "The {boy|girl} sleeps peacefully in bed at night hugging the teddy bear, a colorful sticker on the pajama, moonlight through the window, a warm nightlight glowing.",
  pages: [
    {
      text: "Em uma casa cheia de brinquedos e risadas, vivia {um menino|uma menina} chamad{o|a} {nome}. {Ele|Ela} adorava correr, pular e inventar histórias.",
      scene:
        "Sunny living room full of toys, the {boy|girl} jumps joyfully off a couch cushion with arms wide open, a teddy bear flying beside, blocks and picture books scattered on a soft rug.",
    },
    {
      text: "Uma manhã, a mamãe disse: \"Hoje é dia de visitar a pediatra!\" {nome} parou de brincar e franziu a testa.",
      scene:
        "Kitchen at breakfast time, the {boy|girl} sits at the table with a bowl of cereal, frowning slightly and looking up at a gentle mother figure seen from behind pointing at a calendar with a heart drawn on today's date.",
    },
    {
      text: "\"Vai doer?\", perguntou {nome}, apertando o ursinho. \"Não\", respondeu a mamãe. \"A pediatra cuida de você para você crescer forte.\"",
      scene:
        "Close-up of the {boy|girl} hugging a teddy bear tightly on the bedroom floor, worried eyes, morning light from the window, a small backpack ready by the door.",
    },
    {
      text: "No caminho, {nome} viu o sol brilhando, um cachorro abanando o rabo e uma borboleta amarela. O medo foi ficando pequenininho.",
      scene:
        "Sunny sidewalk lined with flowers, the {boy|girl} walks holding an adult's hand (adult cropped at the waist), smiling at a fluffy dog wagging its tail and a yellow butterfly fluttering close.",
    },
    {
      text: "A clínica era colorida, com desenhos nas paredes e uma caixa de brinquedos. {nome} escolheu um dinossauro verde para esperar.",
      scene:
        "Bright pediatric waiting room with cheerful wall murals of animals and clouds, the {boy|girl} kneels by a wooden toy box holding up a green toy dinosaur, other toys around.",
    },
    {
      text: "\"{nome}!\", chamou uma voz gentil. Era a Dra. Lia, com um jaleco branco e um sorriso enorme. \"Que bom te ver!\"",
      scene:
        "A kind pediatrician woman with a white coat, colorful stethoscope and warm smile crouches at the doorway of a bright consulting room, waving at the {boy|girl} who peeks in curiously holding the toy dinosaur.",
    },
    {
      text: "Primeiro, {nome} subiu na balança. \"Olha só, você está crescendo!\", disse a doutora, anotando os números.",
      scene:
        "Pediatric consulting room, the {boy|girl} stands proudly on a colorful digital scale, the pediatrician kneels beside writing on a clipboard, a growth chart with animals on the wall.",
    },
    {
      text: "Depois, {nome} ficou bem {retinho|retinha} na régua da parede. Estava mais alt{o|a} que na última vez!",
      scene:
        "The {boy|girl} stands very straight against a tall wall ruler decorated with a giraffe, chin up, eyes wide with pride, the pediatrician marks the height with a smile.",
    },
    {
      text: "\"Agora vou ouvir seu coração.\" O estetoscópio estava geladinho e fez {nome} dar risada. Tum-tum, tum-tum!",
      scene:
        "The {boy|girl} sits on the examination table giggling with shoulders raised as the pediatrician gently places a stethoscope on the chest, little heart shapes floating in the air.",
    },
    {
      text: "\"Abre a boca bem grande e fala AAAH!\" {nome} abriu tanto que a doutora riu. \"Garganta perfeita!\"",
      scene:
        "Funny close-up of the {boy|girl} with mouth wide open saying aaah, the pediatrician holds a small light and a tongue depressor, both laughing, warm light.",
    },
    {
      text: "A doutora olhou dentro do ouvido com uma lanterninha. \"Tem algum tesouro aí?\", perguntou {nome}. \"Só ouvidos limpinhos!\"",
      scene:
        "The pediatrician looks into the {boy|girl}'s ear with a small otoscope light, the child tilts the head and grins playfully, a drawing of a treasure chest on the wall behind.",
    },
    {
      text: "Chegou a hora de apertar a barriga. Fez cócegas! {nome} riu tanto que o dinossauro quase caiu da mesa.",
      scene:
        "The {boy|girl} lies on the examination table laughing hard with the belly exposed while the pediatrician gently presses it, the green toy dinosaur wobbling at the edge of the table.",
    },
    {
      text: "\"Você está forte, saudável e chei{o|a} de energia\", disse a Dra. Lia. \"Continue comendo frutas, brincando e dormindo bem.\"",
      scene:
        "The pediatrician sits at eye level with the {boy|girl}, showing a colorful picture card with fruits, a soccer ball and a moon, both smiling warmly.",
    },
    {
      text: "Antes de ir, {nome} ganhou um adesivo de estrela dourada. \"Por ser tão corajos{o|a}!\"",
      scene:
        "Close-up of the {boy|girl} looking down proudly at a shiny gold star sticker being placed on the shirt by the pediatrician's hand, eyes sparkling.",
    },
    {
      text: "No caminho de volta, {nome} contou tudo para a mamãe: a balança, o coração, o AAAH e o adesivo. \"Nem doeu!\"",
      scene:
        "Golden afternoon light on the way home, the {boy|girl} walks skipping and talking animatedly with hands in the air, holding an adult's hand (adult cropped at the waist), the sticker shining on the shirt.",
    },
    {
      text: "À noite, {nome} colou o adesivo no ursinho. \"Você também foi corajoso\", sussurrou. E dormiu sonhando com dinossauros verdes.",
      scene:
        "Nighttime bedroom, the {boy|girl} sits in bed under a blanket pressing the gold star sticker onto the teddy bear, soft nightlight glow, a green dinosaur toy on the nightstand.",
    },
  ],
}
