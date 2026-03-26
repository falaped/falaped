---
name: prompt-engineering
description: Validates, refactors, and creates LLM prompts following OpenAI and Groq best practices. Use when writing system/user prompts, reviewing existing prompts, creating new AI instructions, or when the user mentions prompt engineering, prompt quality, prompt validation, or prompt refactoring.
---

# Prompt Engineering — Validate, Refactor & Create

Skill for validating, refactoring, and creating LLM prompts based on OpenAI and Groq prompt engineering best practices. Applies to system prompts, assistant instructions, user payloads, and any `messages` array sent to chat completion APIs.

For detailed patterns and checklist reference, see [reference.md](reference.md).

---

## 1. Prompt Anatomy (Required Building Blocks)

Every well-structured prompt must contain these elements (OpenAI + Groq consensus):

| Block | Purpose | Placement |
|-------|---------|-----------|
| **Identity / Role** | Sets persona, expertise, constraints | First in system message |
| **Instructions** | Numbered/bulleted rules the model MUST follow | After identity |
| **Context** | Domain knowledge, schemas, reference data | After instructions |
| **Input** | The data or question to transform | User message |
| **Expected Output** | Format spec, schema, or example | End of system or start of user |

**Critical rule:** Put high-priority instructions first — models weight early tokens more heavily.

---

## 2. Validation Workflow

When validating an existing prompt, run this checklist:

```
Prompt Validation Checklist:
- [ ] 1. STRUCTURE: Has clear Identity → Instructions → Context → Output format
- [ ] 2. ROLE: Starts with persona/expertise ("You are...")
- [ ] 3. INSTRUCTIONS FIRST: Critical rules are at the top, not buried mid-paragraph
- [ ] 4. SPECIFICITY: Uses explicit verbs ("Summarize in 3 bullets") not vague ("analyze")
- [ ] 5. OUTPUT FORMAT: Specifies exact format (JSON schema, markdown template, plain text)
- [ ] 6. CONSTRAINTS: States limits explicitly ("Return only JSON", "max 100 words")
- [ ] 7. NO AMBIGUITY: Each instruction has one interpretation
- [ ] 8. EXAMPLES: Includes at least one input/output example for complex tasks
- [ ] 9. CONTEXT BUDGET: Only includes necessary context (no redundant/stale data)
- [ ] 10. DELIMITERS: Uses ``` or XML tags to separate data from instructions
- [ ] 11. NEGATIVE RULES: States what NOT to do for critical constraints
- [ ] 12. TEMPERATURE MATCH: Temperature aligns with task (0-0.3 facts, 0.7+ creative)
- [ ] 13. LANGUAGE: Code identifiers in English, user-facing copy in PT-BR (FALAPED convention)
- [ ] 14. NO SENSITIVE DATA: No hardcoded UUIDs, API keys, or PII in prompt text
```

### Validation Output Format

Report findings as:

```markdown
## Prompt Validation Report

**File:** `modules/groq/assistant-xxx.ts`
**Score:** X/14

### Passed
- [list items that pass]

### Issues Found
| # | Issue | Severity | Current | Suggested Fix |
|---|-------|----------|---------|---------------|
| 1 | ... | HIGH/MEDIUM/LOW | "current text" | "improved text" |

### Recommendations
- [actionable improvements]
```

---

## 3. Refactoring Workflow

When refactoring an existing prompt:

### Step 1: Read and Understand
1. Read the full prompt file and its caller (how user message is built)
2. Identify the task type (classification, extraction, generation, chat, summarization)
3. Note the current pattern (zero-shot, few-shot, CoT, etc.)

### Step 2: Validate
Run the validation checklist (Section 2). Document all issues.

### Step 3: Select Pattern
Match the task to the optimal pattern:

| Task Type | Pattern | When |
|-----------|---------|------|
| Simple Q&A, definitions | Zero-shot | Model already knows |
| Extraction / classification | Few-shot (1-3 examples) | Teaches exact labels & keys |
| Multi-step reasoning | Chain of Thought | Forces stepwise logic |
| Accuracy-critical facts | Chain of Verification | Self-checks reduce errors |
| Summarization | Chain of Density | Stepwise compression |
| Tool-use / knowledge tasks | ReAct | Thinks → acts → observes loop |

### Step 4: Restructure

Apply the **Identity → Instructions → Examples → Context** order:

```
# Identity
[Role + expertise + constraints in 1-3 sentences]

# Instructions
[Numbered list of MUST-DO rules, critical first]

# Negative constraints
[What the model must NOT do]

# Output format
[Exact schema or template]

# Examples (if few-shot)
<example_input id="1">
[input]
</example_input>
<example_output id="1">
[output]
</example_output>
```

### Step 5: Apply Best Practices
- Replace vague verbs with specific ones ("analyze" → "summarize in 3 bullets")
- Move buried instructions to the top
- Add delimiters (XML tags / ```) around data blocks
- Remove redundant context that wastes tokens
- Add explicit output format if missing
- Ensure temperature matches the task

### Step 6: Preserve Behavior
- The refactored prompt must produce equivalent output for the same input
- Keep domain-specific constraints (medical, pediatric context in FALAPED)
- Maintain the same API parameters (response_format, max_tokens) unless improving them

---

## 4. Creation Workflow

When creating a new prompt from scratch:

### Step 1: Define the Task
Answer before writing any prompt text:
1. **What** does the model need to do? (classify, extract, generate, summarize, chat)
2. **What input** will it receive? (raw text, JSON, structured data)
3. **What output** format is needed? (JSON, plain text, markdown)
4. **What constraints** apply? (language, length, forbidden content)
5. **What temperature** fits? (0-0.3 deterministic, 0.7+ creative)

### Step 2: Choose Pattern
Use the pattern table from Section 3, Step 3.

### Step 3: Build System Message

Follow this template:

```typescript
const systemPrompt = `You are [ROLE], [EXPERTISE].

# Instructions
1. [Most critical rule first]
2. [Second priority rule]
3. [...]

# Constraints
- [What NOT to do]
- [Length/format limits]

# Output format
[Exact schema or template with example]

Return ONLY [format] in the format: [schema]`
```

### Step 4: Build User Message

For structured input (recommended for programmatic use):

```typescript
const userPrompt = JSON.stringify({
  field1: value1,
  field2: value2,
  instruction: "Brief instruction for this specific request",
})
```

For text input, use delimiters:

```typescript
const userPrompt = `### Input
\`\`\`
${rawText}
\`\`\`

### Task
[What to do with this input]`
```

### Step 5: Configure API Call

```typescript
const completion = await client.chat.completions.create({
  model: MODEL,
  temperature: 0.2, // match to task
  max_tokens: MAX_TOKENS,
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ],
  response_format: { type: "json_object" }, // when JSON output needed
})
```

### Step 6: Validate Output
- Parse and validate the response (Zod, JSON.parse, regex)
- Implement fallback for malformed responses
- Log failures for debugging: `console.error("[MODULE] ...", { error })`

---

## 5. FALAPED Project Conventions

When working on prompts in this codebase:

- **API:** Groq chat completions (`groq.chat.completions.create`)
- **Roles used:** `system` + `user` only (no `developer` or `assistant` in API messages)
- **User payload:** `JSON.stringify({...})` with structured context
- **Response format:** `{ type: "json_object" }` with `{"reply":"..."}` pattern
- **System prompt style:** Template literals with conditional blocks injected
- **File pattern:** One prompt function per file in `modules/groq/`
- **Naming:** `assistant-{task}.ts` or `generate-{task}.ts`
- **Language:** System instructions in PT-BR for Portuguese output, English for technical/code tasks
- **Temperature:** 0.0-0.3 for extraction/classification, 0.15-0.25 for medical chat
- **Fallback:** Always handle JSON parse failures with fallback extraction

---

## 6. Anti-Patterns

Avoid these when writing prompts:

| Anti-Pattern | Problem | Fix |
|---|---|---|
| Hidden ask buried mid-paragraph | Model ignores it | Move to numbered top-level rule |
| Vague verbs ("analyze", "process") | Unpredictable output | Use specific verbs ("extract", "classify", "list 3 bullets") |
| No output format | Inconsistent responses | Always specify exact schema |
| Over-stuffed context | Truncation, slow, expensive | Only include necessary context |
| Duplicate instructions | Wastes tokens, can conflict | Deduplicate, single source of truth |
| Hardcoded data in prompt | Brittle, outdated | Pass dynamic data via user message |
| No negative constraints | Model does unwanted things | Add "Do NOT" rules for critical behaviors |
| Temperature mismatch | Wrong randomness level | 0-0.3 for facts, 0.7+ for creative |
| No fallback for bad output | Crashes on malformed response | Parse + validate + fallback |

---

## 7. Quick Reference: Parameter Presets

| Scenario | Temp | Top-p | max_tokens hint |
|----------|------|-------|-----------------|
| Data extraction (JSON) | 0.0 | 0.9 | 1.5x expected output |
| Classification | 0.0-0.2 | 0.9 | 50-200 |
| Medical chat (FALAPED) | 0.15-0.25 | — | 2048 |
| Clinical summary | 0.2 | — | 1024-2048 |
| Creative/copy writing | 0.7-0.9 | 1.0 | varies |
| Report generation | 0.3 | 0.85 | 4096+ |

---

## Additional Resources

- Detailed patterns, examples, and checklists: [reference.md](reference.md)
- OpenAI guide: https://developers.openai.com/api/docs/guides/prompt-engineering
- Groq basics: https://console.groq.com/docs/prompting
- Groq patterns: https://console.groq.com/docs/prompting/patterns
