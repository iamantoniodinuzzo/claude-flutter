# Segnali estraibili dal transcript per le 7 categorie ambiente di retro

Ticket: [Quali segnali delle 7 categorie ambiente sono estraibili dal transcript](https://github.com/iamantoniodinuzzo/claude-flutter/issues/79)
Mappa: [Retro v3: audit del lavoro + miglioramenti all'ambiente](https://github.com/iamantoniodinuzzo/claude-flutter/issues/78)
Data: 2026-11-03. Branch throwaway `research/79-retro-environment-signals`, mai da mergiare.

## Domanda

Per ciascuna delle 7 categorie del retro di mattpocock (Navigation, Automated checks, Coding standards, Global AGENTS.md, Tool economy, No-ops, Information access): esiste un segnale verificabile nel transcript `.jsonl`, per Claude e per Codex? Quale record lo espone, come si aggrega, quanto costa in righe rispetto a `OUTPUT_LINE_CAP`, quali categorie vanno scartate.

## Risposta in breve

| Categoria | Verdetto | Claude (record) | Codex (record) | Costo in righe (default) | Note |
|---|---|---|---|---|---|
| Navigation | **Parziale** | `tool_use` Read/Grep/Glob prima del primo Edit/Write; `toolUseResult` di Grep/Glob a zero risultati; `tool_result.is_error` su Read ("does not exist"); `tool_use` Agent con `subagent_type` Explore; attachment `nested_memory` | `event_msg/item_completed` `CommandExecution.command` classificato per regex (`parsed_cmd` distingue solo `read`, mai la ricerca) | 1 riga + max 2-3 di dettaglio | Il costo dell'esplorazione è misurabile; "non ha trovato il file giusto" / "dipendenza nascosta" no |
| Automated checks | **Parziale** | `tool_use` Bash/PowerShell con comando che matcha un check + `tool_result.is_error`; Edit/Write di sorgenti dopo l'ultimo check; attachment `diagnostics`; `hook_success` con `hookEvent: PostToolUse` | `CommandExecution` con `exit_code != 0`; `FileChange.changes` | 1 riga | Check mancante e check fallito sono estraibili; "errore che un check avrebbe preso" e "repo senza guardrail" no (il secondo è lettura di file, non evento) |
| Coding standards | **No, scartare** | Nessun record per "il reviewer non l'ha preso". Review osservata (Agent/Skill con "review") in 3 sessioni su 236 | Nessun ruolo reviewer nei record | n/a | Il segnale centrale è un giudizio, non una struttura |
| Global AGENTS.md | **Sì** (proprietà, non evento) | attachment `instructions.files[]` (`path`, `type` User/Project/AutoMem, `content`), `nested_memory` | `world_state.payload.state.agents_md.text` | 1 riga + 2-3 file più grandi | Dimensione "as loaded" incluso lo scope utente; richiede soglia relativa |
| Tool economy | **Sì** (il più forte) | `tool_result.content` accoppiato via `tool_use_id`; attachment `read_truncation_notice`, `already_read_file`; `message.usage` | `custom_tool_call_output` con "Warning: truncated output (original token count: N)"; `CommandExecution.aggregated_output`; `token_usage_record.usage` | 1 riga + 3 di dettaglio | Claude dà caratteri (proxy), Codex dà token |
| No-ops | **No, scartare** | Nessun record: servirebbe un controfattuale comportamentale | idem | n/a | Solo il sottoinsieme "riga identica duplicata tra file steering" è strutturale, e si piega dentro Global AGENTS.md |
| Information access | **Parziale, stretto** | `tool_use` `mcp__*__authenticate`; `tool_result.is_error` "command not found"/"is not recognized"; `toolDenialKind`; `userFeedback` | `CommandExecution` non-zero con "not recognized"; `task_complete.error`; `McpToolCall.status`; `turn_aborted` | 1-3 righe, scatta raramente | AskUserQuestion / `request_user_input` sono troppo ambigui; la regex generica sugli errori è rumorosa |

Da tenere: Navigation (parziale), Automated checks (parziale), Global AGENTS.md, Tool economy, Information access (stretto). Da scartare: Coding standards, No-ops.

## Fonti e metodo

Fonti primarie, nessuna di seconda mano:

- Transcript reali Claude Code in `~/.claude/projects/` (versione CLI osservata `2.1.289`): 236 transcript principali, escluse le 141 sidechain in `subagents/`, 218.195 record totali (sidechain incluse nel solo inventario dei tipi). Lo slug di questo progetto contiene un solo transcript (la sessione in corso), quindi il corpus utile viene dai due progetti Flutter Engage (pollicino_viewer, tomcat_portal), stesso utente, stesso OS (Windows). I tassi di scatto non sono generalizzabili a progetti non Flutter.
- Transcript reali Codex in `~/.codex/sessions/`: 72 rollout, `cli_version` da `0.153.4` a `0.165.0`, 22.756 record. Per il primo `session_meta`: 43 senza `parent_thread_id` (top-level) e 29 thread di subagente. Le statistiche Codex includono tutti e 72.
- Codice del toolkit: `skills/retro/scripts/session-evidence.js`, `skills/retro/scripts/codex-transcript.js`, `skills/retro/SKILL.md`, `tests/retro/`.
- Precedenti: `docs/adr/0006-retro-v2-skill-shape.md`, `0007`, `0008-tune-setup-audit-surface.md`, `0009-proposal-routing-and-caps.md`; il ticket chiuso [Quali segnali di attrito e di successo sono estraibili dal transcript .jsonl](https://github.com/iamantoniodinuzzo/claude-flutter/issues/60) della mappa [Retro come loop di auto-miglioramento del setup](https://github.com/iamantoniodinuzzo/claude-flutter/issues/57).
- Fonte delle 7 categorie: `mattpocock-skills` 1.3.1, `skills/engineering/retro/SKILL.md` (MIT), letto dalla cache locale del plugin.

Limite dichiarato: non esiste, tra le fonti consultate, uno schema pubblicato del `.jsonl` di Claude Code né di Codex. Ogni campo qui sotto è osservato empiricamente sui file reali ed è legato alle versioni sopra. Un cambio di formato lato CLI può romperlo (è già successo, vedi "Rischi trovati").

Metodo: script scratch in `%TEMP%` (`issue79_*.js`, non versionati) che (1) inventariano i tipi di record, (2) estraggono i segnali per categoria con un prototipo, (3) misurano il tasso di scatto e le righe prodotte sull'intero corpus, (4) eseguono lo script reale `session-evidence.js` su tutti i 236 transcript per misurare la base di righe già consumata. Le regex e le soglie citate sotto sono valori del prototipo, non decisioni.

## Vincolo di costo: la base di righe già consumata

`OUTPUT_LINE_CAP = 40` (`session-evidence.js:70`). Misurato eseguendo lo script reale (output di default, senza `--config-audit`) sui 236 transcript Claude, righe di corpo escluso l'header:

| Statistica | Righe |
|---|---|
| p50 | 15 |
| p95 | 30 |
| max | 34 |
| transcript a 40 o oltre | 0 su 236 |

Margine residuo: 10 righe al p95, 6 al massimo. Il taglio di default è silenzioso (`out.slice(0, OUTPUT_LINE_CAP)` a `session-evidence.js:680`): solo il percorso `--config-audit` stampa `output truncated at ...`. Un blocco ambiente aggiunto in coda verrebbe tagliato per primo, uno aggiunto in testa taglierebbe i segnali esistenti.

Costo del prototipo con tutte le categorie sempre accese (righe per sessione, p50 / p95 / max): Navigation 1/4/6, Automated checks 1/1/1, Global AGENTS.md 4/4/4, Tool economy 4/4/4, Information access 3/4/6. Somma al p95 circa 18 righe, oltre il margine di 10. Quindi o ogni categoria emette solo quando scatta, o il blocco ambiente ha un tetto proprio.

Con emissione condizionata (soglie del prototipo, elencate sotto) le categorie che scattano per sessione sono: p50 2, p95 3, max 4 (distribuzione su 236: 0 categorie in 36 sessioni, 1 in 73, 2 in 69, 3 in 51, 4 in 7). A 2-3 righe per categoria che scatta il costo è circa 5-6 righe al p50 e 8-9 al p95: al p95 si entra a 39 su 40 (30 + 9), al massimo si sfora (34 + circa 12). Un tetto separato, come `CONFIG_AUDIT_LINE_CAP` (`session-evidence.js:75`, ADR 0008), è la forma che regge; la scelta del numero spetta al ticket di build, non a questo.

Per Codex il default non ha una base misurabile: il parser oggi non vede quasi nulla (vedi sotto).

## Rischi trovati sul parser esistente (prerequisiti per qualunque claim su Codex)

1. **Il parser Codex non legge il formato reale.** `codex-transcript.js:139-146` normalizza `response_item` con `function_call` / `custom_tool_call` e conta come `unsupported` ogni `exec`. Nei 72 rollout reali tutte le chiamate di shell sono `response_item` `custom_tool_call` con `name: "exec"` (1.635) il cui `input` è uno snippet JavaScript `text(await tools.exec_command({cmd:"...", max_output_tokens:...}))`; non esiste nessun `function_call` chiamato `exec_command` (i `function_call` reali sono solo `wait`, `send_message`, `request_user_input`, `wait_agent`, `spawn_agent`, ...). Verificato eseguendo lo script reale su un rollout reale (`rollout-2026-10-01T07-24-56-...`, 45 chiamate): stampa `WARNING: partial Codex evidence (... 45 unsupported tool records)` e poi `tool errors: 0`, `repeated shell commands: 0`, `files edited >2x: 0`. I test in `tests/retro/codex-evidence.test.js` usano fixture sintetiche con `function_call exec_command`, una forma assente dall'intero corpus locale.
2. **Il dato strutturato esiste altrove nello stesso file.** Per quegli stessi 1.645 comandi c'è un record `event_msg` con `payload.type: "item_completed"` e `item.type: "CommandExecution"` che porta `command` (array, l'ultimo elemento è la stringa eseguita), `exit_code` (numerico in 1.645 su 1.645), `status` (`completed` 1.457, `failed` 188), `aggregated_output`, `duration`, `parsed_cmd`. Le modifiche ai file sono `item.type: "FileChange"` con `changes` come oggetto indicizzato per path (`{type: "add"|..., content}`). Qualunque estrazione Codex per le 7 categorie va costruita su questi record, non su `response_item`. Questo è un cambio di adattatore, fuori dal perimetro di questa ricerca.
3. **`toolDenialKind` ha un quarto valore non contato.** Nel corpus compaiono `user-rejected` 22, `permission-rule` 51, `automode-blocked` 18 e `automode-unavailable` 2. `session-evidence.js:513` inizializza `denialCounts` con i soli primi tre e ignora gli altri: la riga `toolDenialKind:` di `--config-audit` omette `automode-unavailable`. Il ticket chiuso sui segnali estraibili ne elencava tre.

## Categoria per categoria

### 1. Navigation: parziale

*Use when* di Matt: la sessione ha impiegato molto a trovare un'informazione.

Claude:
- Costo dell'esplorazione: conteggio dei `tool_use` Read/Grep/Glob del thread principale (`isSidechain` falso) prima del primo `tool_use` Edit/Write, più i file Read distinti. Corpus: almeno una chiamata in 195/236 sessioni, p50 11, p95 52, max 99.
- Ricerche a vuoto: `user.toolUseResult.filenames` vuoto (Grep, senza `content`) o `numFiles === 0` (Glob). 106/236 sessioni ne hanno almeno una, p95 4, max 10. Il campo è accoppiato al `tool_use` tramite `tool_use_id`, quindi si può citare il pattern cercato.
- Path indovinati male: `tool_result.is_error` su Read con testo "does not exist / not found". 12/236 sessioni, max 2.
- Esplorazione delegata: `tool_use` Agent con `input.subagent_type` Explore, 47/236 sessioni (124 chiamate su 161 totali di Agent nei thread principali).
- Puntatore che funziona: attachment `nested_memory` (`path`, `content.content`, `contentDiffersFromDisk`), un CLAUDE.md annidato caricato entrando in una directory. Solo 11/236 sessioni: indica che i puntatori annidati sono rari.

Codex: nessun campo di ricerca. `CommandExecution.parsed_cmd[].type` vale solo `read` (70) o `unknown` (1.575): `rg`, `Get-ChildItem`, `Select-String` risultano `unknown`. Serve una regex sul comando (ultimo elemento di `command`), ad esempio `rg|grep|Select-String|Get-ChildItem|find`, e il segnale di ricerca a vuoto diventa "exit 0 con `aggregated_output` vuoto" (2/72 rollout). Segnale debole e dipendente dalla regex.

Aggregazione e costo: una riga di sintesi (`N Read/Grep/Glob (D file) prima del primo edit; ricerche a vuoto: k; Read miss: m; Explore: x`) più al massimo 3 righe di dettaglio con il pattern o path. Misurato 1 / 4 / 6 righe (p50/p95/max) sempre acceso. Con soglia di scatto del prototipo (almeno 3 ricerche a vuoto o almeno 1 Read miss) scatta in 39/236 sessioni.

Non estraibile: se il file trovato fosse quello giusto, se esistesse una dipendenza nascosta, se un puntatore avrebbe aiutato. Il conteggio dice quanta fatica è stata spesa, non perché. La proposta ("aggiungi un puntatore a X") richiede che il modello colleghi il costo a un file concreto, e questo è giudizio ancorato a evidenza, coerente con il design di ADR 0008 punto 6.

### 2. Automated checks: parziale

*Use when* di Matt: l'agente ha sbagliato qualcosa che un check automatico avrebbe preso, oppure il repo non ha nessun guardrail.

Claude:
- Check eseguiti: `tool_use` Bash/PowerShell il cui `input.command` matcha una regex di check. Regex del prototipo (generica con parte Flutter): `(dart|flutter) (analyze|test|format)`, `melos (run|exec|analyze|test)`, `eslint|tsc|prettier|jest|vitest|pytest|ruff|mypy`, `npm|pnpm|yarn (run) (test|lint|typecheck|check)`, `cargo (test|clippy|check)`, `go (test|vet)`, `node --test`. Esito dal `tool_result.is_error` accoppiato. Corpus: 160/236 sessioni con almeno un check (p50 3, p95 23), 63/236 con almeno uno fallito.
- Check mancante: numero di file sorgente (estensioni `.dart`, `.ts`, `.py`, ...) toccati da `tool_use` Edit/Write dopo l'ultimo check (o in assenza di check). 175/236 sessioni modificano sorgenti (p50 13), 52/236 hanno file modificati dopo l'ultimo check.
- Guardrail già cablati: attachment `hook_success` con `hookEvent: "PostToolUse"` e `hookName`: 31/236 sessioni (il caso "check esiste, è cablato"). Attachment `diagnostics` (`files[].diagnostics[]` con `severity`, `code`, `source`): 14/236 sessioni con almeno un `Error`, sono diagnostiche IDE, quindi dipendono dall'estensione IDE connessa.
- Dichiarato dal transcript: `system` `stop_hook_summary` (`hookInfos[].command`, `hookErrors`) dice quali hook di stop hanno girato, 318 eventi.

Codex: `CommandExecution.exit_code` e `command` con la stessa regex; `FileChange.changes` per i sorgenti toccati. 10/72 rollout hanno almeno un check e 10/72 almeno un check fallito. Non esistono hook né diagnostiche IDE nei record Codex.

Aggregazione e costo: una riga (`N check (k falliti); M edit di sorgenti, F file toccati dopo l'ultimo check; hook PostToolUse: ...`). Misurato 1 riga sempre. Con soglia del prototipo (sorgenti toccati e, o nessun check, o file dopo l'ultimo check, o almeno 2 check falliti) scatta in 84/236 sessioni, il più frequente dopo Tool economy.

Non estraibile: "l'errore che un check avrebbe preso" (serve capire la causa), e "il repo non ha nessun guardrail". Quest'ultimo è un fatto sul filesystem (workflow CI, hook git), non un evento del transcript: può essere letto dalla skill in diretta come ADR 0008 fa per `CLAUDE.md` e `settings.json`, ma per la regola non negoziabile la proposta deve restare ancorata a un evento del transcript (sorgenti modificati senza check).

### 3. Coding standards: no, scartare

*Use when* di Matt: il reviewer agent non ha preso un errore.

Nessun record dice "il reviewer ha mancato qualcosa". Quello che il transcript espone è solo che una review c'è stata: `tool_use` Agent con `subagent_type` che contiene "review" o `tool_use` Skill con nome che contiene "review"/"audit". Sono 3 sessioni su 236 (max 2 occorrenze); i subagent osservati sono quasi solo `Explore` (124 su 161 chiamate Agent) e `general-purpose`. Anche l'attribuzione (`attributionSkill`, `attributionAgent` sugli eventi `assistant`) dice chi ha scritto un turno, non se una review ha fallito. Per accertare un mancato rilevamento servirebbe un secondo evento (un errore trovato dopo la review, a opera dell'utente o di un check) più un giudizio causale: non è strutturale. Nemmeno la classificazione "violazione meccanica vs giudizio" di Matt ha un campo. Codex: nessun record di ruolo del subagente (`spawn_agent` 9, `agent_path`/`agent_nickname` solo come metadati di thread).

Scartata. Il frammento riutilizzabile (la review c'è stata, con N edit dopo la review) non regge da solo una proposta. Il caso "mancato errore" resta comunque emergibile dal dialogo dell'utente, ma allora è una proposta ancorata alla conversazione, non al transcript.

### 4. Global AGENTS.md: sì, come proprietà e non come evento

*Use when* di Matt: il file AGENTS.md è particolarmente grande, nel repo o nello scope globale dell'utente.

Claude: attachment `instructions` con `files[]`, ciascuno `{path, type, content}`; `type` osservato: `User` (regole in `~/.claude/rules/`), `Project` (CLAUDE.md), `AutoMem` (MEMORY.md). Dimensione "as loaded" = lunghezza di `content`, deduplicata per `path` (l'attachment si ripete). Più `nested_memory` per i CLAUDE.md annidati. Nei progetti Engage il totale mediano caricato è circa 22.000-27.000 caratteri; il singolo file più grande è `AutoMem:MEMORY.md` (9.391-18.182 caratteri mediani per progetto, più di un CLAUDE.md di progetto da 6.260-6.479). Per il repo del toolkit (una sessione): 4.327 caratteri in 3 file.

Codex: record top-level `world_state`, `payload.state.agents_md.text` (e `.directory`), presente in 72/72 rollout; mediana 5.455 caratteri, p95 e max 19.477. Compaiono anche `state.skills`, `state.host_skills`, `state.managed_developer_instructions`, `state.apps_instructions`, `state.plugins_instructions` come testo caricato.

Valore aggiunto rispetto a leggere il file: il transcript prova cosa l'agente ha ricevuto davvero, incluso lo scope utente e la memoria automatica, che retro non troverebbe cercando nel repo. Non sostituisce la lettura del file per decidere cosa spostare.

Piega dentro la categoria: righe identiche (lunghezza almeno 40 caratteri) presenti in più di un file steering caricato: 34/236 sessioni, 68 righe in totale. È il frammento strutturale di "No-ops".

Aggregazione e costo: una riga (`N file, C caratteri (~C/4 token stima)`) più i 2-3 file più grandi con `type`. Misurato 4 righe Claude, 1 riga Codex. Attenzione: è una proprietà costante della configurazione, non un evento di sessione. Con la soglia fissa del prototipo (oltre 20.000 caratteri) scatta in 163/236 sessioni, quindi una soglia assoluta non discrimina: serve una soglia relativa (quota del file più grande sul totale, oppure budget dichiarato in `ai_docs`) o emettere sempre una riga sola. Mappa anche sul confine già deciso con `tune-setup` (ADR 0006, ADR 0008): l'audit di `CLAUDE.md` è lì; qui sta solo il fatto misurabile.

Non estraibile: quali istruzioni vadano spostate in coding standards o in check automatici (giudizio).

### 5. Tool economy: sì, la più forte

*Use when* di Matt: l'agente ha fatto una chiamata costosa.

Claude:
- Dimensione dei risultati: lunghezza di `tool_result.content` accoppiata via `tool_use_id` al `tool_use` (comando, `file_path` o pattern come estratto citabile). Percentili in caratteri: Bash p50 919, p95 7.117, max 29.474; Read p50 3.142, p95 16.774, max 589.840; Grep p95 8.172; Glob p95 5.042; chiamate di browser (`mcp__claude-in-chrome__computer`) p95 59.266, max 101.090. Risultati sopra 8.000 caratteri: almeno uno in 194/236 sessioni (p50 6, p95 18, max 37).
- Marcatori espliciti del runtime: attachment `read_truncation_notice` con `banner` ("showing lines 1-898 of 1417 total (33504 tokens, cap 25000)", 3/236 sessioni) e `already_read_file` con `content.type: "file_unchanged"` (rilettura inutile, 1/236). Rari ma inequivocabili.
- Contesto: `assistant.message.usage` (`input_tokens`, `cache_read_input_tokens`, `cache_creation_input_tokens`, `output_tokens`) per turno: il picco di contesto del thread principale è calcolabile, ma il costo non è attribuibile a una singola chiamata senza differenze tra turni.

Codex:
- `response_item` `custom_tool_call_output.output` contiene, quando il runtime tronca, `Warning: truncated output (original token count: N)`: 130 output su 1.635, in 31/72 rollout; il massimo osservato è 208.775 token originali; `original token count` è presente in 1.330 output. Questo è il costo realmente visto dal modello, in token.
- `CommandExecution.aggregated_output` (lunghezza, `duration`) e `token_usage_record.payload.usage` / `event_msg` `token_count` (`info.total_token_usage`, `last_token_usage`, `model_context_window`). Picco di `input_tokens` mediano 75.923, p95 214.769 su una finestra di 258.400.

Aggregazione e costo: una riga di sintesi (`N risultati sopra soglia; troncature; riletture; picco di contesto`) più i 3 risultati più grandi con strumento ed estratto. Misurato 4 righe. Con soglia del prototipo (un risultato oltre 20.000 caratteri, o una troncatura, o una rilettura) scatta in 98/236 sessioni Claude.

Limite: i caratteri Claude sono un proxy dei token (nessun conteggio per chiamata); Codex dà il conteggio vero ma solo quando c'è troncatura. Un duplicato è visibile nel campione di questa sessione (la stessa lettura di `skills/retro/SKILL.md`, 12.621 caratteri, compare due volte tra i primi 3): conferma che la rilettura va rilevata per path e non solo da `already_read_file`.

Non estraibile: se la chiamata fosse evitabile. Resta una proposta ancorata a un evento (la chiamata, il suo costo) più un giudizio del modello.

### 6. No-ops: no, scartare

*Use when* di Matt: i file steering sono grandi e ingestibili; si cercano istruzioni che non modificano il comportamento.

Dimostrare che un'istruzione non cambia il comportamento richiede un controfattuale (cosa avrebbe fatto l'agente senza), che nessun record contiene. Anche la forma "l'istruzione è stata ignorata" richiede di sapere cosa l'istruzione comandasse e se la sessione ne era soggetta: semantica, non struttura. Il contesto steering è tracciato (vedi Global AGENTS.md), ma è l'ingresso, non l'effetto. Fatti strutturali vicini, già coperti altrove: ripetizione di una stessa iniezione di hook, già nel blocco `--config-audit` di `tune-setup` (ADR 0008 punto 3); righe identiche duplicate tra file steering, piegate in Global AGENTS.md. Codex: nessun hook, quindi nulla.

Scartata come categoria autonoma.

### 7. Information access: parziale, stretto

*Use when* di Matt: un'informazione cruciale non era disponibile all'agente.

Claude, segnali che reggono:
- Accesso non configurato: `tool_use` il cui nome termina in `__authenticate` (server MCP che richiede login): 5/236 sessioni, max 4 chiamate.
- Strumento o script non trovato: `tool_result.is_error` su Bash/PowerShell con exit 127 / "command not found" / "The term '...' is not recognized": fino a 13 errori su 514 errori di shell (exit 127: 2, "is not recognized": 11, senza deduplicare gli eventuali doppi), in 12 sessioni. Il comando più frequente è `tools/test.ps1` (7 volte), uno script locale non trovato dal path usato: il confine con Navigation è sfumato, ma l'evento è preciso.
- Rifiuti: `toolDenialKind` sul record `user` (`permission-rule` 51, più spesso su Bash 29; `automode-blocked` 18; `automode-unavailable` 2; `user-rejected` 22, di cui 10 su `AskUserQuestion` e 6 su `ExitPlanMode`) e `userFeedback` quando presente (10 occorrenze, citabili). Come già deciso in ADR 0008 punto 5, solo `user-rejected` è attrito; gli altri sono guardrail che funzionano. `permission-rule` può però indicare un'informazione bloccata per config (ad esempio un log non leggibile): lo dice il `tool` rifiutato e il suo estratto.
- Accesso a log/dev server già presente (controprova): `tool_use` Monitor (197) e `run_in_background`.

Segnali che non reggono:
- `AskUserQuestion`: presente in 178/236 sessioni (mediana 2). Non distingue "mi manca un dato" da "serve una tua decisione" (le domande osservate sono quasi tutte decisioni di design). Non è evidenza di informazione assente.
- Regex generica sugli errori (401/403/permission denied/ENOENT/no such file/authenticat...): precisione bassa. Su 69 corrispondenze, nelle prime 18 esaminate solo 5 sono strumenti non trovati; il resto è output di test con la parola "authentication", `ls: cannot access` su path indovinati (Navigation), `FileNotFoundError` di script scratch. Da non usare come segnale.

Codex: `CommandExecution` non-zero con "is not recognized" / "command not found" (2/72 rollout), `McpToolCall.status` (164 chiamate: `completed` 162, `failed` 2), `event_msg` `task_complete.error` (24 record valorizzati in 16/72 rollout, ma i due campioni letti sono limiti d'uso dell'account e non informazione mancante: non usarlo come segnale di questa categoria), `turn_aborted` con `reason: "interrupted"` (5, in 4/72 rollout), `function_call` `request_user_input` (39 chiamate, 13/72 rollout, stessa ambiguità di AskUserQuestion).

Aggregazione e costo: 1 riga (`authenticate: n; comando non trovato: m; rifiuti per tipo`) più al massimo 2 righe di dettaglio. Con la regola stretta (authenticate oppure comando non trovato) scatta in sole 8/236 sessioni, quindi quasi sempre costa zero righe.

Non estraibile: che l'informazione mancante fosse "cruciale" e quale fosse. Da qui il parziale: il transcript mostra dove l'accesso è mancato, non cosa serviva.

## Soglie e regole del prototipo (da non leggere come decisioni)

- Navigation scatta con almeno 3 ricerche a vuoto o almeno 1 Read miss.
- Automated checks scatta con sorgenti modificati e (nessun check, oppure file toccati dopo l'ultimo check, oppure almeno 2 check falliti).
- Global AGENTS.md: soglia assoluta di 20.000 caratteri scartata perché non discrimina (163/236); serve soglia relativa.
- Tool economy scatta con un risultato sopra 20.000 caratteri, una troncatura o una rilettura.
- Information access scatta con `authenticate` o comando non trovato.
- Distribuzione risultante: categorie che scattano per sessione 0 in 36, 1 in 73, 2 in 69, 3 in 51, 4 in 7 (su 236).

## Implicazioni per i ticket successivi della mappa

- Cinque categorie su sette hanno un'ancora strutturale; due (Coding standards, No-ops) non la hanno e vanno scartate dal set, come previsto dalla decisione di charting che la ricerca potesse scartare.
- Nessuna delle cinque produce da sola una proposta: ciascuna dà un numero e una citazione; la proposta resta un giudizio ancorato a quell'evento, con la stessa disciplina di Q5.
- Il costo non entra nel margine di `OUTPUT_LINE_CAP` se le categorie sono sempre accese; entra, di poco, se emettono solo quando scattano; entra comodamente solo con un tetto proprio, come per `--config-audit`. Il default di `retro` oggi taglia in silenzio.
- Il supporto Codex è una dipendenza a monte: prima di promettere qualsiasi categoria su Codex, il parser deve leggere `event_msg/item_completed` (`CommandExecution`, `FileChange`) e `world_state`. Oggi su transcript Codex reali produce "0 errori, 0 ripetizioni" accompagnato da un avviso di evidenza parziale: è la situazione che `SKILL.md` stesso vieta di leggere come "sessione pulita".
- Il blocco `--config-audit` dichiara già "unavailable" per Codex hook, Skill e `toolDenialKind`: confermato corretto, nessun record equivalente esiste nei 72 rollout.

## Cosa non è stato verificato

- Nessun transcript di un progetto non Flutter, né di un'altra macchina o altro OS.
- Nessuna sessione compattata più volte (il corpus ha un solo `compact_boundary`); il comportamento dei segnali dopo compattazione non è misurato.
- I tassi di scatto sono su un solo utente e due monorepo Flutter: indicano l'ordine di grandezza, non una frequenza generale.
- `McpToolCall.status: failed` compare in 2 sole chiamate Codex: il campo di errore (`result`) in quei casi non è stato analizzato.
- Il costo in token delle righe aggiunte non è stato misurato, solo il numero di righe.
