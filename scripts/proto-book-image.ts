// PROTOTYPE (issue #9) — throwaway. Gera ilustrações do livro via AI Gateway
// e mede tempo/custo. Uso:
//   node --env-file=.env.local node_modules/.bin/tsx scripts/proto-book-image.ts [foto.png] [outDir]
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Google direto (GOOGLE_GENERATIVE_AI_API_KEY), sem AI Gateway.
const MODEL = google(process.env.BOOK_IMAGE_MODEL ?? "gemini-3.1-flash-image");
const photoPath = process.argv[2];
const outDir = process.argv[3] ?? "proto-out";
mkdirSync(outDir, { recursive: true });

const STYLE = `Children's picture book illustration in 3D animated film style (Pixar/Disney look): soft rounded shapes, expressive big eyes, warm golden-hour lighting, gentle volumetric light rays, rich saturated colors, detailed textures, shallow cinematic depth of field. Portrait orientation 3:4, full-bleed scene.
The main character is a 4-year-old boy${photoPath ? " — use the attached photo as the face reference: keep his facial features, hair style, hair color and skin tone faithful, stylized as a 3D animated character" : " with short light-brown hair and a big smile"}. He wears a blue and white striped t-shirt and khaki shorts in every scene.
Composition rule: reserve a large EMPTY cream parchment panel with a thin gold ornamental border in the upper third of the image, completely blank inside (no text, no letters, no symbols). The scene continues behind and below it.`;

const SCENES: Record<string, string> = {
  capa: `${STYLE}\nScene: the boy walks happily along a sunny cobblestone path lined with flowers toward a cozy pediatric clinic with a red-tiled roof, holding a teddy bear. Bright morning sky, birds.`,
  pag01: `${STYLE}\nScene: early morning in the boy's bedroom, sunlight through the window, he sits on the bed putting on his sneakers, excited, teddy bear beside him, toys on the shelf.`,
};

async function main() {
for (const [name, prompt] of Object.entries(SCENES)) {
  const t0 = Date.now();
  const content: Array<
    { type: "text"; text: string } | { type: "file"; mediaType: string; data: Buffer }
  > = [{ type: "text", text: prompt }];
  if (photoPath) content.push({ type: "file", mediaType: "image/png", data: readFileSync(photoPath) });

  const result = await generateText({
    model: MODEL,
    messages: [{ role: "user", content }],
    providerOptions: {
      google: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "3:4" } },
    },
  });

  const img = result.files.find((f) => f.mediaType.startsWith("image/"));
  if (!img) {
    console.log(name, "SEM IMAGEM. texto:", result.text.slice(0, 300));
    continue;
  }
  const file = join(outDir, `${name}.png`);
  writeFileSync(file, img.uint8Array);
  console.log(
    name,
    `${((Date.now() - t0) / 1000).toFixed(1)}s`,
    `${(img.uint8Array.byteLength / 1024).toFixed(0)}KB`,
    JSON.stringify(result.usage),
    JSON.stringify(result.providerMetadata ?? {}),
  );
}
}

main().catch((e) => { console.error(e); process.exit(1); });
