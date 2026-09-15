// PROTOTYPE — gpt-image-2: 2 cenas, textos de 30+ palavras, estilo híbrido ilustração/realismo.
// uso: node --env-file=.env.local scripts/proto-book-gpt-hibrido.mjs <fotosDir> <outDir>
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const tok = process.env.REPLICATE_API_TOKEN;
const [photosDir, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const toUri = (b) => `data:image/png;base64,${b.toString("base64")}`;
const PHOTOS = ["foto1.png", "foto2.png"].map((f) => readFileSync(join(photosDir, f)));

const STYLE = `Children's picture book illustration in a stylized 3D animated look (Pixar/DreamWorks feature film), clearly a cartoon and NOT a photograph: simplified smooth skin with no pores or photographic texture, slightly enlarged expressive eyes, soft rounded shapes, painterly lighting, rich saturated colors, gentle depth of field. Face and body are rendered with the same degree of stylization and the same proportions of an animated child (head about one quarter of body height), so the head sits naturally on the body. Portrait 3:4, full-bleed, no frame, no watermark. Every book, poster, box, label and sign is blank: no letters or numbers on any object. No other people besides the ones described.`;
const CHARACTER = `Main character: the boy from the two reference photos, translated into this animated style while keeping his recognizable features: short curly dark hair, warm brown skin tone, dark eyes, the shape of his face and his big bright smile. Outfit: a blue pajama set with small yellow stars, barefoot. He holds his plush toy Dino, a soft green plush dinosaur.`;
const TEXT = (pos, txt) => `Text panel: in the ${pos} third of the image, a translucent deep-navy rounded rectangle with a thin cream border and one small cream star centered on its top edge. Inside it, EXACTLY the following Portuguese text, character by character with accents and punctuation, in an elegant cream serif typeface (Cormorant Garamond style), centered, large and fully legible, no ornaments between sentences, nothing else written anywhere: "${txt}"`;

const SCENES = [
  { id: "A", pos: "lower", scene: `bright pediatric office with jungle-animal wall murals; Dra. Lia, a friendly pediatrician with short brown hair, white coat and a colorful stethoscope, crouches at the boy's eye level holding up four fingers with a kind smile; the boy sits on the exam table hugging Dino and listening with wide curious eyes; his mother, a warm woman with dark hair in a low bun and a beige cardigan, stands beside him with a hand on his shoulder.`,
    text: `Na consulta, a Dra. Lia explicou que meninos grandes já conseguem dormir na própria cama. Depois deu uma dica em quatro passos: um banho quentinho, uma história, a luz bem baixa e um amigo de pelúcia para fazer companhia.` },
  { id: "B", pos: "lower", scene: `the boy's bedroom at night during a storm, rain streaking the window and a lightning flash outside; the blue bed is drawn as a sturdy wooden boat floating on gentle painted waves that fill the floor; the boy stands at the headboard like a captain, one hand shading his eyes, the other hugging Dino, brave smile; a warm bedside lamp glows.`,
    text: `Na segunda noite choveu forte e um trovão sacudiu a janela do quarto. Samuel apertou o Dino contra o peito, respirou fundo e imaginou que a sua cama era um barco firme, navegando tranquilo no meio do mar.` },
];

const words = (t) => t.trim().split(/\s+/).length;
const gen = {};
for (const s of SCENES) {
  const file = join(outDir, `${s.id}.png`);
  if (existsSync(file)) { gen[s.id] = readFileSync(file); console.log(s.id, "já existe"); continue; }
  const consistency = gen.A ? " The third input image is a page already generated for this book: reproduce the main character and Dino exactly as drawn there (same stylized face, hair, pajama, colors, proportions)." : "";
  const prompt = `${STYLE} ${CHARACTER}${consistency} Scene: ${s.scene} ${TEXT(s.pos, s.text)}`;
  const input_images = [...PHOTOS.map(toUri), ...(gen.A ? [toUri(gen.A)] : [])];
  console.log(s.id, `${words(s.text)} palavras`);
  const t0 = Date.now();
  const r = await fetch("https://api.replicate.com/v1/models/openai/gpt-image-2/predictions", { method: "POST", headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json", Prefer: "wait=60" }, body: JSON.stringify({ input: { prompt, input_images, aspect_ratio: "3:4", quality: "medium", output_format: "png" } }) });
  let j = await r.json();
  if (!j.urls) { console.log("HTTP", r.status, JSON.stringify(j).slice(0, 300)); process.exit(1); }
  while (!["succeeded", "failed", "canceled"].includes(j.status)) { await new Promise((z) => setTimeout(z, 3000)); j = await (await fetch(j.urls.get, { headers: { Authorization: `Bearer ${tok}` } })).json(); }
  if (j.status !== "succeeded") { console.log(s.id, "FALHOU", j.error); process.exit(1); }
  const url = Array.isArray(j.output) ? j.output[0] : j.output;
  gen[s.id] = Buffer.from(await (await fetch(url)).arrayBuffer());
  writeFileSync(file, gen[s.id]);
  console.log(s.id, `predict=${j.metrics?.predict_time?.toFixed(1)}s wall=${((Date.now() - t0) / 1000).toFixed(0)}s`);
  await new Promise((z) => setTimeout(z, 11000));
}
console.log("fim");
