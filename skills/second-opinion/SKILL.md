---
name: second-opinion
description: "Get an independent review of a Flutter/Riverpod architecture decision or implementation through Gemini, Codex, or Claude CLI. Use for \"second opinion\", \"review this approach\", \"validate my design\", or \"is this the right pattern\". Requires an installed, authenticated provider CLI."
user-invocable: true
---

# Second Opinion

## Runtime and resources

Resolve `scripts/review.js` from this installed skill directory, not the application's cwd. Requires Node.js and an authenticated provider CLI; no named subagent is required. Use native shell and question tools, or ask in plain text.

## Provider selection

Use the provider requested by the user, otherwise default to Gemini. Check availability without an AI call:

```bash
node "<installed skill directory>/scripts/review.js" --list
```

If Gemini is absent, ask which available provider to use. Do not install, authenticate, change providers, or select a model silently. CLI errors, timeouts, and missing capabilities mean the external opinion is unavailable. When the provider is the same as the host, disclose that this is a separate session of the same provider, not a different model.

## Review

1. Summarize the decision and alternatives in about 100 words. Read pertinent code and include minimum relevant snippets, file paths, and constraints in a temporary UTF-8 prompt file. Exclude credentials and unrelated session content.
2. Invoke the helper with absolute paths:

```bash
node "<installed skill directory>/scripts/review.js" --provider gemini --prompt-file "<absolute prompt file>" --cwd "<target project>" --timeout-seconds 180
```

Replace `gemini` with `codex` or `claude` only after provider selection. The helper passes context through stdin without shell interpolation and runs in a temporary directory. Gemini and Claude tools/hooks are disabled; Codex uses a read-only sandbox without user config. The provider reviews supplied context and does not browse the application. Recent CLI options are required; report unsupported options instead of removing restrictions. Remove the temporary prompt file afterward.

3. Independently check Flutter/Riverpod rules: `ref.watch` in build, `ref.read` in callbacks, provider naming, business logic outside widgets, selective rebuilds, and GoRouter usage.
4. Report the actual provider, its perspective, your findings, agreements/disagreements, and recommendation. Cite missing context. If the external review failed, label it unavailable and distinguish your own checks.
