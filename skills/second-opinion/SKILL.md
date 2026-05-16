---
name: second-opinion
description: Use when you want an independent review of an architecture decision, implementation choice, or technical approach before committing. Triggers on: "second opinion", "review this approach", "is this the right pattern", "validate my design", "Flutter/Riverpod architecture review".
user-invocable: true
---

# Second Opinion

When invoked:

1. **Summarize the problem** from conversation context (~100 words)

2. **Spawn subagent** using Task tool:
   - `gemini-consultant` with the problem summary

3. **Apply Flutter/Riverpod-specific checks**:
   - `ref.watch()` only in `build()`, `ref.read()` only in callbacks
   - `FooNotifier` generates `fooProvider` (not `fooNotifierProvider`)
   - No business logic in widgets — use notifiers/providers
   - `.select()` when only one field is consumed
   - GoRouter: no imperative `Navigator.push` inside providers

4. **Present combined results** showing:
   - Gemini's perspective
   - Flutter/Riverpod-specific findings
   - Where they agree/differ
   - Recommended approach with rationale

## CLI Commands Used by Subagents

```bash
gemini -p "I'm working on a coding problem... [problem]"
```
