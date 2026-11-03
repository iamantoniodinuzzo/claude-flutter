<!--
PROTOTYPE — throwaway artifact for wayfinder ticket #84 (map #78).
Not a real skill output. Hand-drafted to react to the report's shape, length and
context cost, applying ADR 0011 (environment lens), the resolutions of #79 (signals),
#80 (diff), #82 (taxonomy, caps, severity) and #83 (structure).

Source data, all real:
  - The report: session 9ba8213a-0aed-412b-8878-362c24a3ad78 of this repo (2026-11-03,
    16:40Z..17:41Z): the session that charted map #78. Numbers come from the real
    session-evidence.js plus a scratch script computing the v3 signals (not committed).
  - A second sample (Ambiente block with signals firing, from a Flutter client-project
    session) was shown in chat only, not committed: the repo is public.
The judgements (Q1-Q6, proposals) are hand-written by an agent that READ the transcript
afterwards, not one that lived the session: judge shape, length and cost, not insight.
-->

# Retro v3 su una sessione reale (la mappa #78, sessione di charting)

> Passo 0 → `diff:` → sei domande → blocco `Ambiente` → handoff → report finale.
> Il Passo 0 sotto è l'output **reale e non corretto** dello script di oggi, più le due
> sezioni nuove (`diff:`, `ambiente:`) come le emetterebbe lo script v3.

## Passo 0 — evidenze raccolte

```
transcript: ~/.claude/projects/C--Users-iaman-Desktop-Progetti-Personali-claude-flutter/9ba8213a-….jsonl
  selected by: --session 9ba8213a-0aed-412b-8878-362c24a3ad78
session: 9ba8213a-0aed-412b-8878-362c24a3ad78  events: 719  window: 2026-11-03T16:40:59Z .. 17:41:16Z  last event: 13m ago

tool errors: 1
  Bash x1 `gh issue view 57 --json title,body --jq '.title+"\n"+.body'; echo ---; ls docs docs/adr 2>/dev/null; ls GLOSSARY*.md …` → Exit code 2

repeated shell commands: 6
  x2 cd …/claude-flutter && ls -la .serena; git check-i…
  x2 cd …/claude-flutter && cat .serena/.gitignore; ech…
  x2 cd …/claude-flutter && graphify query "retro skill…
  x2 cd …/claude-flutter && gh issue view 57 --json tit…
  x2 which serena 2>&1; uv tool list 2>/dev/null | grep -i -A2 serena; ls ~/.serena 2>&1 | head…
  x2 cd …/claude-flutter && cat ai_docs/GIT_WORKFLOW.md…

files edited >2x: 2
  x3 plans/in-questa-sessione-abbiamo-adaptive-ember.md
  x3 Temp/issue78_map_update3.js

diff: ancora a86f85c (HEAD alle 16:40Z) → HEAD docs/81_retro-tune-setup-boundary (2c7de0e)
  git:   2 file, +79 -1   (docs/adr/0011-retro-v3-environment-lens.md +77; docs/adr/0006-retro-v2-skill-shape.md +2 -1)
  non tracciati: 0
  transcript (main): 1 Edit/Write nel repo (.gitignore); 5 fuori repo (1 plan, 4 script in %TEMP%)
  subagent non letti: 2 (agent-a909…, agent-acfd…) → 2 file docs/research/*.md scritti in worktree
  branch visti dal transcript (gitBranch): develop, chore/86_remove-serena, research/79-…, research/80-…
  ⚠ git ∩ transcript = ∅: il diff di HEAD NON è lavoro di questa sessione. Il commit 2c7de0e è delle 17:44Z, dopo l'ultimo evento (17:41Z).
  → NON ATTRIBUIBILE (HEAD è su un branch di un'altra sessione)

ambiente: nessun segnale
```

**Verifica del Passo 0 prima di usarlo** (Q5 lo richiede). I 719 record contengono 122 blocchi
`tool_use` ma solo 61 `id` distinti: 49 id compaiono 2-3 volte perché i record
`api-request-blob` riportano di nuovo i messaggi già inviati. Conteggio per id: **0** comandi
shell ripetuti (non 6) e `issue78_map_update3.js` scritto **2** volte (non 3), il plan **1**
(non 3). Tutto "repeated" e ">2x" qui sopra è un artefatto dello script, non attrito.

## 1. Least confident

1. **Le cifre di #79 le ho accettate dal hand-back di un subagent senza rieseguirle**: il tetto
   «~39/40 al p95» nella mappa viene da 236 transcript che non ho riletto. Verificato ora a
   costo zero un solo punto: il Read di `skills/retro/SKILL.md` pesa 12.621 caratteri nel
   transcript, come dice la research. Il resto resta non verificato; rieseguirlo costa >2 minuti.
2. **«La mappa basta come epica»** poggia su un precedente (#57: 9 ticket su 9 chiusi senza
   livello superiore) e su una query a 17:07 che non trova label né template `epic`. Non
   verificato: se con 8+ ticket e più sessioni parallele l'ordine delle sub-issue regge.
   Verifica: aspettare la prossima mappa grande, non <2 minuti.

## 2. What the user is missing

Due worktree di subagent sono ancora nel repo: `.claude/worktrees/agent-a909ec47b092d8b82` e
`…/agent-acfdea7b06727619f`, con i branch `worktree-agent-*` a `a86f85c`. Ognuno è una copia
completa del repo, `graphify-out/` incluso: la ricerca per testo ("wayfinding") del Passo di
oggi aveva i primi 10 risultati tutti lì dentro. Le due research sono già su `research/79-…` e
`research/80-…`: le copie non servono più e inquinano ogni grep.

## 3. Most likely 3-month failure

**Primario**: il test di comportamento che la mappa dichiara assente («Not yet specified», voce 1)
resta assente, e la prima rottura di `session-evidence.js` è silenziosa come quella trovata
in questa retro: lo script stampa numeri plausibili e sbagliati (6 ripetizioni, 0 vere), e
nessun test del repo lo vede perché testa fixture sintetiche. Mitigazione economica: un test
che confronta i conteggi con un transcript reale ripulito, per `tool_use id`.
**Secondo**: le soglie dei segnali ambiente (#79) sono tarate su due monorepo di un utente.
Qui scattano 0 categorie su 5: o la sessione è davvero pulita o la taratura non regge fuori
dai progetti Flutter. Da rimisurare dopo il rilascio.

## 4. Unstated assumptions

- Ho assunto che tutti i testi (issue, ADR, mappa) vadano in italiano, perché lo era il prompt:
  mai chiesto per i titoli dei branch e dei file.
- Ho assunto che la mappa #78 faccia da epica (nessuna issue sopra): l'hai messo in dubbio
  due volte, a 17:07 e 17:10; la risposta sta nella mappa solo come ordine delle sub-issue.
- Ho assunto che pubblicare i branch `research/*` su un repo pubblico fosse accettabile per i
  subagent: l'auto mode ha negato il push a un subagent ([Data Exfiltration]) e te l'ho chiesto
  solo dopo.

## 5. Smoother session

Passo 0 riporta 1 errore, 6 comandi ripetuti, 2 file rieditati. Controllati per id:

- **I 6 comandi ripetuti e i 2 file `>2x`: non esistono** (vedi verifica sopra). Non entrano
  in nessuna proposta di attrito.
- **`ls GLOSSARY*.md` → exit 2**: non è attrito. Sonda di un file opzionale in coda a una
  catena che aveva già stampato il corpo della mappa #57.
- **L'epica chiesta due volte (17:07, 17:10)**: attrito reale, non nel Passo 0. La prima
  risposta ha spiegato perché non serviva un'epica; la seconda ha scoperto che il problema
  era l'ordine consigliato dei ticket, che viveva solo in chat. Bastava chiedere a 17:07
  cosa dovesse risolvere l'epica.

## 6. What worked well

**Le due research (#79, #80) delegate a due subagent in worktree separati mentre il thread
principale proseguiva con l'obiettivo 2 (#86) e con la domanda sull'epica.** Le research hanno
chiuso a 17:05Z e 17:07Z (commit `396aa95`, `45a30b4`); nel frattempo il main ha
chiuso l'obiettivo 2 fino al punto di decisione (16:57) e risposto sull'epica (17:09). La research #80 ha trovato che il parser
Codex non estrae nessun path dai rollout reali (0/201): ha trasformato una decisione che
sarebbe stata «Codex sì/no» in #87 + il bug #88, fuori mappa.

## Ambiente

`ambiente: nessun segnale` (Navigation: 0 ricerche a vuoto, 0 Read miss; Checks: 0 sorgenti
nel repo; Tool economy: 6 risultati >8.000 car., nessuno >20.000, 0 riletture, 0 troncature;
Information access: 0 nel thread principale; AGENTS.md: 3 file, 4.327 car.).
Fuori dal tetto, perché non letto dallo script: **2 `automode-blocked` nel transcript del
subagent a909…** (`git add` e `git push` del branch research/80, motivo `[Data Exfiltration]`).

## Ship handoff

`git status --porcelain` pulito, branch `docs/81_retro-tune-setup-boundary`. Il v2 direbbe
«branch non integrato: usa git-workflow». **Qui sarebbe falso per questa sessione**: quel
branch è di un'altra sessione. I branch di questa sessione sono `chore/86_remove-serena`
(`d2a5c7d`, +3 righe a `.gitignore`, non mergiato), `research/79-…` e `research/80-…`
(throwaway per costruzione, mai da mergiare).

## Report finale

```
Applied — solo con memoria nativa autorizzata
1. [knowledge] I subagent non possono pubblicare i branch research/* (auto mode: Data Exfiltration);
   li pubblica il thread principale → memoria nativa: feedback, progetto claude-flutter

Proposed — aspetto il tuo ok
2. [skill gap][costoso] session-evidence.js conta ×2/×3 i tool_use duplicati da `api-request-blob`
   (122 blocchi, 61 id; 6 "ripetuti" e 2 ">2x" tutti falsi) → fix per id, prima che `diff:` lo usi
   come controllo incrociato. repo: iamantoniodinuzzo/claude-flutter (questo), ticket #85 / nebbia
3. [skill gap][attrito] `diff:` ancorato a HEAD "adesso" non attribuisce niente con sessioni parallele
   e branch multipli (4 in questa sessione) → usare i `gitBranch` del transcript, un diff per branch.
   repo: iamantoniodinuzzo/claude-flutter, ticket #85 / nebbia
4. [environment: navigation][strutturale] 2 worktree di subagent ancora nel repo → rimuovere
   (`git worktree remove`) o ignorare `.claude/worktrees/` nelle ricerche. repo: questo

No action
5. [friction] `ls GLOSSARY*.md` exit 2 — sonda di file opzionale, non attrito
6. [friction] epica chiesta due volte — già risolta in sessione (ordine nella mappa #78)
7. [friction] 23 iniezioni hook PreToolUse graphify (Bash 16, Read 6, Glob 1) — fuori da retro,
   è terreno di `tune-setup` (ADR 0008, decisione 3)
```

---

# Cosa ha mostrato il prototipo

1. **Il Passo 0 di oggi sbaglia su questa sessione** e il v2 avrebbe riportato attrito falso.
   `api-request-blob` duplica i `tool_use` (122 blocchi, 61 id): "6 comandi ripetuti, 2 file
   >2x" sono tutti artefatti, reali 0 e 0. Va corretto per `id` prima di costruire `diff:`
   e `ambiente:` sopra gli stessi contatori. Non era in nessuna nebbia della mappa.
2. **`diff:` ancorato a HEAD «adesso» non regge con sessioni parallele o più branch.** Qui il
   diff di HEAD è di un'altra sessione (ADR 0011, 17:44Z) e il lavoro vero sta su 3 branch.
   Il controllo incrociato git ∩ transcript l'ha rilevato; il transcript offre anche i
   `gitBranch` visti, che permettono un diff per branch.
3. **Il handoff v2 legge lo stato di adesso, non della sessione**: segnalerebbe «branch non
   integrato» per il branch di un'altra sessione.
4. **I segnali del prototipo di #79 hanno falsi positivi su dati reali**: la regex dei check
   fa match dentro il `--body` di un `gh issue create`; gli Edit «di sorgenti» contano 3 script
   in `%TEMP%` fuori dal repo.
5. **Il blocco ambiente su una sessione di docs costa una riga** (`nessun segnale`): il costo di
   contesto della lente è trascurabile quando non scatta. Quanto costa quando scatta è stato
   misurato su una sessione Flutter reale fuori da questo file (vedi il commento di risoluzione del ticket).
6. **L'unico evento reale di "information access" di questa sessione è invisibile**: i 2
   `automode-blocked` stanno nel transcript del subagent, che lo script non legge
   (la nebbia lo sapeva per gli Edit, non per questo).
7. **Ambiente e Q1/Q5 possono coprire lo stesso fatto** (un check fallito o una riga di
   contesto sprecata è anche materia di Q1/Q5): serve una regola di dedup, oppure l'ambiente
   non ripete ciò che una domanda ha già coperto.
8. **I quattro livelli di #82 non hanno definizioni operative.** Usate qui, da confermare:
   *bloccante* = accesso o permesso negato che ha fermato l'agente; *costoso* = una chiamata o una
   riga di contesto sopra soglia, o ripetuta; *attrito* = ricerca a vuoto, check fallito, Read
   miss; *strutturale* = proprietà costante o configurazione/ambiente da pulire.

---

# Costo e forma, misurati sul file

| Parte del report | Righe | Note |
|---|---|---|
| Passo 0 (di cui `diff:` 9, `ambiente:` 1) | 40 | il v2 su questa sessione ne stampa 18 |
| Verifica del Passo 0 | 6 | nuova, solo perché lo script ha mentito |
| Q1-Q6 | 62 (~610 parole) | invariate di forma rispetto al v2 |
| Blocco `Ambiente` (nessun segnale) | 8 | |
| Ship handoff | 7 | |
| Report finale | 26 | 7 voci, 3 proposte |
| **Totale** | **~150 righe, ~1.285 parole** | v2 prototipo #65: ~95 righe; stima ~2.500 token, non misurata |

Più lungo del v2 di circa 55 righe; ~35 vengono dal diff, dalla verifica e dal caso «sessione
parallela», non dalla lente ambiente (1 riga su questa sessione).
