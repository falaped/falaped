// PROTOTYPE — "A Cama do Samuel", capa + 10 páginas, dois testes one-shot:
//   nb2: google/nano-banana-2 SEM texto na imagem; painel + texto desenhados pelo pdfkit
//   gpt: openai/gpt-image-2 COM texto dentro da imagem
// uso: node --env-file=.env.local scripts/proto-book-cama.mjs <nb2|gpt> <fotosDir> <fontsDir> <outDir>
import { readFileSync, writeFileSync, mkdirSync, createWriteStream, existsSync } from "node:fs";
import { join } from "node:path";
import PDFDocument from "pdfkit";

const tok = process.env.REPLICATE_API_TOKEN;
const [mode, photosDir, fontsDir, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const toUri = (buf) => `data:image/png;base64,${buf.toString("base64")}`;
const PHOTOS = ["foto1.png", "foto2.png"].map((f) => readFileSync(join(photosDir, f)));
const NOME = "Samuel";
const TITLE = `A Cama do ${NOME}`;
const SUBTITLE = "Uma história sobre crescer, coragem e boas noites de sono.";

// ---------- blocos fixos ----------
const STYLE = `Children's picture book illustration in the look of a 3D animated feature film (Pixar/Disney style): soft rounded shapes, big expressive eyes, clean smooth render, warm cinematic lighting, rich colors, shallow depth of field. Portrait 3:4, full-bleed scene, no frame, no watermark, no signature. Every book, poster, box, label and sign in the scene is blank: no letters, words or numbers on any object. Background people, if any, look different from each other and from the main character.`;
const CHARACTER = `Main character: the boy from the reference photos (the first two input images), drawn as a 3D animated character with the proportions of a child that age (head about one quarter of body height). Keep faithfully from the photos: his short curly dark hair, his skin tone, eye color, face shape and big bright smile. Outfit in every scene, different from the photos: a blue pajama set with small yellow stars, barefoot. He always has his plush toy Dino, a soft green plush dinosaur, unless the scene says otherwise.`;
const CONSISTENCY = `One of the input images is the book cover already generated: reproduce the main character and Dino exactly as drawn there (same face, hair, pajama, colors, proportions and rendering style). Any other character shown in another input page must look identical to that page.`;
const MOM = "the mother, a warm woman with dark hair in a low bun and a beige cardigan";
const DAD = "the father, a man with a short beard and a light-blue shirt";
const DRA = "Dra. Lia, a friendly pediatrician with short brown hair, white coat and a colorful stethoscope";
const COMPOSITION = (pos) => `Composition: the illustration fills the entire image edge to edge, with no blank, flat or empty bands. Place the characters and the action in the ${pos === "top" ? "lower" : "upper"} two thirds of the frame. The ${pos === "top" ? "upper" : "lower"} third continues the scene naturally (ceiling, wall, sky, curtains or softly blurred background) but is visually quiet: no characters, faces or important objects there. No text anywhere in the image.`;
const GPT_TEXT = (pos, txt) => `Text panel: in the ${pos === "top" ? "upper" : "lower"} third of the image, a translucent deep-navy rounded rectangle with a thin cream border and one small cream star centered on its top edge. Inside it, EXACTLY the following Portuguese text, character by character with accents and punctuation, in an elegant cream serif typeface (Cormorant Garamond style), centered, large and fully legible, no ornaments between sentences, nothing else written anywhere: "${txt}"`;

// ---------- roteiro ----------
const PAGES = [
  { id: "00", pos: "top", refs: [], cover: true, scene: `night-blue bedroom with glowing star stickers on the ceiling; the boy sits proudly on his blue bed as if on a throne, arms crossed with a confident smile, Dino sitting beside him, a warm bedside lamp, a small window with a crescent moon.` },
  { id: "01", pos: "top", refs: [], scene: `dim hallway at night; the boy in pajama tiptoes through the half-open door of the parents' bedroom holding Dino; inside, ${MOM} and ${DAD} sit up in a big bed, sleepy and surprised; a night light glows.`, text: `${NOME} tinha um quarto só dele, com uma cama azul e estrelinhas no teto. Mas toda noite, quando a luz apagava, ele aparecia na cama da mamãe e do papai.` },
  { id: "02", pos: "bottom", refs: [], scene: `bright colorful pediatric office with animal murals; ${DRA} crouches at the boy's eye level holding up four fingers with a kind smile; the boy sits on the exam table holding Dino, listening attentively; ${MOM} stands beside them.`, text: `Na consulta, a Dra. Lia explicou que meninos grandes dormem na própria cama. E deu uma dica: banho, história, luz baixa e um amigo de pelúcia para fazer companhia.` },
  { id: "03", pos: "top", refs: [], scene: `the boy's bedroom in warm lamp light; ${DAD} sits on the edge of the blue bed reading a blank-covered picture book aloud; the boy lies tucked under the blanket with Dino, hair still damp from the bath, smiling.`, text: `Naquela noite começou o plano. Banho quentinho, pijama de estrelas, e o papai leu a história favorita sentado na beirada da cama.` },
  { id: "04", pos: "bottom", refs: [], scene: `the same bedroom, lights off, blue moonlight; on the wall the shadow of a wardrobe and a coat rack forms the shape of a monster with long arms; the boy lies in bed with the blanket pulled up so only his wide eyes show, Dino beside him.`, text: `Depois a luz apagou. As sombras do armário pareciam um monstro de braços compridos. ${NOME} puxou o cobertor até o nariz.` },
  { id: "05", pos: "bottom", refs: [], scene: `close view of the boy in bed at night hugging Dino tightly, eyes open and calm, looking up at the glowing star stickers on the ceiling, soft blue light, expression of concentration.`, text: `Então ele lembrou da dica. Respirou fundo três vezes, abraçou o Dino bem forte e contou as estrelinhas do teto. Uma, duas, três, dez.` },
  { id: "06", pos: "top", refs: [], scene: `night hallway; the boy stands with his back to the parents' closed door, holding Dino, looking toward his own bedroom whose open door glows softly with starlight; determined expression.`, text: `No meio da noite, ${NOME} acordou e caminhou até a porta dos pais. Parou. Olhou para o seu quarto. E voltou sozinho para a sua cama.` },
  { id: "07", pos: "top", refs: ["01"], scene: `sunny kitchen at breakfast; the boy in pajama stands on a chair raising both arms in triumph with Dino in one hand; ${MOM} and ${DAD} clap their hands, laughing; cereal bowls and a pitcher of juice on the table.`, text: `De manhã, o sol entrou pela janela e ${NOME} acordou na própria cama. No café, a mamãe e o papai bateram palmas. Dino também.` },
  { id: "08", pos: "bottom", refs: [], scene: `the boy's bed drawn as a sturdy boat floating on gentle painted blue waves that fill the bedroom floor, rain and a lightning flash outside the window; the boy stands at the headboard like a captain, one hand shading his eyes, hugging Dino with the other, brave smile.`, text: `Na segunda noite choveu forte e um trovão sacudiu a janela. ${NOME} apertou o Dino e imaginou que a cama era um barco firme no meio do mar.` },
  { id: "09", pos: "top", refs: ["03"], scene: `the boy's bedroom in soft lamp light; ${DAD} gently closes the blank-covered book with a tender smile; the boy is fast asleep under the blanket with Dino under his arm and a peaceful smile.`, text: `Na terceira noite, o papai nem terminou a história. Quando olhou, ${NOME} já dormia, com o Dino debaixo do braço e um sorriso no rosto.` },
  { id: "10", pos: "bottom", refs: [], scene: `daytime in the boy's bedroom; the boy points up at the star stickers on the ceiling while a smaller girl cousin with two curly puffs of hair holds Dino and looks up amazed; both smiling, sunlight through the window.`, text: `Hoje ${NOME} dorme toda noite na sua cama. E quando alguém tem medo do escuro, ele ensina a dica: respira fundo, abraça o amigo e conta as estrelinhas.` },
];

const buildPrompt = (p) => {
  const base = `${STYLE} ${CHARACTER} ${p.cover ? "" : CONSISTENCY} Scene: ${p.scene}`;
  if (mode === "nb2") return `${base} ${COMPOSITION(p.pos)}`;
  if (p.cover) return `${base} Cover layout: in the upper third, the title in big embossed golden 3D letters, rendered EXACTLY: "${TITLE}". Below it the subtitle in small cream serif, rendered EXACTLY and only once: "${SUBTITLE}". Nothing else written anywhere.`;
  return `${base} ${GPT_TEXT(p.pos, p.text)}`;
};

const MODEL = mode === "nb2" ? "google/nano-banana-2" : "openai/gpt-image-2";
const buildInput = (prompt, imgs) => mode === "nb2"
  ? { prompt, image_input: imgs, aspect_ratio: "3:4", resolution: "1K", output_format: "png" }
  : { prompt, input_images: imgs, aspect_ratio: "3:4", quality: "medium", output_format: "png" };

async function predict(input) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const r = await fetch(`https://api.replicate.com/v1/models/${MODEL}/predictions`, { method: "POST", headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json", Prefer: "wait=60" }, body: JSON.stringify({ input }) });
    let j = await r.json();
    if (r.status === 429) { console.log("  429, esperando 20s"); await new Promise((s) => setTimeout(s, 20000)); continue; }
    if (!j.urls) throw new Error(`HTTP ${r.status} ${JSON.stringify(j).slice(0, 300)}`);
    while (!["succeeded", "failed", "canceled"].includes(j.status)) { await new Promise((s) => setTimeout(s, 3000)); j = await (await fetch(j.urls.get, { headers: { Authorization: `Bearer ${tok}` } })).json(); }
    if (j.status === "succeeded") return j;
    console.log(`  falhou (${j.error}), tentativa ${attempt}`);
  }
  throw new Error("esgotou tentativas");
}

const gen = {};
const T0 = Date.now();
for (const p of PAGES) {
  const file = join(outDir, `${p.id}.png`);
  if (existsSync(file)) { gen[p.id] = readFileSync(file); console.log(p.id, "já existe"); continue; }
  const refs = p.cover ? [] : ["00", ...p.refs];
  const imgs = [...PHOTOS.map(toUri), ...refs.map((r) => toUri(gen[r]))];
  const t0 = Date.now();
  const j = await predict(buildInput(buildPrompt(p), imgs));
  const url = Array.isArray(j.output) ? j.output[0] : j.output;
  gen[p.id] = Buffer.from(await (await fetch(url)).arrayBuffer());
  writeFileSync(file, gen[p.id]);
  console.log(p.id, `predict=${j.metrics?.predict_time?.toFixed(1)}s wall=${((Date.now() - t0) / 1000).toFixed(0)}s`);
  await new Promise((s) => setTimeout(s, 11000));
}
console.log(`total ${((Date.now() - T0) / 1000).toFixed(0)}s`);

// ---------- PDF ----------
const W = 595.28, H = 841.89, M = 34;
const SERIF = join(fontsDir, "CormorantGaramond[wght].ttf");
const DISPLAY = join(fontsDir, "PlayfairDisplay[wght].ttf");
const doc = new PDFDocument({ size: "A4", margin: 0, autoFirstPage: false });
doc.pipe(createWriteStream(join(outDir, `a-cama-do-samuel-${mode}.pdf`)));

function star(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const rr = i % 2 ? r * 0.45 : r; pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]); }
  doc.moveTo(...pts[0]); pts.slice(1).forEach((q) => doc.lineTo(...q)); doc.closePath().fill("#f7efd8");
}
function panel(text, pos, size = 21) {
  const pw = W - 2 * M, pad = 22;
  doc.font(SERIF).fontSize(size);
  const th = doc.heightOfString(text, { width: pw - 2 * pad, align: "center", lineGap: 5 });
  const ph = th + 2 * pad + 8;
  const y = pos === "top" ? M : H - M - ph;
  doc.save().fillOpacity(0.8).roundedRect(M, y, pw, ph, 16).fill("#16233f").restore();
  doc.save().lineWidth(1).strokeColor("#f3e9c9").roundedRect(M + 5, y + 5, pw - 10, ph - 10, 12).stroke().restore();
  star(W / 2, y + 5, 7);
  doc.fillColor("#f7efd8").text(text, M + pad, y + pad + 8, { width: pw - 2 * pad, align: "center", lineGap: 5 });
}
for (const p of PAGES) {
  doc.addPage();
  doc.image(gen[p.id], 0, 0, { cover: [W, H], align: "center", valign: "center" });
  if (mode !== "nb2") continue;
  if (p.cover) {
    doc.save().fillOpacity(0.55).roundedRect(M, M, W - 2 * M, 150, 16).fill("#16233f").restore();
    doc.font(DISPLAY).fontSize(50).fillColor("#ffd35c").strokeColor("#3a2a10").lineWidth(1.2).text(TITLE, M, M + 26, { width: W - 2 * M, align: "center", fill: true, stroke: true });
    doc.font(SERIF).fontSize(19).fillColor("#f7efd8").text(SUBTITLE, M, M + 100, { width: W - 2 * M, align: "center" });
  } else panel(p.text, p.pos);
}
doc.end();
console.log("pdf ok");
