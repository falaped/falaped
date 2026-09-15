// PROTOTYPE (issue #9) — livro de teste: capa + 5 páginas no Nano Banana 2 via Replicate, PDF no final.
// uso: node --env-file=.env.local scripts/proto-book-run.mjs <foto.png> <outDir>
import { readFileSync, writeFileSync, mkdirSync, createWriteStream } from "node:fs";
import { join } from "node:path";
import PDFDocument from "pdfkit";

const tok = process.env.REPLICATE_API_TOKEN;
const [photo, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const toUri = (buf) => `data:image/png;base64,${buf.toString("base64")}`;
const PHOTO = readFileSync(photo);
const G = "boy", NOME = "Samuel";

const STYLE = `Children's picture book illustration in the look of a 3D animated feature film (Pixar/Disney style): soft rounded shapes, big expressive eyes, clean smooth render, warm golden-hour lighting with gentle volumetric light rays, rich saturated colors, shallow cinematic depth of field. Portrait 3:4, full-bleed scene, no frame around the image, no watermark, no signature.`;
const CHARACTER = `Main character: the ${G} from the reference photo (first image), drawn as a 3D animated character with the body proportions of a child that age (head about one quarter of body height). Keep faithfully from the photo: hair cut, hair color and texture, skin tone, eye color, face shape, any distinctive features (glasses, freckles, dimples). Outfit: keep exactly the clothes visible in the photo and repeat them identically in every scene; if the photo shows only the upper body, complete the look with simple plain shorts or pants and sneakers in colors that match the top.`;
const CONSISTENCY = `The second image is the book cover already generated: reproduce the main character exactly as drawn there (same face, hair, outfit, colors, proportions and rendering style). Any secondary character shown in a previous page provided as reference must also look identical.`;
const TEXT = (layout, txt) => `The page contains EXACTLY the following Portuguese text, rendered character by character including accents, cedilla and punctuation, in an elegant warm serif typeface (Cormorant Garamond / Playfair Display style), generous line spacing, large and fully legible, with small gold heart-and-line ornaments separating sentences. No other letters, words, signs or logos anywhere in the image. Layout: ${layout}. Text: "${txt}"`;
const L = {
  L1: "a cream aged-parchment panel with a thin gold ornamental border in the upper third of the image, dark-brown text",
  L2: "no panel: the text floats directly over a softly blurred, gently darkened area of the scene, cream-colored text with a warm subtle glow, in the upper half",
  L3: "a cream parchment panel with gold border in the lower third, the scene above it, dark-brown text",
  L4: "a horizontal cream ribbon banner with gold trim across the top quarter, dark-brown text",
  L5: "text in cream color with warm glow on the left half over a softly darkened area, the character on the right half",
};
const COVER = `Cover layout: at the top, the title in large embossed golden 3D letters with a soft glow; below it, the child's name even larger inside a cream parchment plaque with an ornate gold frame; below the plaque, the subtitle in smaller dark-brown serif with a gold ornament divider. Render the texts EXACTLY, character by character, including accents. No other letters anywhere. Title: "${NOME} vai ao pediatra" Name: "${NOME}" Subtitle: "Uma história sobre coragem, curiosidade e cuidar da saúde."`;

const PAGES = [
  { id: "00-capa", refs: [], prompt: `${STYLE} ${CHARACTER} Scene: sunny cobblestone path lined with colorful flowers leading to a cozy pediatric clinic with a red-tiled roof and a small wooden heart sign with no letters; the ${G} walks toward it holding a brown teddy bear, calm happy smile, birds in a warm morning sky. ${COVER}` },
  { id: "01", refs: ["00-capa"], layout: "L1", scene: "sunny living room full of toys; the child jumps joyfully off a couch cushion with arms wide open, laughing, a teddy bear flying beside, blocks and picture books on a soft rug.", text: `Em uma casa cheia de brinquedos e risadas, vivia um menino chamado ${NOME}. Ele adorava correr, pular e inventar histórias.` },
  { id: "02", refs: ["00-capa"], layout: "L2", scene: "bedroom floor in soft morning light; the child sits hugging the teddy bear tightly, worried eyes, slight frown, a small backpack ready by the door; a mother figure seen from behind at the doorway.", text: `"Vai doer?", perguntou ${NOME}, apertando o ursinho. "Não", respondeu a mamãe. "A pediatra cuida de você para você crescer forte."` },
  { id: "03", refs: ["00-capa"], layout: "L4", scene: "bright consulting-room doorway; a friendly female pediatrician in a white coat with a colorful stethoscope crouches and waves with a big smile; the child peeks in curiously holding a green toy dinosaur, shy half smile.", text: `"${NOME}!", chamou uma voz gentil. Era a Dra. Lia, com um jaleco branco e um sorriso enorme. "Que bom te ver!"` },
  { id: "04", refs: ["00-capa", "03"], layout: "L3", scene: "the child sits on the examination table giggling with shoulders raised as the same pediatrician gently places the stethoscope on the chest; little heart shapes float in the air.", text: `"Agora vou ouvir seu coração." O estetoscópio estava geladinho e fez ${NOME} dar risada. Tum-tum, tum-tum!` },
  { id: "05", refs: ["00-capa", "03"], layout: "L5", scene: "close-up; the child looks down proudly at a shiny gold star sticker that the pediatrician's hand is placing on the shirt, eyes sparkling, big proud smile.", text: `Antes de ir, ${NOME} ganhou um adesivo de estrela dourada. "Por ser tão corajoso!"` },
];

const gen = {};
const T0 = Date.now();
for (const p of PAGES) {
  const prompt = p.prompt ?? `${STYLE} ${CHARACTER} ${CONSISTENCY} Scene: ${p.scene} ${TEXT(L[p.layout], p.text)}`;
  const image_input = [toUri(PHOTO), ...p.refs.map((r) => toUri(gen[r]))];
  const t0 = Date.now();
  let r = await fetch("https://api.replicate.com/v1/models/google/nano-banana-2/predictions", { method: "POST", headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json", Prefer: "wait=60" }, body: JSON.stringify({ input: { prompt, image_input, aspect_ratio: "3:4", resolution: "1K", output_format: "png" } }) });
  let j = await r.json();
  if (!j.urls) { console.log(p.id, "HTTP", r.status, JSON.stringify(j).slice(0, 200)); process.exit(1); }
  while (!["succeeded", "failed", "canceled"].includes(j.status)) { await new Promise((s) => setTimeout(s, 3000)); j = await (await fetch(j.urls.get, { headers: { Authorization: `Bearer ${tok}` } })).json(); }
  if (j.status !== "succeeded") { console.log(p.id, "FALHOU", j.error); process.exit(1); }
  const url = Array.isArray(j.output) ? j.output[0] : j.output;
  gen[p.id] = Buffer.from(await (await fetch(url)).arrayBuffer());
  writeFileSync(join(outDir, `${p.id}.png`), gen[p.id]);
  console.log(p.id, `predict=${j.metrics?.predict_time?.toFixed(1)}s wall=${((Date.now() - t0) / 1000).toFixed(0)}s`);
  await new Promise((s) => setTimeout(s, 11000));
}
console.log(`total ${((Date.now() - T0) / 1000).toFixed(0)}s (inclui 11s de espera entre páginas)`);

const doc = new PDFDocument({ size: "A4", margin: 0, autoFirstPage: false });
doc.pipe(createWriteStream(join(outDir, "livro-teste.pdf")));
for (const p of PAGES) { doc.addPage(); doc.image(gen[p.id], 0, 0, { cover: [595.28, 841.89], align: "center", valign: "center" }); }
doc.end();
console.log("pdf ok");
