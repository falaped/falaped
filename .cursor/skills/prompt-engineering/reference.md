# Prompt Engineering Reference — OpenAI + Groq

Detailed patterns, examples, and checklists extracted from OpenAI and Groq official documentation. Use as lookup when applying the SKILL.md workflows.

---

## 1. Prompt Structure Templates

### Template A: Zero-Shot (Simple Tasks)

```
# Identity
You are [role] specialized in [domain].

# Instructions
1. [Primary action verb] the input and return [output type].
2. [Constraint or formatting rule].
3. [Negative constraint — what NOT to do].

# Output format
Return ONLY [format]. Example:
{"key1": "value", "key2": "value"}
```

**Use for:** Simple Q&A, definitions, basic classification, formatting tasks.

### Template B: Few-Shot (Extraction / Classification)

```
# Identity
You are [role].

# Instructions
1. [Action] the input following the examples below.
2. Return ONLY [format].

# Examples

<input id="1">
[example input 1]
</input>
<output id="1">
[example output 1]
</output>

<input id="2">
[example input 2]
</input>
<output id="2">
[example output 2]
</output>

# Now process the following input:
```

**Use for:** Structured extraction, custom classification labels, edge-case handling, consistent formatting.

**Best practices:**
- 1-3 examples for simple tasks, 3-8 for complex
- Show diverse inputs (happy path + edge cases)
- Keep examples concise — full but not padded
- Match the exact output schema in every example

### Template C: Chain of Thought (Reasoning)

```
# Identity
You are [role].

# Instructions
1. Think through this step by step.
2. For each step, explain your reasoning briefly.
3. After reasoning, provide the final answer in [format].

# Steps
1. [First analysis step]
2. [Second analysis step]
3. [Conclusion/decision]

# Output format
{
  "reasoning": "[brief chain of thought]",
  "answer": "[final answer]"
}
```

**Use for:** Multi-step math/logic, complex medical decisions, debugging analysis.

### Template D: Medical/Pediatric Chat (FALAPED-Specific)

```
You are [ASSISTANT_NAME], [role description].

# Rules
1. [Most critical behavioral rule]
2. [Second priority rule]
...
N. [Lowest priority rule]

# Conditional blocks (injected dynamically)
[BLOCK_NAME]:
- [conditional rules based on input flags]

Return ONLY valid JSON: {"reply": "..."}
```

**User message pattern:**
```json
{
  "patientContext": "string | null",
  "conversationSummary": "string | null",
  "messages": [{"role": "user|assistant", "content": "..."}],
  "mode": "mode_identifier",
  "modeInstruction": "instruction for this mode",
  "flags": {},
  "instruction": "Focus instruction for this turn"
}
```

---

## 2. Formatting Best Practices

### Markdown in Prompts (OpenAI recommendation)

Use markdown to create visual hierarchy within prompts:

```markdown
# Section Header          → Major section boundary
## Sub-section             → Sub-topic
- Bullet list              → Unordered rules
1. Numbered list           → Ordered steps/priority
**Bold text**              → Emphasis on key terms
`code/technical terms`     → Technical identifiers
```

### XML Tags for Data Boundaries (OpenAI recommendation)

Wrap data blocks in XML to separate instructions from content:

```xml
<document source="medical_record" id="rec-001">
[document content here]
</document>

<user_query>
[user's question about the document]
</user_query>
```

**Why:** Prevents the model from confusing data content with instructions.

### Delimiters for Raw Text (Groq recommendation)

Use triple backticks or angle brackets for raw input:

````
```
[raw text input here]
```
````

Or:
```
<<<
[raw text input here]
>>>
```

---

## 3. Role Channel Usage

### OpenAI API

| Role | Purpose | Priority |
|------|---------|----------|
| `developer` | App-level instructions, business logic (like a function definition) | Highest |
| `user` | End-user input, arguments to the instructions | Medium |
| `assistant` | Model's previous responses (for multi-turn) | Lowest |

### Groq API (Used in FALAPED)

| Role | Purpose |
|------|---------|
| `system` | Persona + non-negotiable rules |
| `user` | Request/data payload |
| `assistant` | Conversation history (for multi-turn) |

**FALAPED convention:** Use `system` + `user` only. Conversation history is embedded inside the user JSON payload, not as separate `assistant` role messages in the API call.

---

## 4. Pattern Selection Decision Tree

```
Is the task simple with clear input/output?
├── YES → Zero-Shot
│   └── Add persona if domain-specific
└── NO → Does output need specific format/labels?
    ├── YES → Few-Shot (1-3 examples)
    │   └── Show edge cases if high variability
    └── NO → Does it require multi-step reasoning?
        ├── YES → Chain of Thought
        │   └── Add self-consistency for critical accuracy
        └── NO → Does it need external tools/knowledge?
            ├── YES → ReAct (Reasoning + Acting)
            └── NO → Is it summarization?
                ├── YES → Chain of Density
                └── NO → Zero-Shot with detailed instructions
```

---

## 5. Temperature & Parameter Guide

### When to Use Each Temperature Range

| Range | Use Case | Rationale |
|-------|----------|-----------|
| 0.0 | Data extraction, JSON parsing | Deterministic, no variation |
| 0.1-0.2 | Classification, factual Q&A | Stable with minimal exploration |
| 0.15-0.25 | Medical chat (FALAPED) | Slight variation for natural replies |
| 0.3 | Code generation, structured reports | Balance accuracy and variety |
| 0.7-0.9 | Creative writing, brainstorming | High variation, fresh ideas |

### response_format Options

| Format | When | API Parameter |
|--------|------|---------------|
| JSON object | Programmatic consumption | `{ type: "json_object" }` |
| Plain text | Human-readable output | default (no param) |
| Structured | Typed schema enforcement | Structured Outputs (OpenAI) |

**When using JSON mode:** Always include the JSON schema in the system prompt. The model needs to see the expected keys.

---

## 6. Context Window Management

### Budget Rules (Groq + OpenAI consensus)

1. **Only include what's needed** — longer context = more latency + cost
2. **Summarize old context** instead of including full history
3. **Put static content first** for prompt caching benefits (OpenAI)
4. **Chunk long inputs** with delimiters so the model sees boundaries
5. **Set max_tokens** to 10-20% above expected output length
6. **System prompt:** 300-600 tokens is usually sufficient for role + rules

### Context Priority Order

```
1. Identity + critical rules (always include)
2. Output format specification (always include)
3. Examples (include for few-shot tasks)
4. Current input/data (always include)
5. Recent conversation history (include for multi-turn)
6. Background context (include only what's relevant)
7. Historical/archival data (summarize or omit)
```

---

## 7. Common Mistakes Checklist

Use this to audit prompts:

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Instructions buried mid-text | Model ignores them | Move to numbered top-level list |
| Vague verbs ("analyze", "process") | Inconsistent output | Specific verbs ("extract 3 key dates") |
| No output schema | Format varies per call | Add explicit JSON/markdown template |
| Over-stuffed context | Slow, truncated, expensive | Trim to essentials, summarize old data |
| Partial JSON in example | Model hallucinates extra keys | Show complete schema, even if brief |
| Ambiguous pronouns | Wrong reference resolution | Use explicit nouns |
| Conflicting rules | Model picks one randomly | Deduplicate, resolve contradictions |
| Copy-pasting prompt across tasks | Wrong behavior | Customize per task type |
| No negative constraints | Unwanted behaviors appear | Add "Do NOT" for critical anti-patterns |
| Temperature too high for extraction | Hallucinated values | Use 0.0-0.2 for deterministic tasks |

---

## 8. Prompt Versioning & Testing

### Versioning Strategy

1. Keep prompts as named constants or template functions in dedicated files
2. Name changes descriptively (e.g., `v2-add-bmi-constraint`)
3. Log the prompt version with each API call for debugging
4. A/B test prompt versions using the `seed` parameter for reproducibility

### Testing Prompts

1. **Golden set:** 5-10 representative inputs with expected outputs
2. **Edge cases:** Empty input, very long input, ambiguous input, adversarial input
3. **Regression:** When changing a prompt, verify old golden set still passes
4. **Metrics:** Measure accuracy, format compliance, latency, token usage

---

## 9. FALAPED Prompt File Conventions

### File Structure

```
modules/groq/
├── assistant-case-chat.ts          # Main chat prompt
├── assistant-classify-question.ts  # Classification prompt
├── assistant-clinical-summary.ts   # Summary generation
├── assistant-guardian-questions.ts  # Question suggestions
├── assistant-polish-reply.ts       # Copy-editing prompt
├── generate-report-template-sections.ts  # Report template
├── improve-report-section.ts       # Section improvement
├── transcribe-audio.ts             # Whisper vocabulary hint
└── lib/
    ├── strip-json-fences.ts        # Response cleaning
    ├── groq-response-parsers.ts    # Payload parsing
    └── ...                         # Other utilities
```

### Code Pattern for Prompt Files

```typescript
import { groq } from "@/modules/groq/groq-client"
import { env } from "@/lib/env"
import { stripJsonFences } from "@/modules/groq/lib/strip-json-fences"

const MODEL = env.GROQ_ASSISTANT_MODEL
const MAX_TOKENS = 2048

export type InputType = {
  // typed input shape
}

export async function generateXxx(input: InputType): Promise<string> {
  const systemPrompt = `[system instructions]`

  const userPrompt = JSON.stringify({
    // structured user payload
  })

  const completion = await groq.chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    max_tokens: MAX_TOKENS,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
  })

  const raw = completion.choices[0]?.message?.content?.trim() ?? ""
  const cleaned = stripJsonFences(raw)

  try {
    const parsed = JSON.parse(cleaned || "{}")
    // extract and return the relevant field
    return parsed.reply ?? ""
  } catch (error) {
    console.error("[GROQ] generateXxx JSON parse failed", { error })
    return "Fallback message"
  }
}
```

---

## Sources

- **OpenAI Prompt Engineering:** https://developers.openai.com/api/docs/guides/prompt-engineering
- **Groq Prompt Basics:** https://console.groq.com/docs/prompting
- **Groq Prompt Patterns:** https://console.groq.com/docs/prompting/patterns
- **OpenAI GPT-5 Prompting Guide:** https://cookbook.openai.com/articles/gpt-5-prompting-guide
