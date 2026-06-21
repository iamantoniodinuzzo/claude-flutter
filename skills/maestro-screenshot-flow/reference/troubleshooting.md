# Troubleshooting

## Problema porta 7001 — `TimeoutException at TcpForwarder`

### Sintomo

```
java.util.concurrent.TimeoutException at TcpForwarder.waitFor
```

### Causa

Maestro usa la porta 7001 per comunicare con il driver sull'emulatore. Se è già occupata
(sessione Maestro Studio residua, `adb forward` manuale precedente) il timeout scatta.

### Fix — PowerShell (Windows)

```powershell
# Script pronto: fix-port-7001.ps1
# Eseguire dalla root del progetto:
pwsh skills/maestro-screenshot-flow/scripts/fix-port-7001.ps1
```

Il script esegue in sequenza:
1. Killa il processo che occupa la porta 7001
2. `adb forward --remove-all`
3. `adb kill-server` + `adb start-server`

### Problema correlato — "Unable to launch app"

Se appare questo errore ma l'app è installata (`adb shell pm list packages | grep <appId>` mostra l'app),
è sempre un problema di porta 7001. Applica il fix sopra.

**Non fare mai `adb forward` manuale prima di `maestro test`.**

---

## `clearState: true` — obbligatorio

Se l'utente è già loggato, `clearState: false` non pulisce la sessione Firebase — l'app parte
dalla home e il flow login fallisce.

**Usa sempre `clearState: true`.**

---

## Screenshot di debug ritardata

Quando un'asserzione fallisce, Maestro prende la screenshot **dopo** il fallimento.
La screenshot può mostrare l'elemento cercato mentre il log dice "not found".

**Interpretazione corretta**: l'elemento è apparso *tra* l'istante dell'assert e quello della screenshot.
Causa quasi sempre: animazione non finita, rete lenta.

**Fix**:
```yaml
# Aggiungi waitForAnimationToEnd prima dell'assert:
- waitForAnimationToEnd
- assertVisible:
    id: "<element_id>"

# Oppure usa extendedWaitUntil con timeout adeguato:
- extendedWaitUntil:
    visible:
      id: "<element_id>"
    timeout: 15000
```

Le screenshot di debug sono in:
```
C:\Users\<user>\.maestro\tests\<timestamp>\screenshot-❌-<stepname>.png
```

---

## Target non trovato nell'accessibility tree

Vedi il decision tree completo in [`reference/selectors.md`](selectors.md).

Quick check:

```bash
# Ispeziona cosa vede Maestro
bash skills/maestro-screenshot-flow/scripts/maestro-hierarchy.sh [<query>]
```

Cause frequenti:
- Widget senza `Semantics(identifier:)` → aggiungilo
- Ancestor che merge semantics (ListTile, InkWell+Icon+Text, nav rail) → `explicitChildNodes: true` o identifier sull'ancestor
- `ExcludeSemantics` / `BlockSemantics` → rimuovi o scegli sibling

---

## `maestro hierarchy` — ispezione accessibility tree

Lancia il dump del view tree sul device connesso:

```bash
maestro hierarchy
# Con filtro substring:
bash skills/maestro-screenshot-flow/scripts/maestro-hierarchy.sh <query>
```

Utile per:
- Verificare quali id sono esposti dopo aver aggiunto `Semantics(identifier:)`
- Trovare l'ancestor che merge un target
- Capire la struttura reale dell'albero prima di scrivere il flow

---

## Caratteri speciali nelle regex (legacy `text:`)

Se per qualche motivo `text:` deve essere usato (sconsigliato), Maestro tratta il testo come regex Java.

| Carattere | Escape YAML |
|---|---|
| `?` | `\\?` |
| `.` | `\\.` |
| `(` `)` | `\\(` `\\)` |

```yaml
# SBAGLIATO
- tapOn:
    text: "Don't have an account? Register"

# CORRETTO (se text: è inevitabile)
- tapOn:
    text: "Don't have an account\\? Register"
```
