---
name: retro
description: End-of-task retrospective. Gathers verifiable evidence from the session transcript, answers six hard self-audit questions (least confident, what user is missing, most likely 3-month failure, unstated assumptions, smoother session, what worked well — backed by that evidence), auto-persists reusable learnings to memory, flags unintegrated work, and proposes concrete fixes. Use when the user says "/retro", "retrospettiva", "cosa mi sfugge", "self-audit", after completing a significant deliverable (plan, milestone, feature, migration), at the end of `issue-dev` after merge, or before the session's context is about to be compacted.
user-invocable: true
---

# Retro — self-audit di fine task

Answer in the conversation language. Be honest, specific, non-defensive. No praise, no filler. Every point must name a concrete artifact (file, issue, decision) from THIS session — no generic advice.

## Quando lanciarla

- A fine sessione, **prima** che il contesto venga compattato — dopo la compattazione Q5 lavora su un riassunto lossy invece che sui fatti.
- A fine `issue-dev`, dopo il merge in `develop`.
- Su richiesta esplicita ("/retro", "retrospettiva", "cosa mi sfugge", "self-audit").

Se la sessione è **già stata compattata** quando parte la retro: dichiaralo apertamente nella risposta e limita Q5 a ciò che il Passo 0 conferma dal transcript — non riempire con ricordi plausibili del riassunto.

## Passo 0 — Raccogli evidenze

Prima delle cinque domande, esegui:

```bash
skills/retro/scripts/session-evidence.sh              # bash
# oppure
skills/retro/scripts/session-evidence.ps1              # PowerShell
```

Legge il transcript `.jsonl` della sessione corrente ed estrae, in forma aggregata: tool call falliti (per tool, con conteggio ed esempio), comandi Bash identici eseguiti più di una volta, file rieditati più di due volte. Se non trova un transcript (dir assente, sessione non tracciata) stampa una riga sola e esce con successo — **questo non è prova di una sessione pulita**: dichiara nel report che non hai potuto verificare, non presentare il silenzio come "nessun problema".

Esegui poi:

```bash
git status --porcelain && git branch --show-current
```

Questo alimenta l'handoff finale (sotto), non le domande.

## Le sei domande

Answer all six, in this order, as separate sections:

1. **Least confident** — Which parts of what I just produced am I least sure about? Rank top 2-3. For each: what exactly is uncertain, what would verify it (a grep, a doc, a test), and verify it NOW if it costs < 2 minutes.
2. **What the user is missing** — The biggest thing they don't realize about the current situation. Structural gaps, not details: missing artifacts, implicit contracts, things that live only in this conversation and will be lost.
3. **Most likely 3-month failure** — If this work breaks in 3 months, the single most probable cause. Pick ONE primary candidate with the failure mechanism spelled out, plus a runner-up. Name the cheapest mitigation.
4. **Unstated assumptions** — Decisions I made silently: scale, locale, edge-case behavior, ordering, naming. List each as "assumed X, never asked".
5. **Smoother session** — Cite concrete events from the Passo 0 output: a specific failed tool call, a command run twice, a file rewritten repeatedly, something the user had to ask for a second time. No entry without a matching event. If Passo 0 found genuinely nothing (0 errors, 0 repeats) and you have no other verifiable friction, say so plainly instead of inventing a "could have been smoother" — that is itself a valid answer, not a hedge.
6. **What worked well** — Name one concrete pattern from this session worth repeating: a skill invocation that paid off, a sequence that avoided rework, a decision that held up under later pressure. Must name a specific artifact (skill name, tool sequence, file, commit) — no generic praise ("things went smoothly"). If nothing genuinely stands out, say so plainly instead of manufacturing a compliment — same standard Q5 already applies to its negative case.

## Ship handoff

Read the `git status --porcelain` / branch output from Passo 0:

- Working tree dirty, or current branch is an unmerged feature branch → **finding**, not action: "lavoro non integrato — usa `git-workflow` / `issue-dev` per commit, merge, chiusura issue." Retro never commits, pushes, or merges.
- Clean tree on `develop`/`main` → nothing to report here.

## Persistenza

Route each learning to exactly one destination:

| Destinazione | Quando | Chi approva |
|---|---|---|
| Auto-memory topic file + riga in `MEMORY.md` | Default. Serve *a volte*, dipende dal contesto della sessione (pattern scoperto, gotcha, preferenza) | Auto-applicato |
| Config del progetto target (`CLAUDE.md` / `.claude/settings.json` / hooks / `agents/`) | Convenzione permanente che deve guidare *ogni* sessione futura su questo repo | Proposta — aspetta l'ok |
| Automation spec (skill / hook / slash command / subagent) | Pattern ripetuto che dovrebbe diventare automazione riutilizzabile | Proposta — aspetta l'ok |
| Issue cross-repo su `iamantoniodinuzzo/claude-flutter` | L'attrito risale a una skill del toolkit stesso, non al progetto target | Proposta — aspetta l'ok |

`.claude/rules/` con frontmatter `paths:` **non** è una destinazione a basso costo: viene caricato all'avvio indipendentemente dallo scoping ([claude-code#16299](https://github.com/anthropics/claude-code/issues/16299)), quindi non risparmia contesto rispetto a `CLAUDE.md`. Non instradarci nulla per motivi di token.

**Issue cross-repo**: `gh issue create --repo iamantoniodinuzzo/claude-flutter`, con `--repo` **sempre esplicito** — non va mai dedotto dal `git remote` locale, che punta al progetto target, non al toolkit. Sempre "Proposta — aspetta l'ok": aprire una issue pubblica su un altro repo non è mai un default silenzioso. `tune-setup` può produrre la stessa destinazione in modo indipendente, sulla propria evidenza — non c'è canale di handoff tra le due skill.

**Prima di scrivere in auto-memory:**
1. Leggi `MEMORY.md`. Se una voce esistente copre già il fatto, **aggiorna quel file** (segui il formato già in uso lì — spesso più fatti correlati nello stesso file, separati da `---`) invece di crearne uno nuovo.
2. Se l'indice è cresciuto e più voci coprono lo stesso tema, consolidale in una.
3. Nessun cap numerico rigido — la cifra "solo le prime 200 righe si caricano" circola su Reddit ma non è verificata in questo ambiente; non progettare intorno a un numero che non hai controllato.

Le proposte per config del progetto, automation spec, o issue cross-repo restano **proposte**: presentale, non applicarle senza ok esplicito.

Per un audit più ampio della configurazione (CLAUDE.md, settings, hooks, agents/, skill-trigger-miss), fuori dal perimetro di questa skill: esegui `tune-setup` — su richiesta esplicita, non da qui.

## Report finale

```
Applied
1. [knowledge] <fatto> → auto-memory: <file>

Proposed — aspetto il tuo ok
2. [automation] <pattern ripetuto, con conteggio da Passo 0> → skill spec: <nome>

No action
3. [friction] <cosa> — già coperto da <dove>
```

Categorie: `skill gap` (Claude ha sbagliato o ha impiegato più tentativi) · `friction` (passo manuale ripetuto, cosa chiesta esplicitamente che doveva essere automatica) · `knowledge` (fatto su progetto/preferenze che Claude non sapeva) · `automation` (pattern ripetuto che potrebbe diventare skill/hook/slash command/subagent — include esplicitamente: istruzioni ripetute che potrebbero diventare uno slash command, un workflow che dovrebbe diventare una skill o un subagent dedicato).

Cap invariato: **max 3 proposte** in "Proposed". Le scritture "Applied" in auto-memory non contano nel cap — sono già fatte, non richiedono slot di attenzione dell'utente.

## Anti-patterns

- Hedged non-answers ("everything seems fine") — there is ALWAYS a weakest point.
- Listing 10 shallow risks instead of 2 deep ones.
- Generic advice detached from session artifacts.
- **Inventare un fallimento per Q5 che non compare nell'output di Passo 0.**
- **Scrivere in `CLAUDE.md`, `.claude/rules/`, creare una skill, o aprire una issue cross-repo senza ok esplicito.**
- **Duplicare una voce di memoria che esiste già invece di aggiornarla.**
- **Dichiarare "nulla da migliorare" quando Passo 0 ha trovato errori o ripetizioni non ancora spiegati.**
- Fixing things during the retro that the user hasn't approved (oltre alla scrittura in auto-memory, che è l'unica azione pre-approvata da questa skill).
