// PROTOTYPE — livro completo "O Sol na Mão de Samuel": capa + 19 páginas, Nano Banana 2 via Replicate.
// uso: node --env-file=.env.local scripts/proto-book-full.mjs <fotosDir> <outDir>
import { readFileSync, writeFileSync, mkdirSync, createWriteStream, existsSync } from "node:fs";
import { join } from "node:path";
import PDFDocument from "pdfkit";

const tok = process.env.REPLICATE_API_TOKEN;
const [photosDir, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const toUri = (buf) => `data:image/png;base64,${buf.toString("base64")}`;
const PHOTOS = ["foto1.png", "foto2.png"].map((f) => readFileSync(join(photosDir, f)));
const NOME = "Samuel";

const STYLE = `Children's picture book illustration in the look of a 3D animated feature film (Pixar/Disney style): soft rounded shapes, big expressive eyes, clean smooth render, warm golden-hour lighting with gentle volumetric light rays, rich saturated colors, shallow cinematic depth of field. Portrait 3:4, full-bleed scene, no frame around the image, no watermark, no signature. No readable letters, words or numbers on any object, poster, book or sign in the scene.`;
const CHARACTER = `Main character: the boy from the reference photos (the first two images), drawn as a 3D animated character with the body proportions of a child that age (head about one quarter of body height). Keep faithfully from the photos: his curly short hair and its color, his skin tone, eye color, face shape, big bright smile and any distinctive features. Outfit, identical in every scene and different from the photos: a plain orange t-shirt, denim shorts and white sneakers.`;
const CONSISTENCY = `The third image is the book cover already generated: reproduce the main character exactly as drawn there (same face, hair, outfit, colors, proportions and rendering style). Any other character shown in a reference page provided after the cover must also look identical to that page.`;
const TEXT = (layout, txt) => `The page contains EXACTLY the following Portuguese text, rendered character by character including accents, cedilla and punctuation, in an elegant warm serif typeface (Cormorant Garamond / Playfair Display style), generous line spacing, large and fully legible, with small gold heart-and-line ornaments separating sentences. No other letters, words, signs or logos anywhere in the image. Layout: ${layout}. Text: "${txt}"`;
const L = {
  L1: "a cream aged-parchment panel with a thin gold ornamental border in the upper third of the image, dark-brown text",
  L2: "no panel: the text floats directly over a softly blurred, gently darkened area of the scene, cream-colored text with a warm subtle glow, in the upper half",
  L3: "a cream parchment panel with gold border in the lower third, the scene above it, dark-brown text",
  L4: "a horizontal cream ribbon banner with gold trim across the top quarter, dark-brown text",
  L5: "text in cream color with warm glow on the left half over a softly darkened area, the character on the right half",
};
const JUJU = "Juju, a girl of the same age with straight loose blonde hair and a pink t-shirt";
const LEO = "Léo, a fair-skinned boy of the same age with short straight black hair and a green backpack";
const JESUS = "Jesus, a kind man with long brown hair and beard, cream robe and blue sash";

const PAGES = [
  { id: "00", refs: [], prompt: `${STYLE} ${CHARACTER} Scene: golden morning in front of a colorful, welcoming school with a wide open gate and a huge sunflower beside the entrance; the boy stands smiling with a backpack on, holding up the open palm of one hand toward the viewer, a small yellow sun drawn on the palm; soft light rays, birds. Cover layout: title in embossed golden 3D letters at the top, the child's name even larger inside a cream parchment plaque with ornate gold frame, subtitle below in dark-brown serif. Render the texts EXACTLY, character by character, including accents. No other letters anywhere. Title: "O Sol na Mão de" Name: "${NOME}" Subtitle: "Uma história sobre fé, coragem e recomeços."` },
  { id: "01", refs: [], layout: "L1", scene: `quiet sunny street; a yellow house with a big mango tree in the front yard; the boy and ${JUJU} kick a ball under the tree, both laughing; a neighbor's dog watches from a fence.`, text: `${NOME} morava em uma casa amarela com uma mangueira no quintal. Ele conhecia cada canto daquela rua, cada vizinho, cada cachorro. E tinha uma melhor amiga, a Juju, que morava na casa da frente.` },
  { id: "02", refs: [], layout: "L3", scene: `family dinner table in warm evening light; the boy sits with wide eyes and a spoon frozen mid-air; the father, seen from the side, speaks gently with a hand on the table; the mother looks at the boy with tenderness.`, text: `Um dia, no jantar, o papai contou que a família ia se mudar para outra cidade, bem longe. ${NOME} largou a colher. Um frio estranho apareceu na sua barriga e não foi mais embora.` },
  { id: "03", refs: ["01"], layout: "L2", scene: `nearly empty bedroom with stacked cardboard boxes and a bare window; at the doorway the boy hugs ${JUJU} tightly, both with tears on their cheeks; a moving truck visible through the window.`, text: `Nas semanas seguintes, a casa foi ficando cheia de caixas. Os brinquedos, os livros e até a cortina do quarto entraram nelas. No último dia, ${NOME} abraçou a Juju por um tempão e as lágrimas escorreram sem pedir licença.` },
  { id: "04", refs: [], layout: "L4", scene: `inside a car on a highway at late afternoon; the boy in the back seat presses the forehead to the window; through the glass, a new city of unfamiliar buildings appears in the distance under an orange sky.`, text: `O carro seguiu pela estrada por muitas horas. Quando a cidade nova apareceu na janela, tudo parecia diferente: as ruas, os prédios, até o cheiro do ar. ${NOME} não conhecia ninguém ali.` },
  { id: "05", refs: [], layout: "L2", scene: `a new bedroom at night, closed boxes on the floor, no curtain on the window, cold street light coming in; the boy lies in bed with the blanket pulled up to the nose, eyes wide open, shadows on the wall.`, text: `Na casa nova, a noite tinha barulhos que ${NOME} nunca tinha ouvido. Uma porta que rangia, um cachorro longe latindo, um vento diferente na janela. Ele puxou o cobertor até o nariz.` },
  { id: "06", refs: ["05"], layout: "L5", scene: `same new bedroom at night; the mother, a warm woman with dark hair in a low bun and a soft cardigan, sits on the edge of the bed pointing toward the window where the moon peeks between soft clouds; the boy listens attentively holding the blanket.`, text: `A mamãe sentou na beirada da cama e apontou para a janela. Ela explicou que Deus é como o sol. Mesmo quando as nuvens cobrem tudo e a gente não consegue ver, ele continua lá, aquecendo e cuidando.` },
  { id: "07", refs: ["06"], layout: "L1", scene: `the same mother and the boy hold hands in prayer sitting on the bed, eyes closed, an open Bible on the mother's lap, a small warm lamp glowing; peaceful expressions.`, text: `Depois ela lembrou uma promessa que está na Bíblia: não tenha medo, porque Deus vai com você para onde você for. Os dois oraram juntos e, pela primeira vez naquela casa, ${NOME} dormiu tranquilo.` },
  { id: "08", refs: [], layout: "L3", scene: `dream sequence, golden and slightly glowing: a vast sunflower field at sunset; the boy walks beside ${JESUS}, holding hands; far away at the end of the field a school full of warm light and tiny silhouettes of children playing.`, text: `Naquela noite, ${NOME} sonhou que caminhava por um campo de girassóis ao lado de Jesus. Lá no fim do campo havia uma escola cheia de luz e de risadas de crianças.` },
  { id: "09", refs: ["08"], layout: "L4", scene: `same dream: the same Jesus crouches to the boy's height and points toward the glowing school with a warm smile; the boy smiles back with bright eyes; sunflowers around them; soft light rays.`, text: `Jesus apontou para a escola e disse que já estava indo na frente, preparando o caminho e os amigos. ${NOME} acordou com o coração leve e o sol entrando pela janela.` },
  { id: "10", refs: [], layout: "L1", scene: `close-up in morning light of the boy's hands: one hand holds a yellow felt-tip pen drawing a small sun on the open palm of the other; the orange t-shirt visible, backpack on the chair behind.`, text: `Era o primeiro dia na escola nova. Antes de sair, ${NOME} pegou uma canetinha amarela e desenhou um sol pequeno na palma da mão, para lembrar que Deus ia junto.` },
  { id: "11", refs: [], layout: "L2", scene: `a huge colorful school gate with children of many ages running in, greeting each other; the boy stands still on the sidewalk, small before the gate, looking down at the open palm with the little sun.`, text: `O portão da escola era enorme e as crianças passavam correndo, todas se conhecendo. As pernas de ${NOME} travaram. Ele abriu a mão, olhou o sol e deu um passo. Depois outro.` },
  { id: "12", refs: [], layout: "L3", scene: `a bright classroom with drawings on the walls; a smiling teacher stands beside the boy at the front while every classmate turns to look; the boy speaks very softly, shoulders slightly raised, cheeks pink.`, text: `Na sala, a professora apresentou o aluno novo e todos os olhos se viraram para ele. ${NOME} disse o próprio nome bem baixinho e sentou na última carteira, com o coração batendo forte.` },
  { id: "13", refs: [], layout: "L5", scene: `a lively school playground at recess, groups of children playing and eating together; the boy sits alone on a bench at the edge with a lunchbox on the lap, sad eyes, on the verge of tears.`, text: `No recreio, cada criança já tinha o seu grupo. ${NOME} sentou sozinho em um banco, com o lanche no colo, e sentiu o frio na barriga voltar. Ele quase chorou.` },
  { id: "14", refs: [], layout: "L4", scene: `from behind the boy on the bench, looking across the playground: in the far corner ${LEO} sits alone, hugging the backpack and staring at the ground.`, text: `Foi então que ele viu, no outro canto do pátio, um menino sentado sozinho, abraçado à mochila e olhando para o chão. Ele parecia sentir exatamente o mesmo frio na barriga.` },
  { id: "15", refs: ["14"], layout: "L2", scene: `the boy walks with determination across the busy playground toward ${LEO}, who lifts his face in surprise; the boy's open palm with the sun is slightly visible.`, text: `${NOME} lembrou do sonho e olhou o sol na mão. Respirou fundo, atravessou o pátio inteiro e perguntou o nome dele. Ele se chamava Léo, e também era novo na escola.` },
  { id: "16", refs: ["14"], layout: "L1", scene: `the boy and ${LEO} sit together on the bench, both holding up their open palms toward each other, each palm with a small yellow sun drawn on it, both laughing.`, text: `${NOME} mostrou o sol na mão e contou o que a mamãe tinha ensinado. Depois pegou a canetinha e desenhou um sol na mão do Léo também. Os dois riram, e o frio na barriga foi embora.` },
  { id: "17", refs: ["14"], layout: "L3", scene: `the whole playground: many children show their palms with little yellow suns while running in a game of tag, the boy and ${LEO} in the middle of the group, big smiles, joyful movement.`, text: `Outras crianças chegaram curiosas para ver os sóis. Em pouco tempo havia sóis em muitas mãos e uma brincadeira de pega-pega no pátio inteiro. Quando o sinal tocou, ${NOME} já tinha cinco amigos novos.` },
  { id: "18", refs: [], layout: "L5", scene: `the boy kneels beside the bed in the new bedroom, now cozy with a curtain, drawings on the wall and a lamp; hands together in prayer, eyes closed, soft evening light from the window.`, text: `Querido Jesus, obrigado por ir na minha frente e preparar o caminho. Quando eu sentir medo do que é novo, me lembre que você vai comigo para onde eu for. Me dê coragem para dar o primeiro passo e um coração aberto para fazer amigos. Amém.` },
  { id: "19", refs: ["14"], layout: "L2", scene: `bright sunny morning; the boy and ${LEO} run hand in hand toward the school, backpacks bouncing, both with little suns on their open palms; the huge sunflower by the gate.`, text: `Desde aquele dia, toda manhã ${NOME} desenha um sol na palma da mão. Não é porque o medo sumiu de vez. É porque agora ele sabe que Deus vai com ele para onde ele for.` },
];

const gen = {};
const T0 = Date.now();
for (const p of PAGES) {
  const file = join(outDir, `${p.id}.png`);
  if (existsSync(file)) { gen[p.id] = readFileSync(file); console.log(p.id, "já existe, pulando"); continue; }
  const prompt = p.prompt ?? `${STYLE} ${CHARACTER} ${CONSISTENCY} Scene: ${p.scene} ${TEXT(L[p.layout], p.text)}`;
  const refs = p.id === "00" ? [] : ["00", ...p.refs];
  const image_input = [...PHOTOS.map(toUri), ...refs.map((r) => toUri(gen[r]))];
  const t0 = Date.now();
  let r = await fetch("https://api.replicate.com/v1/models/google/nano-banana-2/predictions", { method: "POST", headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json", Prefer: "wait=60" }, body: JSON.stringify({ input: { prompt, image_input, aspect_ratio: "3:4", resolution: "1K", output_format: "png" } }) });
  let j = await r.json();
  if (!j.urls) { console.log(p.id, "HTTP", r.status, JSON.stringify(j).slice(0, 200)); process.exit(1); }
  while (!["succeeded", "failed", "canceled"].includes(j.status)) { await new Promise((s) => setTimeout(s, 3000)); j = await (await fetch(j.urls.get, { headers: { Authorization: `Bearer ${tok}` } })).json(); }
  if (j.status !== "succeeded") { console.log(p.id, "FALHOU", j.error); process.exit(1); }
  const url = Array.isArray(j.output) ? j.output[0] : j.output;
  gen[p.id] = Buffer.from(await (await fetch(url)).arrayBuffer());
  writeFileSync(file, gen[p.id]);
  console.log(p.id, `predict=${j.metrics?.predict_time?.toFixed(1)}s wall=${((Date.now() - t0) / 1000).toFixed(0)}s`);
  await new Promise((s) => setTimeout(s, 11000));
}
console.log(`total ${((Date.now() - T0) / 1000).toFixed(0)}s`);

const doc = new PDFDocument({ size: "A4", margin: 0, autoFirstPage: false });
doc.pipe(createWriteStream(join(outDir, "o-sol-na-mao-de-samuel.pdf")));
for (const p of PAGES) { doc.addPage(); doc.image(gen[p.id], 0, 0, { cover: [595.28, 841.89], align: "center", valign: "center" }); }
doc.end();
console.log("pdf ok");
