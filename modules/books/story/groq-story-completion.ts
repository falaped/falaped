import { env } from "@/lib/env"
import { groq } from "@/modules/groq/groq-client"
import type { StoryCompletion } from "@/modules/books/story/generate-story"

/** Adaptador Groq para a geração da história: JSON mode, temperatura moderada para variar sem inventar. */
export const groqStoryCompletion: StoryCompletion = async (system, user) => {
  const completion = await groq.chat.completions.create({
    model: env.GROQ_ASSISTANT_MODEL,
    temperature: 0.6,
    max_tokens: 8000,
    // gpt-oss raciocina antes de responder e o raciocínio consome max_tokens; baixo evita JSON truncado.
    reasoning_effort: "low",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
  })
  return completion.choices[0]?.message?.content?.trim() ?? ""
}
