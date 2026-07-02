---
name: maestro-screenshot-flow
description: Use when creating Maestro flows for automated screenshots or UI testing on Flutter Android apps. Triggers on: "create a maestro flow", "write a maestro test", "generate screenshots with maestro", "automate screenshots".
user-invocable: true
---

# Maestro Screenshot Flow

Genera flow YAML di Maestro per screenshot automatizzati di app Flutter Android.
Usa selettori **id-only** (`Semantics(identifier:)`) — immune a traduzioni e refactoring.

> **Questo skill modifica anche il sorgente dell'app target** (`lib/…/presentation/…dart`)
> per aggiungere i wrapper `Semantics(identifier:)` / `explicitChildNodes: true` mancanti.

---

## Selector doctrine (id-only)

**Gerarchia selettori — rispettare sempre questo ordine:**

1. **`id:`** — `Semantics(identifier: 'x')` nel sorgente Flutter → `tapOn: id: "x"` / `assertVisible: id: "x"`. Usare per TUTTI i tap e le asserzioni.
2. **`point:` (last resort)** — coordinate percentuali. Solo quando il target è genuinamente non esponibile nell'accessibility tree. Documentare il motivo.

**`text:` è vietato** — rompe con traduzione e rinomina label. Non usarlo mai in tap o assertVisible.

Dettaglio completo → [`reference/selectors.md`](reference/selectors.md)

---

## Prerequisiti

```bash
# Audit interattivi/asserted widget mancanti di Semantics(identifier:)
bash skills/maestro-screenshot-flow/scripts/maestro-audit-ids.sh <feature-path>
# Stampa anche: appId, device connesso, reminder Firebase emulator
```

---

## Pattern obbligatori (sempre attivi)

### Cold-start

```yaml
- launchApp:
    clearState: true        # SEMPRE true — pulisce sessione Firebase

- extendedWaitUntil:
    visible:
      id: "<splash_done_id>"
    timeout: 30000          # 30s — cold-start su emulatori lenti
```

### Screenshot

```yaml
# 1. assertVisible verifica che l'elemento sia nell'accessibility tree
- assertVisible:
    id: "<element_id>"
# 2. waitForAnimationToEnd — Flutter finisce di renderizzare
- waitForAnimationToEnd
# 3. takeScreenshot — cattura immagine pulita
- takeScreenshot: screenshots/<flow_name>/<nn>_<name>
```

### Tastiera

```yaml
- tapOn:
    id: "<field_id>"
- inputText: ${VARIABILE}
- hideKeyboard    # SEMPRE dopo l'ultimo inputText, prima di tap/screenshot
```

---

## Ispezione accessibility tree

```bash
# Lista id/nodi esposti da Maestro sul device connesso
bash skills/maestro-screenshot-flow/scripts/maestro-hierarchy.sh [<query>]
```

Se un target non appare → vedi decision tree in [`reference/selectors.md`](reference/selectors.md).

---

## Run commands

```bash
export PATH="$PATH:$HOME/.maestro/bin"
cd apps/<app_name>

# Suite via cartella (consigliato)
maestro test .maestro/

# Flow master esplicito
maestro test .maestro/00_all_flows.yaml

# Singolo flow (debug)
maestro test .maestro/01_login.yaml

# Filtrare per tag
maestro test --include-tags=screenshots .maestro/
maestro test --exclude-tags=all .maestro/
```

---

## Quando caricare i riferimenti

| Situazione | Riferimento |
|---|---|
| Aggiungere `Semantics`, fixare "not in tree", naming convention id | [`reference/selectors.md`](reference/selectors.md) |
| Comandi Maestro: scroll, swipe, inputRandom, repeat, runScript… | [`reference/commands.md`](reference/commands.md) |
| Struttura `.maestro/`, `config.yaml`, flow master, `runFlow` | [`reference/suite-config.md`](reference/suite-config.md) |
| Porta 7001, `clearState`, debug screenshot ritardata, `maestro hierarchy` | [`reference/troubleshooting.md`](reference/troubleshooting.md) |
| Flow login e registrazione completi con sorgente Semantics annesso | [`reference/examples.md`](reference/examples.md) |
