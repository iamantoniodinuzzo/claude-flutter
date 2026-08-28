<!--
PROTOTYPE — throwaway artifact for wayfinder ticket #65 (map #57).
Not a real skill output; tune-setup doesn't exist yet (that's #66's job).
Hand-drafted against ADR 0008 (audit surface) and ADR 0009 (routing/caps),
run against this session's real transcript and this repo's real config files.
-->

# tune-setup — config & workflow audit

Run on demand, this session, this repo (`iamantoniodinuzzo/claude-flutter`) as its own target
project — an edge case worth naming: this is the one case where "target project" and "toolkit
repo" are the same repo, so the cross-repo destination collapses to a same-repo one below.

## Config audit — `--config-audit` evidence

```
skill invocations: git-workflow x1, grilling x4, mattpocock-skills:prototype x1

hook injections (hookName + content, >2x):
  PreToolUse:Bash "MANDATORY: graphify-out/graph.json exists..." x24
  PreToolUse:Read "MANDATORY: graphify-out/graph.json exists. You MUST run graphify before
    reading source files..." x6

hook_cancelled: none
toolDenialKind: none (0 user-rejected, 0 permission-rule, 0 automode-blocked)
plan_mode_reentry: 0
```

### 1. CLAUDE.md (project root)

No findings. 18 lines, no stale content surfaced by this session's evidence.

### 2. `.claude/settings.json` — the graphify hook

**Finding.** `.claude/settings.json:14-32` fires a `PreToolUse:Bash` hook on any
grep/rg/find-family command, and a `PreToolUse:Read|Glob` hook on any read of a source-like
file, injecting a "MANDATORY: run graphify" instruction. This session alone: **30 firings, 0
compliances** — every grep and Read in issues #58 through #65 went straight to the raw
file/transcript, the hook's instruction was never followed once.

This is exactly the pattern #63's issue text named as the motivating example, and it's real,
not hypothetical: the hook is working (firing correctly, on the right tool calls) but the
instruction it injects has zero observed effect on behavior in this session, at a real
context cost (the injected text runs 200–400 characters per firing, ×30).

**Proposed** (routes to: config of target project, per ADR 0009) — one of:
- Narrow the hook's matcher so it only fires on paths actually indexed by
  `graphify-out/graph.json` (skills/docs, not `.jsonl` transcripts or scratch files) — several
  of this session's 30 firings were on transcript-inspection greps that graphify's code-graph
  has no relevance to.
- Or, if the instruction is genuinely meant to be followed every time: the fact that it wasn't,
  even once, across 30 opportunities, in a session working directly in this repo, suggests the
  instruction competes with something else (task urgency, the model already having oriented
  via other means) and may need to change from a soft reminder to something enforced
  differently.

Not proposing a specific fix beyond these two directions — that's a call for whoever owns
`graphify`'s integration, with the usage data above as the evidence, not a mandate.

### 3. Hooks (defined inline in settings.json — no separate hooks file)

Covered by #2 above; no other hooks configured in this repo.

### 4. `agents/`

`agents/prompt-engineer.md`, `agents/riverpod-reviewer.md` — both referenced by name in map
#57's own Notes ("per i ticket che toccano il testo della skill, anche l'agente
`prompt-engineer`") and by name in `.claude-plugin`'s agent listing. No findings this session:
neither was invoked (this map never touched skill *prose*, only decision records), which is
expected, not a miss — #57's Notes only calls for `prompt-engineer` on tickets that touch
skill wording, and none of #58–#64 did.

### 5. Skill-trigger-miss

Checked `skill_listing` against actually-invoked `Skill` blocks for this session. No miss
found: every skill offered as available and semantically relevant to a turn's content was
either invoked or genuinely not applicable. (Structural anchor + semantic judgment per ADR
0008 decision 6 — stated here explicitly because a clean result still needs to say so, per
`retro`'s own anti-pattern rule against silent "nothing to report.")

## Persistenza

**Proposed — aspetto il tuo ok** *(cap: 5, this run used 1)*

1. [config] Narrow or reconsider the `graphify` `PreToolUse` hook matcher in
   `.claude/settings.json` — see finding #2 above. Destination: config of target project.
   Evidence: 30 firings, 0 compliances, this session.

**No action**

2. CLAUDE.md — no findings.
3. `agents/` — no findings, and the absence is itself expected given this session's scope.
4. Skill-trigger-miss — checked, none found.

---

**Line count: ~60 lines.** Noticeably shorter than the ~4,160-token ceiling ADR 0006 measured
for *reading* the config surfaces — because reading the files costs tokens once, but reporting
on them costs lines only for what's actually wrong. A session with more surfaces flagged would
grow linearly with findings, not with the size of what was read; the 5-proposal cap (ADR 0009)
was never at risk of binding in this run (1 of 5 used). Worth flagging back to #66: if a real
audit run *does* approach 5, that's the actual test of whether the default was sized right —
this prototype run wasn't dense enough to stress it.
