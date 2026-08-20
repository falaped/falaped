---
quick_id: 260820-in9
date: 2026-08-20
status: in-progress
---

# Quick: trocar modelo Groq morto por openai/gpt-oss-120b

## Problema

`GET https://api.groq.com/openai/v1/models` (verificado ao vivo em 2026-08-20) não
lista mais `llama-3.1-8b-instant` nem `qwen/qwen3-32b`. Quatro referências no
código apontam para modelos inexistentes — toda chamada falha em runtime.

Modelos de chat disponíveis hoje: `openai/gpt-oss-120b`, `openai/gpt-oss-20b`,
`openai/gpt-oss-safeguard-20b`, `qwen/qwen3.6-27b`, `groq/compound`,
`groq/compound-mini`, `allam-2-7b`. Whisper (`whisper-large-v3`) segue válido —
`modules/groq/transcribe-audio.ts` não muda.

## Decisão

- Modelo: `openai/gpt-oss-120b` (escolha do usuário) — texto clínico não é lugar
  para economizar em modelo.
- Fonte única: todos os call sites de chat leem `env.GROQ_ASSISTANT_MODEL`.
  Zero model id hardcoded fora de `lib/env.ts`.

## Tasks

1. `lib/env.ts:6` — default `qwen/qwen3-32b` → `openai/gpt-oss-120b`
2. `modules/groq/improve-report-section.ts:3` — remove hardcode, usa `env.GROQ_ASSISTANT_MODEL`
3. `modules/groq/generate-report-template-sections.ts:9` — idem
4. `modules/falaped-assistant/planning/extract-actions-by-llm.ts:5` — remove
   `process.env` cru + fallback morto, usa `env.GROQ_ASSISTANT_MODEL`

## Verificação

- `yarn typecheck`
- `grep` prova que nenhum model id de chat sobrou hardcoded no código
- smoke real contra a API do Groq com o modelo escolhido
