---
name: retro
description: End-of-task retrospective. Answer five hard self-audit questions (least confident, what user is missing, most likely 3-month failure, unstated assumptions, smoother session), then persist learnings to memory and propose concrete fixes. Use when the user says "/retro", "retrospettiva", "cosa mi sfugge", "self-audit", or after completing a significant deliverable (plan, milestone, feature, migration) when the user asks for a critical review of the work just done.
---

# Retro — self-audit di fine task

Answer in the conversation language. Be honest, specific, non-defensive. No praise, no filler. Every point must name a concrete artifact (file, issue, decision) from THIS session — no generic advice.

## The five questions

Answer all five, in this order, as separate sections:

1. **Least confident** — Which parts of what I just produced am I least sure about? Rank top 2-3. For each: what exactly is uncertain, what would verify it (a grep, a doc, a test), and verify it NOW if it costs < 2 minutes.
2. **What the user is missing** — The biggest thing they don't realize about the current situation. Structural gaps, not details: missing artifacts, implicit contracts, things that live only in this conversation and will be lost.
3. **Most likely 3-month failure** — If this work breaks in 3 months, the single most probable cause. Pick ONE primary candidate with the failure mechanism spelled out, plus a runner-up. Name the cheapest mitigation.
4. **Unstated assumptions** — Decisions I made silently: scale, locale, edge-case behavior, ordering, naming. List each as "assumed X, never asked".
5. **Smoother session** — What the user could have provided up front to cut rounds, AND what I did suboptimally (own errors first).

## After answering

1. **Verify cheap uncertainties** from Q1 immediately (read the code, don't speculate).
2. **Persist**: save genuinely reusable learnings to auto-memory (feedback/project type, with Why + How to apply). Skip session-only details.
3. **Propose fixes**: end with at most 3 concrete offers (e.g. "commit a design doc", "add reconciliation job issue", "update CLAUDE.md rule"). Wait for the user to pick — do not apply unasked.

## Anti-patterns

- Hedged non-answers ("everything seems fine") — there is ALWAYS a weakest point.
- Listing 10 shallow risks instead of 2 deep ones.
- Generic advice detached from session artifacts.
- Fixing things during the retro that the user hasn't approved.
