# Come ricavare in modo affidabile il diff della sessione

Ticket di research [Come ricavare in modo affidabile il diff della sessione](https://github.com/iamantoniodinuzzo/claude-flutter/issues/80), figlio della mappa [Retro v3: audit del lavoro + miglioramenti all'ambiente](https://github.com/iamantoniodinuzzo/claude-flutter/issues/78).

Data: 2026-11-03. Git 2.54.0 (Windows), Claude Code `version` letta dai record, Codex CLI 0.153.4 e 0.162.0 (da `session_meta.cli_version`).

## Domanda

Qual e il modo piu economico e affidabile per dare a `retro` (Passo 0) il diff prodotto dalla sessione, come ancora per Q1-Q4, in forma di stat + path, senza lanciare audit? Opzioni: `git diff --stat` dal merge-base, ricostruzione dai record Edit/Write del transcript, patch dei rollout Codex, combinazioni.

## Risposta in breve

Il git e la fonte primaria, il transcript e il controllo incrociato e il fallback. L'ancora giusta **non e il merge-base con il branch base**: e il **commit di HEAD all'inizio della sessione** (Claude: `git rev-list -n1 --before=<primo timestamp> HEAD`; Codex: `session_meta.git.commit_hash`, scritto dal recorder di Codex stesso). Il diff e `git diff --numstat -z <ancora>` (ancora -> working tree, quindi committato + non committato sui file tracciati), piu i file non tracciati dal `git status --porcelain` che il Passo 0 esegue gia. Il blocco di output costa 8-10 righe, fisso. Quando il diff non e ricavabile si stampa `NON RICAVABILE (<motivo>)` seguito dai soli path ricavati dal transcript, etichettati come parziali: mai "nessuna modifica".

## Metodo e campione

Tutto misurato su record reali, non su ipotesi. Script di appoggio in `%TEMP%` (`issue80_*.js`), non committati.

- Claude Code: `~/.claude/projects/`, 5 directory di progetto, 377 file `.jsonl` (236 transcript principali, 141 di subagent). Tre sono di questo repo (sessione corrente + 2 subagent); il resto e un monorepo Melos reale (`pollicino_viewer`, app `pollicino_viewer` e `tomcat_portal`), con il repo clonato in locale per confrontare transcript e git. 201 sessioni hanno almeno un Edit/Write riuscito.
- Codex: `~/.codex/sessions`, 72 rollout, 81 record `session_meta`, 1635 chiamate `exec`.
- Documentazione: docs ufficiali di Claude Code (checkpointing), sorgente di Codex (`codex-rs/rollout/src/recorder.rs`), documentazione di git installata con git 2.54.0 (`git-diff.adoc`, `diff-options.adoc`).

Limite del campione: un solo utente, una sola macchina Windows, una sola sessione Claude compattata (piu una `continued-in`). Cio che segue sul caso "compattata" e osservato su 2 sessioni, non statistico.

## Record reali (campi veri)

### Claude Code: tool_use

- `Edit`: 9325 chiamate. `input` = `file_path`, `old_string`, `new_string`, `replace_all` (opzionale).
- `Write`: 1469 chiamate. `input` = `file_path`, `content`.
- Varianti rare di `input` con chiavi sbagliate o in piu (`new_text`, `file_text`, `file_content`, `new_value`, `description`): una decina di record, tutte con `file_path`. `file_path` e l'unico campo su cui contare.
- Nessun `MultiEdit` e nessun `NotebookEdit` nel campione.
- Sul `tool_use` non c'e esito: serve l'accoppiamento con il `tool_result` (`tool_use_id`, `is_error`). `session-evidence.js` oggi incrementa `editedFileCounts` sul `tool_use` senza guardare l'esito (`skills/retro/scripts/session-evidence.js`, righe 547-553), quindi un Edit fallito conta come modifica. Per un diff va invece escluso.

### Claude Code: toolUseResult (sul record `user` col `tool_result`)

- Edit riuscito: `filePath`, `oldString`, `newString`, `originalFile`, `replaceAll`, `structuredPatch`, `userModified`. Varianti con `contentNotInModelContext` (3533 record) e `staleRecovered` (21).
- Write riuscito: `type` (`create` o `update`), `filePath`, `content`, `originalFile`, `structuredPatch`, `userModified`; per i file di memoria anche `memdirStamped`.
- `structuredPatch` e un array di hunk `{oldStart, oldLines, newStart, newLines, lines}`: dal transcript si potrebbe ricavare anche il churn per Edit, ma con rieditazioni dello stesso file si somma piu volte la stessa riga. Non serve a questo ticket.
- `file-history-delta` (record top-level) ha `trackingPath` (relativo se il file e dentro il progetto, assoluto se fuori), `backup.backupFileName`, `backup.version`. E un record interno non documentato come formato; la docs di checkpointing conferma solo il comportamento (sotto). Non lo uso come fonte: stesso perimetro dei record Edit/Write, formato meno stabile.

### Claude Code: campi di sessione utili

- Ogni evento ha `cwd`, `gitBranch`, `sessionId`, `timestamp`, `isSidechain`. In 236 sessioni, nessuna ha piu di un valore di `cwd`: e la working directory primaria, non segue i `cd` dentro Bash.
- `gitBranch` cambia dentro la sessione. Nel monorepo, su 172 sessioni con un feature/bugfix branch mergiato, 151 hanno 3 o piu valori consecutivi (tipicamente `develop` -> `feature/A` -> `develop` -> `feature/B`); solo 8 iniziano gia sul branch finale. Una sessione non e un branch.
- Compattazione: due meccanismi osservati. (1) `system` con `subtype: compact_boundary` e `compactMetadata` nello stesso file: i record prima del confine restano (27 path Edit/Write prima, 5 dopo). (2) record `continued-in` con `continuedInSessionId` a fine file: la sessione prosegue in un **altro** file `.jsonl` (verificato: il file di destinazione esiste, 2,2 MB, in un'altra directory di progetto).
- Subagent: gli Edit/Write dei subagent stanno solo in `<sessionId>/subagents/agent-*.jsonl`. Nel campione il file principale ha 0 eventi `isSidechain`; i file subagent hanno 363 Edit/Write in 18 file di 6 sessioni (3,4% degli Edit/Write totali). `session-evidence.js` legge un solo file (`newestJsonlIn` non scende nelle sottodirectory), quindi li perde. Nel subagent di questa ricerca `cwd` e il path del worktree, non il root del repo principale.

### Documentazione ufficiale: cosa copre e cosa no il tracking di Claude Code

La pagina di checkpointing dichiara: il rewind non annulla le modifiche fatte da comandi Bash, "except in files the main conversation had already edited with a tool such as Write or Edit"; le modifiche dei subagent non sono tracciate; le modifiche esterne o di altre sessioni concorrenti "are normally not captured" (https://code.claude.com/docs/en/checkpointing, https://code.claude.com/docs/en/agent-sdk/file-checkpointing). Vale quindi anche per qualunque ricostruzione dal transcript: stessa blind spot di Bash, subagent, altre sessioni.

### Codex: record veri

- `session_meta.payload` (primo record di ogni rollout): `id`, `cwd`, `cli_version`, `git: {commit_hash, branch, repository_url}`. Tutti gli 81 `session_meta` hanno `git`. Il sorgente (`codex-rs/rollout/src/recorder.rs`, `write_session_meta`) dice che `git` e popolato solo se `cwd` e dentro un repo git (`get_git_repo_root(cwd).is_some()`): fuori da un repo il campo manca. Il `commit_hash` e HEAD all'avvio del thread, quindi e un'ancora esatta, non un'euristica. Verificato: `7c83823d` (rollout di questo repo) esiste con `git cat-file -t`.
- Tool: nei rollout reali l'unico tool di editing/shell e `exec` (`response_item` con `payload.type: custom_tool_call`, `name: "exec"`): 1635 chiamate, 0 chiamate con nome `apply_patch`. Il `payload.input` e **codice JS** che chiama `tools.exec_command({cmd:...})`, `tools.apply_patch("...")`, `tools.write_stdin(...)`. Le patch sono dentro una stringa JS, con `\n` come sequenza di escape letterale, non come a-capo reale.
- Conseguenza sul codice attuale: `skills/retro/scripts/codex-transcript.js` (righe 161-165) estrae i path solo da chiamate il cui `name` finisce in `apply_patch` e con regex `^\*\*\* (Update|Add|Delete) File:` su righe vere. Misura: 201 chiamate `tools.apply_patch(` in 30 rollout; regex attuale 0/201; regex sulla stringa con `\n` letterale 201/201 (293 path). Su un rollout reale con 23 path patchati (`...82c481b4`), `normalize()` restituisce 0 record `Edit` e `unsupported: 63`. Il contatore `unsupported` fa uscire un `WARNING: partial Codex evidence`, quindi non e silenzio, ma l'informazione sui file modificati e persa.
- Le patch possono anche rinominare (`*** Move to: <nuovo path>`, dai prompt di Codex nel sorgente) e le scritture da shell (`Set-Content`, `sed -i`, ...) sono invisibili: 156 chiamate `exec` con scrittura da shell nel campione.

## Opzioni a confronto

Costo = righe di output che entrano nel contesto di retro, caso reale: sessione monorepo con 31 file / +3568 -517 (sessione di una "containment and altitude helper", merge `feat: merge feature/1377_containment_altitude_helper into develop`).

| Opzione | Righe sul caso reale | Cosa vede | Cosa non vede |
|---|---|---|---|
| `git diff --stat <ancora>` | 32 (file + riepilogo); 1 con `--shortstat` | tutto cio che e nel git dall'ancora, committato o no | file non tracciati; lavoro di altre sessioni si mescola; i path lunghi sono troncati con `...` a 80 colonne |
| `git diff --stat-count=10` | 12 + marcatore `...` + riepilogo | come sopra, troncamento esplicito | come sopra |
| `git diff --dirstat=files,0` | 19 (righe annidate per directory) | distribuzione | peggio di numstat: righe duplicate per directory padre/figlia, niente numeri assoluti |
| Transcript Edit/Write riusciti | ~30 (un path per riga) | solo cio che gli strumenti hanno scritto, anche fuori dal repo | Bash (`sed -i`, `dart format`, `build_runner`), subagent (file separati), sessioni continuate (altro file), commit/revert |
| Patch Codex | non misurabile oggi | cio che passa da `tools.apply_patch` | `exec` shell, patch non letterali, parser attuale non funziona |
| **Combinazione raccomandata** | **8-10, fisse** | git per le stat, transcript come controllo | vedi modalita di fallimento |

Distribuzione reale della dimensione (proxy: path distinti Edit/Write riusciti in 201 sessioni con modifiche): mediana 11, p90 26, massimo 60 file. Un `--stat` completo costa quindi da 12 a ~61 righe, da confrontare con il tetto di 40 righe (`OUTPUT_LINE_CAP`) che l'evidenza esistente gia consuma.

### Fedelta di git rispetto al transcript, misurata

Confronto per sessione, con il set di path Edit/Write riusciti come riferimento (e un proxy: ignora Bash e subagent). 168 sessioni del monorepo con un branch feature/bugfix mergiato. Stato replicato: HEAD = commit di merge dell'ultimo branch.

| Ancora | Recall mediano | Recall p10 | Precisione mediana | Precisione p10 |
|---|---|---|---|---|
| A: merge-base dell'ultimo branch (`merge^1`..`merge^2`) | 1,00 | **0,20** | 0,86 | 0,19 |
| B: HEAD al primo timestamp della sessione (`rev-list -n1 --before`) | 1,00 | **0,92** | 0,85 | 0,24 |

Lettura: A perde molto nelle sessioni che coprono piu branch (la norma qui: 151 su 172). B le copre quasi sempre. La precisione bassa nel p10 viene dal fatto che git include cose che gli strumenti non hanno scritto: file generati (esempio verificato: tre `*.g.dart` prodotti da `build_runner`, presenti nel diff e assenti dal transcript), modifiche da shell, e commit di altre sessioni che hanno toccato lo stesso branch nel frattempo. Non e un difetto da correggere: va dichiarato nel report (riga "in diff ma non editati da strumenti: N").

Tre sessioni confrontate nel dettaglio (diff tra `merge^1` e `merge^2` vs path Edit/Write):

| Sessione | File git | File transcript (in repo) | Solo git | Solo transcript | File fuori repo | Righe `--stat` |
|---|---|---|---|---|---|---|
| `feature/1362_composition_layer_test_keys` | 22 | 22 | 0 | 0 | 4 (plan, script in `%TEMP%`, 2 file di memoria) | 23 |
| `feature/1380_optional_names_stable_label` | 25 | 25 | 0 | 0 | 1 (plan) | 26 |
| `feature/1377_containment_altitude_helper` | 31 | 28 | 3 (`*.g.dart`) | 0 | 1 (plan) | 32 |

Il blocco di output prototipato (script `issue80_proto.js`) su queste tre sessioni: 10 righe ciascuna, ~250 ms, con ancora per timestamp. Esempio reale (sessione di `feature/1362_composition_layer_test_keys`, stato post-merge su `develop`, dove il merge-base e uguale a HEAD e l'ancora per timestamp e l'unica che funziona):

```
session diff vs 49e2ef236 [HEAD at session start (rev-list --before=2026-10-29T10:18Z) - merge-base == HEAD]: 22 files, +307 -71
  by package: apps/pollicino_viewer=18, (root)=3, apps/tomcat_portal=1
  top churn:
    widgets/feature_properties_section.dart +47 -35
    widgets/waypoint_list_tile.dart +27 -5
    widgets/feature_tile.dart +17 -11
    scripts/dart-format-flush.sh +21 -0
    widgets/editable_polygon_vertex_tile.dart +16 -4
  vs transcript Edit/Write: 22 paths; in diff but not edited by tools: 0; edited by tools but not in diff: 0; outside repo: 4
  untracked: n/a(replay)
```

## Casi richiesti

| Caso | Cosa succede (verificato) | Trattamento |
|---|---|---|
| Commit a meta sessione | Con ancora = HEAD a inizio sessione, `git diff <ancora>` copre commit e working tree insieme. Con merge-base funziona solo se si e ancora sul branch. | Ancora per timestamp/`commit_hash`. |
| Working tree sporca | Coperta da `git diff <ancora>` (tracciati). **I file nuovi non tracciati non compaiono**: con un solo file non tracciato `git diff --merge-base develop --shortstat` stampa **niente** ed esce 0 (provato). E il silenzio scambiabile per "nessuna modifica". | Aggiungere i `??` del `git status --porcelain` gia eseguito, con conteggio esplicito. |
| Dopo il merge in develop (uso documentato di retro: "a fine `issue-dev`, dopo il merge in `develop`") | `git merge-base develop HEAD` e uguale a HEAD: il diff dal merge-base e **vuoto proprio quando retro gira**. Verificato su merge reali: l'ancora per timestamp restituisce lo stesso commit del merge-base pre-merge in 3 casi su 3. | Ancora per timestamp, non merge-base. Il merge-base resta solo come fallback prima del merge. |
| Branch senza merge-base evidente | `git merge-base A B` senza antenato comune: nessun output, exit 1; `git diff --merge-base <rev>` fallisce con `fatal: no merge base found`, exit 128. Ref inesistente: exit 128. | Segnalare `NON RICAVABILE`; non indovinare un base branch. |
| Quale branch base | Il remote HEAD non e affidabile: in questo repo `origin/HEAD` e `origin/master`, ma i feature branch nascono da `develop` (alias `git start`: `BASE="develop"`). Nel monorepo `origin/HEAD` e `origin/develop`. | Se serve il merge-base: prova `develop`, `origin/develop`, `main`, `master`, poi `@{upstream}`; mai `origin/HEAD` per primo; dichiarare quale ha scelto. |
| Monorepo Melos | `git diff` da una sottodirectory stampa comunque i path relativi al toplevel (verificato da `apps/tomcat_portal`); `rev-parse --show-prefix` dice dove si e. I package si raggruppano con il piu vicino `pubspec.yaml` (`git ls-tree -r --name-only HEAD`, filtro `pubspec.yaml`). | Una riga "by package", non l'elenco file. |
| File fuori dal repo | Visibili solo dal transcript. Sono tutt'altro che rari: 4 su 22 nella sessione di `feature/1362_composition_layer_test_keys` (plan in `~/.claude/plans`, script scratch in `%TEMP%`, 2 file di memoria nativa). Git non li vede per costruzione. | Riga separata "fuori repo: N" col conteggio; non confonderli con file del progetto. |
| Sessione compattata | In-file (`compact_boundary`): i record Edit/Write precedenti restano nel transcript, il diff git non e toccato. Con `continued-in`: una parte dei record e in un altro file. | Il diff git e immune; la parte transcript va dichiarata parziale se c'e `continued-in`. |
| Cwd diverso dal root | I record Claude hanno `cwd` fisso per sessione; Codex ha `session_meta.cwd`. `process.cwd()` del comando retro puo essere un'altra directory (subagent in worktree: `cwd` = worktree). Fuori da un repo `git diff` non da errore chiaro: stampa un avviso di `--no-index` e un testo di usage; `git rev-parse --show-toplevel` esce con `fatal: not a git repository`, exit 128. | Usare `git -C <cwd del transcript>`; verificare prima con `rev-parse --show-toplevel`. Se fallisce: `NON RICAVABILE (non e un repo git)`. |
| Subagent | Edit/Write dei subagent in file separati sotto `<sessionId>/subagents/`; in un worktree il path e fuori dal root del repo principale. | La parte git li include se il worktree e lo stesso repo; la parte transcript deve leggere anche quella directory o dichiararsi parziale. |
| Codex | Ancora esatta da `session_meta.git.commit_hash`; patch non estraibili dal parser attuale. | Git come fonte; transcript solo come controllo, dopo aver corretto il parser (vedi punti aperti). |

## Raccomandazione

### Procedura (ordine di preferenza)

1. **Repo**: `git -C <cwd> rev-parse --show-toplevel`. `<cwd>` = campo `cwd` del transcript (Claude) o `session_meta.cwd` (Codex), non `process.cwd()`. Fallisce -> vai al fallback.
2. **Ancora**:
   - Codex: `session_meta.git.commit_hash`, se presente e `git cat-file -e` lo conferma.
   - Claude: `git rev-list -n1 --before=<primo timestamp del transcript> HEAD`.
   - Se entrambe mancano e HEAD non coincide col merge-base: `git merge-base <base> HEAD` con la lista di base sopra.
   - Se nessuna ancora e ricavabile: fallback.
3. **Diff**: `git diff --numstat -z <ancora>` (ancora -> working tree). Da qui totale file, `+`/`-`, righe per package (nearest `pubspec.yaml`), i 5 file col churn maggiore, in coda "(+N altri)" se tagliati.
4. **Non tracciati**: conteggio dei `??` dall'output di `git status --porcelain` del Passo 0. Nessun comando in piu.
5. **Controllo incrociato col transcript**: path Edit/Write con `tool_result` riuscito (accoppiare `tool_use_id`, escludere `is_error`), normalizzati rispetto al toplevel. Una riga: "N path da strumenti; in diff ma non da strumenti: X; da strumenti ma non in diff: Y; fuori repo: Z".

### Costo e dove sta

- Output: 8-10 righe, fisse, con un tetto proprio di 12 righe (`SESSION_DIFF_LINE_CAP`, sul modello di `CONFIG_AUDIT_LINE_CAP`): non va dentro lo slice a `OUTPUT_LINE_CAP` = 40, altrimenti verrebbe tagliato proprio quando serve. Troncamento sempre visibile, mai silenzioso.
- Esecuzione: ~250 ms misurati (transcript da 1000-1700 eventi + 3-4 comandi git). Comandi git: `rev-parse`, `rev-list`, `diff --numstat -z`, `ls-tree`; i `??` vengono dal Passo 0.
- Dove: dentro `session-evidence.js`, che ha gia timestamp, `cwd` e path Edit/Write. Il nuovo blocco e **acceso di default per retro** (a differenza di `--config-audit`, che retro non deve mai passare).

### Cosa il blocco puo dire e cosa no

Dice: "N file, +A -D dall'ancora X, per package, i piu cambiati". Non dice "la sessione ha scritto questi file": include commit di altre sessioni sul branch, file generati e modifiche da shell. La riga di controllo incrociato esiste per rendere quel limite leggibile, non per nasconderlo.

### Modalita di fallimento dichiarate

| Modalita | Segnale | Effetto | Mitigazione |
|---|---|---|---|
| Altre sessioni/utenti committano sullo stesso branch durante la sessione | "in diff ma non da strumenti: X" alto (precisione p10 0,24 nel campione) | Il diff sovrastima il lavoro della sessione | Etichettare, non filtrare; mai attribuire |
| Commit con data del committer alterata (rebase, amend) prima/durante la sessione | `rev-list --before` restituisce un antenato troppo vecchio o troppo recente | Diff piu largo o piu stretto | Confrontare con la riga di controllo; se i path "solo transcript" sono molti, segnalare ancora dubbia |
| Sessione iniziata su un branch non legato a quello corrente | Ancora in un'altra storia | Diff enorme o vuoto | Dichiarare `ancora: <hash> (<branch a inizio sessione>, dal campo gitBranch)` cosi si vede |
| Orologio sfasato / timestamp mancanti | `--before` non ricavabile | Nessuna ancora per timestamp | Prova merge-base; poi fallback |
| File non tracciati | Conteggio `??` | `git diff` non li include | Riga `untracked: N`, vedi sopra |
| Modifiche fuori repo | Contate dal transcript | Invisibili a git | Riga separata |
| Subagent, `continued-in`, Bash | Directory `subagents/` esiste; record `continued-in`; comandi shell mutanti | Il controllo incrociato e parziale | Dichiararlo nella riga stessa |
| Repo non git, o `cwd` non e un repo | `rev-parse` esce 128 | Nessun diff | Fallback |
| Merge-base inesistente (storie non correlate) | exit 1 / `no merge base found` | Nessun diff dal merge-base | Fallback |
| Rollout Codex senza `git` (cwd fuori da un repo al lancio) | `session_meta.git` assente | Nessuna ancora esatta | Ancora per timestamp, se c'e un repo ora; altrimenti fallback |

### Fallback quando il diff non e ricavabile

Mai "nessuna modifica" per assenza di dati. Formato fisso:

```
session diff: NON RICAVABILE (<motivo: non e un repo git | nessuna ancora | merge-base assente | git assente>)
  path dagli strumenti (solo transcript, PARZIALE: esclude shell, subagent non letti, sessioni continuate): N
    <fino a 8 path, poi "(+M altri)">
  fuori repo: Z
```

Se anche il transcript non ha path: `session diff: NON VERIFICATO (nessuna ancora, nessun record Edit/Write)`. "Nessuna modifica" si puo scrivere solo se tutte e quattro valgono: ancora verificata, `git diff --numstat` vuoto, nessun file non tracciato, nessun Edit/Write riuscito nel transcript; e anche allora con la dicitura "nessuna modifica ai file tracciati dall'ancora X". Il caso `git diff` vuoto + un file non tracciato (provato) deve dare `1 non tracciato`, non zero.

## Punti aperti e cose da non dare per scontate

- Le misure di precisione/recall usano il transcript Edit/Write come riferimento, che ha le blind spot sopra; sono ordini di grandezza, non verita.
- Il formato di `file-history-*`, `compact_boundary`, `continued-in`, `toolUseResult` e di `session_meta`/`custom_tool_call` e interno e cambia tra versioni (Codex 0.153.4 vs 0.162.0 nel campione). Il codice che li legge deve degradare in `NON VERIFICATO`, come fa gia `codex-transcript.js` con il contatore `unsupported`.
- Sessioni su Windows con path con `\\` e case-insensitive: i confronti path transcript-git vanno normalizzati (separatori, case) prima di intersecare.
- Per Codex il parser attuale non estrae i path dalle chiamate `exec`+`tools.apply_patch("...")`: da correggere nel ticket di build, non qui (questo ticket non modifica `skills/`).
- Non verificato: Codex con worktree git, rollout senza `git` nel meta in un repo con `safe.directory`, e `git diff` su submodule.
- Non coperto: sessioni di piu transcript o sessioni passate (voce "Not yet specified" della mappa).
