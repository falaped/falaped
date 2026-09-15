// PROTOTYPE — "O Escudo do Samuel" (dia da vacina): capa + 19 páginas, gpt-image-2 quality high,
// estilo híbrido, texto dentro da imagem, one-shot (sem retry manual).
// uso: node --env-file=.env.local scripts/proto-book-vacina.mjs <fotosDir> <outDir>
import { readFileSync, writeFileSync, mkdirSync, createWriteStream, existsSync } from "node:fs";
import { join } from "node:path";
import PDFDocument from "pdfkit";

const tok = process.env.REPLICATE_API_TOKEN;
const [photosDir, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const toUri = (b) => `data:image/png;base64,${b.toString("base64")}`;
const PHOTOS = ["foto1.png", "foto2.png"].map((f) => readFileSync(join(photosDir, f)));
const NOME = "Samuel";
const TITLE = `O Escudo do ${NOME}`;
const SUBTITLE = "Uma história sobre coragem no dia da vacina.";

// ---------- blocos fixos ----------
const STYLE = `Children's picture book illustration in a stylized 3D animated look (Pixar/DreamWorks feature film). This is clearly a cartoon and NOT a photograph: smooth simplified skin with no pores or photographic texture, slightly enlarged expressive eyes, soft rounded shapes, painterly warm lighting, rich saturated colors, gentle depth of field. Every character's face and body share the same degree of stylization and the proportions of an animated child or adult (a child's head is about one quarter of body height), so heads sit naturally on bodies. Portrait 3:4, full-bleed, no frame, no watermark. Every book, poster, chart, box, label, screen and sign in the scene is blank, with no letters or numbers on any object. The scene contains ONLY the people named in the scene description; no extra people, children or faces in the background.`;
const CHARACTER = `Main character: the boy from the two reference photos (the first two input images), translated into this animated style while keeping his recognizable features: short curly dark hair, warm brown skin tone, dark eyes, the shape of his face and his big bright smile. Outfit in every scene: a yellow t-shirt with a small white cloud on the chest, navy shorts and blue sneakers.`;
const CONSISTENCY = `The input image right after the two photos is the book cover already generated: reproduce the main character exactly as drawn there (same stylized face, hair, outfit, colors and proportions). Each further input image is a page already generated showing a secondary character or element; that character or element must look identical to that page (same face, hair, clothes and colors).`;
const MOM = "the mother, a warm woman with dark hair in a low bun, small gold earrings and a beige cardigan over a white top";
const DRA = "Dra. Lia, a friendly pediatrician with short brown hair, a white coat over teal scrubs, a colorful stethoscope and a warm smile";
const NURSE = "the nurse Beto, a young man with short black hair, round glasses and light-blue scrubs";
const GIRL = "a smaller girl with two curly puffs of hair and a pink dress, hugging a white plush bunny";
const SOLDIERS = "tiny friendly cartoon soldiers made of soft golden light, each holding a small round glowing shield";
const TEXT = (pos, txt) => `Text panel: in the ${pos} third of the image, a translucent deep-navy rounded rectangle with a thin cream border and one small cream star centered on its top edge. The whole panel, including its border, sits completely inside the image with a clear margin of at least 8% of the image height from the top or bottom edge and 6% of the width from the sides; no part of the panel touches or crosses the image border. Inside it, EXACTLY the following Portuguese text, character by character with accents and punctuation, in an elegant cream serif typeface (Cormorant Garamond style), centered, large and fully legible. Every word appears once; nothing else is written anywhere in the image: "${txt}"`;
const COVER = `Cover layout: in the upper third, the title in big embossed golden 3D letters, rendered EXACTLY: "${TITLE}". Right below it, the subtitle in small cream serif, rendered EXACTLY and only once: "${SUBTITLE}". All lettering sits completely inside the image with a clear margin from every edge. Nothing else is written anywhere.`;

// ---------- roteiro ----------
// refs: páginas-âncora de personagens/elementos (01 mãe, 04 soldadinhos, 05 menina, 06 Dra. Lia, 09 enfermeiro)
const PAGES = [
  { id: "00", cover: true, scene: `the boy stands in a heroic pose on a sunny clinic path, chest out and fists on hips, a round gold star sticker on his t-shirt and a small colorful bandage on his left upper arm; around him float ${SOLDIERS}; a cozy pediatric clinic with a red roof softly blurred behind him; bright blue sky.` },
  { id: "01", pos: "upper", refs: [], scene: `sunny morning bedroom; the boy sits up in bed with a worried face and the blanket on his lap; ${MOM} stands at the open door smiling gently; a yellow t-shirt is laid out on a chair.`, text: `Naquela manhã, ${NOME} acordou com o sol no rosto e um aviso da mamãe: hoje era dia de vacina. A palavra vacina fez a barriga dele dar uma cambalhota.` },
  { id: "02", pos: "lower", refs: ["01"], scene: `bright kitchen at breakfast; the boy sits at the table stirring a bowl of cereal without eating, chin resting on his other hand, gloomy eyes; ${MOM} pours juice beside him and looks at him with tenderness.`, text: `No café da manhã, ${NOME} mexeu o cereal sem comer. Ele lembrava da última vez, do cheiro do álcool e daquela picadinha rápida. Só de pensar, o braço já doía um pouquinho.` },
  { id: "03", pos: "upper", refs: ["01"], scene: `sunny sidewalk lined with flowers; the boy walks holding hands with ${MOM}, looking up at her while she talks and gestures with her free hand; a small dog behind a fence watches them.`, text: `No caminho, a mamãe explicou que a vacina é como um treino para o corpo. Ela ensina os soldadinhos de dentro a reconhecer os vilões antes de eles chegarem.` },
  { id: "04", pos: "lower", refs: ["01"], scene: `same sunny sidewalk; the boy walks beside ${MOM} with a small smile, imagining: ${SOLDIERS} march in a cheerful line along his arm and around his head, clearly a glowing daydream.`, text: `${NOME} imaginou um exército de soldadinhos dentro dele, com escudos brilhantes, prontos para proteger cada cantinho do corpo. A ideia até fez ele sorrir um pouco.` },
  { id: "05", pos: "upper", refs: ["01"], scene: `colorful pediatric waiting room with animal murals and a wooden toy box; the boy sits pressed against ${MOM} on a bench, holding her hand tightly and staring at a closed door; across the room ${GIRL} sits on a small chair, also nervous.`, text: `A clínica tinha paredes coloridas e uma caixa de brinquedos. Mas ${NOME} ficou sentado bem juntinho da mamãe, segurando forte a mão dela e olhando para a porta.` },
  { id: "06", pos: "lower", refs: ["01"], scene: `the consulting room door opens onto the waiting room; ${DRA} crouches at the doorway waving warmly at the boy, who sits with ${MOM} and looks at her with surprise.`, text: `A porta abriu e a Dra. Lia apareceu com seu jaleco branco e um sorriso enorme. Ela chamou ${NOME} pelo nome e disse que tinha uma missão importante para ele.` },
  { id: "07", pos: "upper", refs: ["06", "04"], scene: `bright consulting room; ${DRA} sits beside the boy holding a large drawing of a child's body outline with ${SOLDIERS} inside it (a picture only, no letters); the boy leans in, curious, mouth slightly open.`, text: `No consultório, a Dra. Lia mostrou um desenho do corpo com os soldadinhos de escudo. Ela contou que a vacina entrega para eles a foto do vilão, para nunca mais serem enganados.` },
  { id: "08", pos: "lower", refs: ["06", "01"], scene: `the boy sits on the exam table, shoulders raised, staring at a metal tray with a small syringe and cotton balls on the counter; ${DRA} kneels in front of him with a hand on his knee and a calm, kind face; ${MOM} stands behind him.`, text: `${NOME} olhou para a bandeja com a seringa e engoliu em seco. As pernas quiseram correr. A Dra. Lia percebeu e disse que ter medo era normal, até para os corajosos.` },
  { id: "09", pos: "upper", refs: ["06"], scene: `the boy on the exam table points firmly at his own left arm with a determined face; ${DRA} smiles and nods; beside the counter ${NURSE} prepares a cotton ball, seen in profile.`, text: `A doutora deixou ${NOME} escolher: o braço direito ou o esquerdo, olhar ou não olhar, e o que contar durante a picada. Ele escolheu o esquerdo, não olhar, e contar até três.` },
  { id: "10", pos: "lower", refs: ["09", "01"], scene: `close view: ${NURSE} gently wipes the boy's left upper arm with a cotton ball; the boy has his eyes shut tight and his lips pressed, squeezing the hand of ${MOM}, who stands at his right side.`, text: `O enfermeiro Beto passou o algodão gelado no braço. Cheiro de álcool, o mesmo de sempre. ${NOME} respirou fundo, apertou a mão da mamãe e fechou os olhos.` },
  { id: "11", pos: "upper", refs: ["09", "06"], scene: `the boy opens his eyes wide in surprise, mouth in a small o; ${NURSE} is already pressing a small colorful bandage onto his left upper arm; ${DRA} gives a thumbs up with a big smile.`, text: `Um, dois... A picadinha veio antes do três. Foi rápida como um beliscão de formiga, e quando ${NOME} abriu os olhos, já tinha acabado.` },
  { id: "12", pos: "lower", refs: ["06"], scene: `the boy looks down at the small colorful bandage on his left arm and laughs with relief, eyebrows raised; ${DRA} laughs with him, hands on her knees at his eye level.`, text: `${NOME} olhou para o braço. Só um curativo pequeno e colorido. Ele riu de alívio e perguntou se era só isso mesmo. A Dra. Lia respondeu que sim, era só isso.` },
  { id: "13", pos: "upper", refs: ["04"], scene: `the boy flexes his left arm proudly like a strong man, bandage visible; around the arm, as a glowing daydream, ${SOLDIERS} raise their shields together in a training formation.`, text: `Dentro dele, os soldadinhos já estavam recebendo a foto do vilão e treinando com seus escudos. ${NOME} não via nada disso, mas sentia que estava mais forte.` },
  { id: "14", pos: "lower", refs: ["06"], scene: `${DRA} holds open a drawer full of colorful stickers; the boy presses a round gold star sticker onto the middle of his yellow t-shirt, looking down at it with pride.`, text: `A Dra. Lia abriu uma gaveta cheia de adesivos e deixou ${NOME} escolher. Ele pegou uma estrela dourada e colou bem no meio da camiseta, como uma medalha.` },
  { id: "15", pos: "upper", refs: ["06", "01"], scene: `${DRA} stands at the consulting room door talking to ${MOM} and the boy, gently pointing at the boy's bandaged arm; the boy, star sticker on his shirt, listens and nods.`, text: `Antes de sair, a doutora explicou que o braço podia ficar dolorido ou um pouco quente. Isso era sinal de que os soldadinhos estavam trabalhando, e passaria logo.` },
  { id: "16", pos: "lower", refs: ["05", "01"], scene: `back in the waiting room; ${GIRL} sits on the small chair with tears on her cheeks, hugging the bunny tightly and shaking her head; the boy, star sticker on his shirt, notices her from beside ${MOM}.`, text: `Na sala de espera, a menina de vestido rosa continuava lá, abraçada ao coelhinho, com os olhos cheios de lágrimas. Era a vez dela, e ela não queria ir.` },
  { id: "17", pos: "upper", refs: ["05"], scene: `the boy sits on the small chair next to ${GIRL}, turned toward her, showing the colorful bandage on his left arm and pointing at the gold star on his shirt; she has stopped crying and looks at the bandage, curious.`, text: `${NOME} sentou ao lado dela e mostrou o curativo. Contou dos soldadinhos, do beliscão de formiga e do adesivo de estrela. A menina parou de chorar para ouvir.` },
  { id: "18", pos: "lower", refs: ["05", "06"], scene: `${GIRL} stands at the consulting room door beside ${DRA}, bunny under one arm, and turns back to give a thumbs up with a small brave smile; the boy waves at her from the bench.`, text: `Quando a Dra. Lia chamou, a menina levantou, respirou fundo e escolheu o braço direito. Da porta, ela olhou para ${NOME} e fez sinal de positivo.` },
  { id: "19", pos: "upper", refs: ["01", "04"], scene: `golden late afternoon on the way home; the boy walks hand in hand with ${MOM}, the gold star sticker shining on his chest, bandage on his arm; faint ${SOLDIERS} glow around him like a gentle aura.`, text: `No caminho de casa, ${NOME} andou com a estrela brilhando no peito. Ele sabia que dentro dele um exército inteiro tinha ganhado um novo escudo. E ele também.` },
];

const buildPrompt = (p) => p.cover
  ? `${STYLE} ${CHARACTER} Scene: ${p.scene} ${COVER}`
  : `${STYLE} ${CHARACTER} ${CONSISTENCY} Scene: ${p.scene} ${TEXT(p.pos, p.text)}`;

async function predict(input) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const r = await fetch("https://api.replicate.com/v1/models/openai/gpt-image-2/predictions", { method: "POST", headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json", Prefer: "wait=60" }, body: JSON.stringify({ input }) });
    let j = await r.json();
    if (r.status === 429) { console.log("  429, esperando 20s"); await new Promise((s) => setTimeout(s, 20000)); continue; }
    if (!j.urls) throw new Error(`HTTP ${r.status} ${JSON.stringify(j).slice(0, 300)}`);
    while (!["succeeded", "failed", "canceled"].includes(j.status)) { await new Promise((s) => setTimeout(s, 4000)); j = await (await fetch(j.urls.get, { headers: { Authorization: `Bearer ${tok}` } })).json(); }
    if (j.status === "succeeded") return j;
    console.log(`  falhou na API (${j.error}), tentativa ${attempt}`);
  }
  throw new Error("esgotou tentativas");
}

const words = (t) => t.trim().split(/\s+/).length;
const gen = {};
const T0 = Date.now();
for (const p of PAGES) {
  const file = join(outDir, `${p.id}.png`);
  if (existsSync(file)) { gen[p.id] = readFileSync(file); console.log(p.id, "já existe"); continue; }
  const refs = p.cover ? [] : ["00", ...p.refs];
  const input_images = [...PHOTOS.map(toUri), ...refs.map((r) => toUri(gen[r]))];
  const t0 = Date.now();
  const j = await predict({ prompt: buildPrompt(p), input_images, aspect_ratio: "3:4", quality: "high", output_format: "png" });
  const url = Array.isArray(j.output) ? j.output[0] : j.output;
  gen[p.id] = Buffer.from(await (await fetch(url)).arrayBuffer());
  writeFileSync(file, gen[p.id]);
  console.log(p.id, `${p.text ? words(p.text) + "w" : "capa"} predict=${j.metrics?.predict_time?.toFixed(1)}s wall=${((Date.now() - t0) / 1000).toFixed(0)}s`);
  await new Promise((s) => setTimeout(s, 11000));
}
console.log(`total ${((Date.now() - T0) / 1000).toFixed(0)}s`);

const doc = new PDFDocument({ size: "A4", margin: 0, autoFirstPage: false });
doc.pipe(createWriteStream(join(outDir, "o-escudo-do-samuel.pdf")));
for (const p of PAGES) { doc.addPage(); doc.image(gen[p.id], 0, 0, { cover: [595.28, 841.89], align: "center", valign: "center" }); }
doc.end();
console.log("pdf ok");
