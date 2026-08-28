---
name: tune-setup
description: On-demand config & workflow audit. Reads the target project's CLAUDE.md, .claude/settings.json (+.local.json), hooks, and agents/, cross-referenced against transcript evidence (repeated hook injections, hook_cancelled, toolDenialKind breakdown, skill-trigger-miss), and proposes concrete config fixes. Never runs automatically — invoke explicitly with "/tune-setup", "ottimizza il setup", "audit config", or similar. Sibling to `retro` (which audits the session, not the config) — see that skill for end-of-task self-audit instead.
user-invocable: true
---

# tune-setup — audit di configurazione e workflow

Answer in the conversation language. Be honest, specific, non-defensive. No praise, no filler. Every finding must cite a concrete artifact (file, line, hookName, turn number) from THIS session or THIS project's config — no generic advice.

## Quando lanciarla

**Solo su richiesta esplicita** — mai automaticamente, non a fine task, non a milestone, non a release. Trigger: `/tune-setup`, "ottimizza il setup", "audit config", o richiesta equivalente. Cadenza e costo (~4.160 token solo per leggere le superfici di configurazione, misurato in ADR 0006) sono incompatibili con un trigger automatico — per questo `tune-setup` esiste come skill separata da [[retro]] invece di crescere al suo interno.

## Passo 0 — Evidenze dal transcript

```bash
node skills/retro/scripts/session-evidence.js --config-audit
```

Sì, il path punta dentro `skills/retro/` — è deliberato (ADR 0008): un solo parser `.jsonl`, non duplicato. `retro` non passa mai `--config-audit` (il suo Passo 0 resta byte-per-byte invariato); `tune-setup` lo passa sempre. Il flag aggiunge un blocco separato, sotto un cap proprio (`CONFIG_AUDIT_LINE_CAP`, indipendente da quello di `retro`), con: conteggio invocazioni `Skill`, ripetizioni di hook injection (stesso `hookName` + contenuto, >2 occorrenze), `hook_cancelled` (qualsiasi occorrenza), split a tre vie di `toolDenialKind`, e l'ancora strutturale per skill-trigger-miss (skill offerte in `skill_listing` mai invocate).

Se non trova un transcript, stampa una riga sola e esce con successo — **non è prova di una sessione pulita**: dichiaralo, non presentare il silenzio come "nessun problema" (stessa regola di `retro`).

## Passo 1 — Leggi i file di configurazione

Il Passo 0 copre solo il derivato dal transcript. I file stessi vanno letti direttamente (`Read`), non passano dallo script (ADR 0008):

- `CLAUDE.md` (root del progetto target)
- `.claude/settings.json` + `.claude/settings.local.json`
- Definizioni hook (inline in `settings.json`, o file hook dedicato se presente)
- `agents/*`

## Le cinque superfici

Un finding per superficie che mostra un problema; dichiara esplicitamente "nessun finding" per una superficie pulita — un audit silenzioso su un risultato pulito è un anti-pattern (stessa regola dell'anti-pattern di `retro` contro il "nulla da migliorare" non dichiarato).

1. **`CLAUDE.md`** — contenuto stale, istruzioni che contraddicono il comportamento osservato in Passo 0, convenzioni mai più valide.
2. **`.claude/settings.json` / `.local.json`** — permessi troppo larghi o troppo stretti rispetto a `toolDenialKind`, config disallineata da come il progetto viene realmente usato.
3. **Hook** — usa la regola di ripetizione del Passo 0: stesso `hookName` + contenuto **>2 volte** nella sessione è il segnale (non `>1` — un hook che spara ad ogni tool call è normale by design; serve una ripetizione vera per essere segnale). `hook_cancelled` è un finding a qualsiasi occorrenza (timeout/kill, non un pattern di ripetizione).
4. **`agents/`** — agenti mai invocati quando il loro scope avrebbe dovuto applicarsi, o agenti la cui descrizione non corrisponde più a cosa fanno.
5. **Skill-trigger-miss** — vedi sotto, disciplina separata.

### Disciplina skill-trigger-miss

Il Passo 0 fornisce **solo l'ancora strutturale**: skill X offerta in `skill_listing` al turno N, mai invocata come blocco `Skill` in tutta la sessione. Il giudizio se X *avrebbe dovuto* scattare è tuo, non dello script — a differenza di Q5 di `retro` (pura aggregazione strutturale, perché gira nel punto più esposto a compattazione di una sessione), `tune-setup` gira on-demand con più margine ed esiste apposta per fare giudizi, non solo contare eventi. La regola "nessuna proposta senza evento verificabile" resta soddisfatta dall'ancora strutturale; il giudizio sopra è il lavoro vero di questa skill, non una violazione della regola.

**Esempio corretto** (citazione completa, non solo la regola astratta):

> Skill `flutter-flavors` offerta al turno #142 (`skill_listing`), mai invocata. La sua description recita "Init dev/stg/prod flavors... or audit and fix an existing broken/partial setup" — il turno #142 chiedeva esplicitamente "l'app ha già i flavor ma iOS è rotto", un match diretto con la clausola "audit and fix". Trigger-miss plausibile: la description potrebbe aver bisogno di una frase più esplicita su "iOS xcconfig/xcscheme rotto" per scattare in casi simili.

Una citazione senza turno + testo esatto della description non è una citazione valida — non proporla.

## Persistenza

| Destinazione | Quando | Chi approva |
|---|---|---|
| Auto-memory topic file + riga in `MEMORY.md` | Fatto degno di nota ma non abbastanza strutturale da meritare una proposta di config | Auto-applicato |
| Config del progetto target (`CLAUDE.md` / `.claude/settings.json` / hooks / `agents/`) | Convenzione permanente da correggere, o superficie che questo audit ha segnalato come rotta/stale | Proposta — aspetta l'ok |
| Automation spec (skill / hook / slash command / subagent) | Pattern ripetuto che dovrebbe diventare automazione riutilizzabile | Proposta — aspetta l'ok |
| Issue cross-repo su `iamantoniodinuzzo/claude-flutter` | L'attrito risale a una skill del toolkit stesso, non al progetto target | Proposta — aspetta l'ok |

**Issue cross-repo**: `gh issue create --repo iamantoniodinuzzo/claude-flutter`, con `--repo` **sempre esplicito** — mai dedotto dal `git remote` locale (che punta al progetto target). `retro` di solito intercetta prima l'attrito legato al toolkit (gira ad ogni fine task), ma questo non è esclusivo: `tune-setup` può produrre la stessa destinazione in autonomia, sulla propria evidenza — in particolare dal trigger-miss — perché non esiste canale di handoff tra le due skill.

Cap: **max 5 proposte** in "Proposed" — indipendente dal cap di 3 di `retro` (pool separati, per skill produttrice, non per tipo di destinazione: una issue cross-repo trovata da `retro` conta nel cap di `retro`, la stessa trovata da `tune-setup` conta nel suo). Default pensato come "una per superficie auditata", regolabile se un audit reale lo smentisce.

## Report finale

```
Applied
1. [knowledge] <fatto> → auto-memory: <file>

Proposed — aspetto il tuo ok
2. [config] <superficie, con evidenza da Passo 0/1> → config progetto: <cosa>

No action
3. <superficie> — nessun finding, verificato
```

Categorie: `config` (CLAUDE.md/settings/hooks/agents da correggere) · `automation` (pattern ripetuto che potrebbe diventare skill/hook/slash command/subagent) · `friction` (segnale da `toolDenialKind`/`hook_cancelled`) · `knowledge` (fatto utile ma non abbastanza strutturale per una proposta di config).

`toolDenialKind`: solo `user-rejected` conta come attrito reale, quotato con `userFeedback` quando presente. `permission-rule` e `automode-blocked` vanno riportati separatamente, come conferma che i guardrail configurati funzionano — non come attrito, non vanno mescolati con `user-rejected`.

## Anti-patterns

- Proposta di config senza evento verificabile citato (Passo 0 o Passo 1).
- Trigger-miss senza citazione del turno esatto + testo della description.
- Confondere `permission-rule`/`automode-blocked` (guardrail che funziona) con `user-rejected` (attrito reale).
- Scrivere in `CLAUDE.md`, `.claude/settings.json`, un hook, `agents/`, o aprire una issue cross-repo senza ok esplicito.
- Dichiarare una superficie "pulita" senza averla effettivamente controllata in Passo 0/1.
- Superare il cap di 5 proposte "Proposed" in un singolo report.
