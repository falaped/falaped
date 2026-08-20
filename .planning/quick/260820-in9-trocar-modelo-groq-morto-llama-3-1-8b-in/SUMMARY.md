---
quick_id: 260820-in9
date: 2026-08-20
status: complete
---

# Quick 260820-in9 — modelo Groq morto → openai/gpt-oss-120b

## O que estava quebrado

A API do Groq (verificada ao vivo em 2026-08-20 via `GET /openai/v1/models`) não
serve mais `llama-3.1-8b-instant` nem `qwen/qwen3-32b`. Quatro referências no
código apontavam para esses ids — toda chamada falhava em runtime:

| Arquivo | Modelo morto |
|---|---|
| `lib/env.ts:6` (default de `GROQ_ASSISTANT_MODEL`) | `qwen/qwen3-32b` |
| `modules/groq/improve-report-section.ts:3` | `llama-3.1-8b-instant` |
| `modules/groq/generate-report-template-sections.ts:9` | `llama-3.1-8b-instant` |
| `modules/falaped-assistant/planning/extract-actions-by-llm.ts:5` | `qwen/qwen3-32b` |

O bug reportado foi só o "melhorar relatório", mas o default morto em `lib/env.ts`
significava que **todo o assistente** (chat, guardian questions, polish, classify,
clinical summary) também estava quebrado quando `GROQ_ASSISTANT_MODEL` não vinha
setado no ambiente.

`modules/groq/transcribe-audio.ts` usa `whisper-large-v3`, que segue válido — não
foi tocado.

## O que mudou

- `lib/env.ts` — default de `GROQ_ASSISTANT_MODEL` agora é `openai/gpt-oss-120b`.
- Os três call sites hardcoded passaram a ler `env.GROQ_ASSISTANT_MODEL`. Zero id
  de modelo de chat hardcoded fora de `lib/env.ts` — trocar de modelo é uma linha
  ou uma env var.
- `extract-actions-by-llm.ts` perdeu o `process.env...?.trim() || fallback` cru em
  favor do `env` já validado por Zod, alinhando com o resto de `modules/groq/`.

## Verificação

- `yarn typecheck` — passou.
- `grep` de ids de modelo de chat no código: só sobra a linha de `lib/env.ts`.
- Smoke real contra a API do Groq com `openai/gpt-oss-120b`, usando o system
  prompt de produção de `improve-report-section`:
  - entrada: `"paciente com febre 38.5 ha 2 dias, garganta vermelha, tomou dipirona 500mg"`
  - saída: `"Febre de 38,5 °C há 2 dias; faringe com hiperemia (garganta vermelha). Paciente relata uso de dipirona 500 mg."`
  - fatos preservados (38,5 / 2 dias / 500 mg), sem preâmbulo, sem markdown, sem
    vazamento de `<think>` no `content`.

## Decisão registrada

`openai/gpt-oss-120b` em vez de `openai/gpt-oss-20b` (o substituto mais barato e
próximo do 8b-instant): texto clínico gerado para o pediatra revisar não é o lugar
de economizar em modelo. Escolha do usuário.

`qwen/qwen3.6-27b` (sucessor direto do qwen3-32b do default antigo) foi descartado
por ser modelo de raciocínio: `improve-report-section` devolve texto puro, não
JSON, então precisaria de `reasoning_format` para não vazar `<think>` no conteúdo
do relatório.

## Pendência conhecida

O modelo agora é único para todos os usos (relatório, templates, assistente,
extração de ações). Se o custo do 120b incomodar nos caminhos baratos — o
`extract-actions-by-llm` roda a cada turno com 220 tokens de saída — o próximo
passo é uma segunda env var (`GROQ_FAST_MODEL`) para esses, mantendo o 120b nos
caminhos clínicos. Não feito agora: sem sinal de que o custo importe.
