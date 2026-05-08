---
name: maestro-screenshot-flow
description: This skill should be used when the user asks to "create a maestro flow", "write a maestro test", "generate screenshots with maestro", "automate screenshots", or mentions "maestro" in the context of mobile UI testing or screenshot generation for Flutter apps.
version: 1.2.0
---

# Maestro Screenshot Flow

Genera flow YAML di Maestro per screenshot automatizzati di app Flutter Android, con tutte le best practice testate sul campo.

## Prerequisiti da verificare prima di scrivere il flow

### 1. Trova l'appId
```bash
grep -r "applicationId" android/app/build.gradle.kts
# Dev flavor → usa com.example.app.dev
# Prod → usa com.example.app
```

### 2. Trova i label esatti dei campi
```bash
grep -n "labelText\|hintText\|hardcoded" lib/src/features/<feature>/presentation/**/*.dart
```
I `labelText` Flutter sono **esattamente** quelli da usare in `tapOn: text:`.

### 3. Trova il testo dei bottoni e dei link
```bash
grep -n "hardcoded\|Text(" lib/src/features/<feature>/presentation/**/*.dart
```

### 4. Verifica device connesso
```bash
# Usa il path completo di adb su Windows
"/c/Users/<user>/AppData/Local/Android/Sdk/platform-tools/adb" devices
```

### 5. Verifica backend attivo (flavor dev)
Il flavor `.dev` si connette ai Firebase emulators. Senza di essi l'app resta in stato **nero** indefinitamente dopo il launch — nessun flow funzionerà.

```bash
# Avvia gli emulators prima di maestro test
firebase emulators:start --project <project-id> --config apps/<app>/firebase.json --import apps/<app>/seed/data

# In alternativa, usa il flavor prod (appId senza .dev) se disponibile
```

---

## Struttura cartelle `.maestro/`

```
apps/<app_name>/
├── .maestro/
│   ├── config.yaml            ← configurazione suite: ordine, tag, output dir
│   ├── 00_all_flows.yaml      ← flow master: chiama tutti i subflow via runFlow
│   ├── 01_login.yaml
│   ├── 02_register_pilot.yaml
│   └── 03_register_aeroclub.yaml
│
└── screenshots/               ← screenshot generati (creati da Maestro, ignorati da git)
    ├── login/
    │   ├── 00_sign_in_screen.png
    │   └── ...
    ├── register_pilot/
    │   └── ...
    └── register_aeroclub/
        └── ...
```

Gli screenshot vengono salvati in `apps/<app_name>/screenshots/<flow_name>/` (relativo alla CWD dove viene eseguito `maestro test`). Maestro crea automaticamente le sottocartelle.

---

## `config.yaml` — configurazione della suite

Il file `config.yaml` dentro `.maestro/` controlla il comportamento di `maestro test .maestro/`:

```yaml
# .maestro/config.yaml
executionOrder:
  continueOnFailure: false   # interrompe la suite al primo fallimento
  flowsOrder:
    - 01_login               # nome file senza estensione
    - 02_register_pilot
    - 03_register_aeroclub

excludeTags:
  - all                      # esclude il flow master (tagged "all") dalla run della cartella
```

**Chiave**: `excludeTags: - all` evita che `00_all_flows.yaml` venga eseguito ANCHE quando si lancia `maestro test .maestro/`, che causerebbe una doppia esecuzione di ogni flow. Il master va eseguito esplicitamente.

Altre opzioni supportate da `config.yaml`:
```yaml
testOutputDir: test_output/   # artefatti del report HTML/JSON (diverso da takeScreenshot)
includeTags:
  - tagName
flows:
  - "**"                      # include flow in sottocartelle (default: solo top-level)
```

---

## Template flow — pattern obbligatori

```yaml
appId: com.example.app.dev
name: "Nome Flow"
tags:
  - screenshots
env:
  USER_EMAIL: "test@example.com"
  USER_PASSWORD: "password123"
---
- launchApp:
    clearState: true        # SEMPRE true — pulisce sessione Firebase

# Pattern post-launch: usa extendedWaitUntil, NON assertVisible immediato.
# clearState: true fa un cold-start — Firebase deve inizializzare, la splash
# screen nera può durare 10-30s su emulatori lenti. assertVisible scade in ~5s.
- extendedWaitUntil:
    visible: "Testo visibile sulla schermata"
    timeout: 30000          # 30s — copre cold-start su qualsiasi emulatore

# Pattern obbligatorio per ogni screenshot successivo:
# 1. assertVisible  → attende che l'elemento sia nell'albero accessibilità
# 2. waitForAnimationToEnd → attende che Flutter finisca di renderizzare
# 3. takeScreenshot → cattura l'immagine pulita (path relativo alla CWD)
- waitForAnimationToEnd
- takeScreenshot: screenshots/<flow_name>/00_nome_schermata

# Dopo ogni inputText che apre la tastiera:
- tapOn:
    text: "Label campo"
- inputText: ${VARIABILE}
- hideKeyboard              # SEMPRE prima di: screenshot, tap su altri campi, scroll
```

---

## Template flow master (`00_all_flows.yaml`)

Il flow master chiama i flow individuali via `runFlow`. I path sono **relativi al file chiamante** (non alla CWD), quindi da `.maestro/00_all_flows.yaml` il path `01_login.yaml` risolve correttamente a `.maestro/01_login.yaml`.

Le env passate nel blocco `runFlow` sovrascrivono quelle definite nell'header del subflow.

```yaml
appId: com.example.app.dev
name: "All Flows - Full Screenshot Suite"
tags:
  - all                     # tag "all" → escluso da maestro test .maestro/ via config.yaml
---
# Flow 1: Login
- runFlow:
    file: 01_login.yaml
    env:
      USER_EMAIL: "marco@example.com"
      USER_PASSWORD: "12121212"

# Flow 2: Register - Pilot
- runFlow:
    file: 02_register_pilot.yaml
    env:
      FULL_NAME: "Mario Rossi"
      USER_EMAIL: "mario@example.com"
      USER_PHONE: "3331234567"
      USER_PASSWORD: "12121212"

# Flow 3: Register - Aeroclub Manager
- runFlow:
    file: 03_register_aeroclub.yaml
    env:
      FULL_NAME: "Mario Manager"
      USER_EMAIL: "manager@example.com"
      USER_PHONE: "3339876543"
      USER_PASSWORD: "12121212"
      AEROCLUB_NAME: "Aeroclub Test"
```

**Altre forme di `runFlow`** (dalla doc ufficiale):

```yaml
# Forma breve (solo file, env dall'header del subflow)
- runFlow: Login.yaml

# Con condizione (esegue solo se l'elemento è visibile)
- runFlow:
    when:
      visible: "Some Text"
    file: folder/some-flow.yaml

# Inline (comandi senza file separato)
- runFlow:
    env:
      INNER_ENV: "valore"
    commands:
      - inputText: ${INNER_ENV}
```

---

## Regole critiche per i selettori

### Caratteri speciali nelle regex
Maestro tratta il testo come **regex Java**. Questi caratteri vanno escapati con `\\`:

| Carattere | Escape YAML | Quando appare |
|-----------|-------------|---------------|
| `?` | `\\?` | "Don't have an account? Register" |
| `.` | `\\.` | raramente nei label |
| `(` `)` | `\\(` `\\)` | raramente |

```yaml
# SBAGLIATO — "?" è quantificatore regex, non matcha il testo letterale
- tapOn:
    text: "Don't have an account? Register"

# CORRETTO
- tapOn:
    text: "Don't have an account\\? Register"
```

### Testo non accessibile a Maestro
Alcuni widget Flutter **non espongono testo** all'albero di accessibilità:
- `AppText` con `.hardcoded` senza `Semantics` wrapper → **non assertabile**
- `RichText` / `TextSpan` composti → può non matchare il testo completo
- `InkWell` con semantics merged (es. navigation rail con Icon + Text) → il testo non è selezionabile per regex ma è visibile nella screenshot
- **Dialog / BottomSheet title**: `Text('Titolo')` dentro un dialog o bottom sheet spesso non è nell'albero accessibilità Flutter → `assertVisible` fallisce anche se la UI è visibile. Per questi casi, **non assertare il titolo**: usa `waitForAnimationToEnd` + `takeScreenshot`. La screenshot è prova sufficiente che il dialog è aperto.

```yaml
# SBAGLIATO — il titolo del dialog non è assertabile
- tapOn:
    text: "New booking"
- assertVisible: "New Booking"    # ← FALLISCE anche se visibile

# CORRETTO — skip dell'asserzione, screenshot come prova
- tapOn:
    text: "New booking"
- waitForAnimationToEnd
- takeScreenshot: screenshots/feature/02_create_form
```

**Fix**: per elementi non selezionabili per testo, usa `tapOn: point:` con coordinate percentuali:

```yaml
# tapOn: text: "Club Administration"  ← FALLISCE se l'elemento usa InkWell merged semantics
# Usa coordinate percentuali basate sulla posizione visiva nella screenshot
- tapOn:
    point: "10%,13%"   # 10% da sinistra, 13% dall'alto
- assertVisible: "Club Administration"   # l'assertVisible funziona perché l'AppBar ha testo diretto
```

Come trovare le coordinate: guarda la screenshot di debug in `C:\Users\<user>\.maestro\tests\<timestamp>\screenshot-❌-...png` e stima la posizione percentuale dell'elemento. Le percentuali sono relative alle dimensioni dello schermo del device.

### La screenshot di debug è ritardata rispetto al fallimento

Quando un'asserzione fallisce, Maestro prende la screenshot **dopo** aver registrato il fallimento, non nel momento esatto dell'assert. Questo crea un'apparente contraddizione: la screenshot può mostrare l'elemento cercato mentre il log dice "not found".

**Interpretazione corretta**: l'elemento è apparso **tra** l'istante dell'assert e l'istante della screenshot. La causa è quasi sempre il timing (animazione non finita, rete lenta). Fix: aggiungi `waitForAnimationToEnd` prima dell'assert, oppure usa `extendedWaitUntil` con un timeout adeguato.

### La UI per ruolo diverso può essere completamente diversa

Prima di scrivere i passi di un flow per un ruolo specifico, **esplora sempre lo screenshot del primo step** per capire la struttura UI effettiva. Non assumere che due ruoli che accedono alla stessa feature vedano gli stessi widget.

Esempio: booking screen per pilot ha un segmented button `"Day"` / `"All bookings"`; booking screen per manager ha un layout fisso calendario+Gantt con un toggle `"Week"` diverso. I passi non sono intercambiabili.

### `hideKeyboard` è obbligatorio
Dopo `inputText`, la tastiera rimane aperta e può:
1. Coprire elementi sottostanti (il `tapOn` seguente fallisce)
2. Rendere lo screenshot poco leggibile
3. Far fallire `assertVisible` su elementi sotto la tastiera

**Regola**: `hideKeyboard` va messo **sempre** dopo l'ultimo `inputText` di un gruppo, prima di tappare altri elementi o fare screenshot.

---

## Problema `clearState: false`
Se l'utente è già loggato, `clearState: false` non pulisce la sessione Firebase — l'app parte direttamente dalla home. **Usa sempre `clearState: true`**.

---

## Problemi di connessione ADB / porta 7001

### Sintomo
```
java.util.concurrent.TimeoutException at TcpForwarder.waitFor
```

### Causa
Maestro usa la porta 7001 per comunicare con il driver sull'emulatore. Se è già occupata (da una sessione precedente di Maestro Studio o da un `adb forward` manuale) il timeout scatta.

### Fix
```bash
# 1. NON fare mai adb forward manuale prima di maestro test
# 2. Se c'è un processo Maestro residuo, killalo:
powershell.exe -Command "Get-NetTCPConnection -LocalPort 7001 | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }"

# 3. Pulisci tutti i forward ADB
"/c/Users/<user>/AppData/Local/Android/Sdk/platform-tools/adb" forward --remove-all

# 4. Riavvia ADB server
"/c/Users/<user>/AppData/Local/Android/Sdk/platform-tools/adb" kill-server
"/c/Users/<user>/AppData/Local/Android/Sdk/platform-tools/adb" start-server
```

### Problema "Unable to launch app"
Se appare questo errore ma `adb shell pm list packages | grep <appId>` mostra l'app installata, è sempre un problema di porta 7001. Applica il fix sopra.

---

## Eseguire i flow

```bash
# Sempre dal percorso dell'app (gli screenshot finiscono in screenshots/<flow>/)
export PATH="$PATH:$HOME/.maestro/bin"
cd apps/<app_name>

# OPZIONE A — Suite via cartella (CONSIGLIATO per uso quotidiano)
# config.yaml gestisce l'ordine e esclude il flow master via excludeTags
maestro test .maestro/

# OPZIONE B — Flow master esplicito (utile per passare env custom o debug)
maestro test .maestro/00_all_flows.yaml

# Singolo flow (sviluppo/debug di un singolo percorso)
maestro test .maestro/01_login.yaml

# Filtrare per tag da CLI
maestro test --include-tags=screenshots .maestro/
maestro test --exclude-tags=all .maestro/   # equivalente all'opzione A
```

**Struttura screenshot risultante** (nella root `apps/<app_name>/`):
```
screenshots/
├── login/
│   ├── 00_sign_in_screen.png
│   ├── 01_credentials_filled.png
│   └── 02_home_after_login.png
├── register_pilot/
│   ├── 00_sign_in_screen.png
│   ├── 01_registration_screen_empty.png
│   └── ...
└── register_aeroclub/
    └── ...
```

---

## Esempio completo: flow login

```yaml
appId: com.engage.tomcat_portal.dev
name: "Login"
tags:
  - auth
  - screenshots
env:
  USER_EMAIL: "marco@aurelio.com"
  USER_PASSWORD: "12121212"
---
- launchApp:
    clearState: true

# extendedWaitUntil per il cold-start: la splash screen può durare 10-30s
- extendedWaitUntil:
    visible: "Sign in to continue"
    timeout: 30000
- waitForAnimationToEnd
- takeScreenshot: screenshots/login/00_sign_in_screen

- tapOn:
    text: "Email"
- inputText: ${USER_EMAIL}

- tapOn:
    text: "Password"
- inputText: ${USER_PASSWORD}
- hideKeyboard
- waitForAnimationToEnd
- takeScreenshot: screenshots/login/01_credentials_filled

- tapOn:
    text: "Sign In"

- assertVisible: "Profile & Settings"
- waitForAnimationToEnd
- takeScreenshot: screenshots/login/02_home_after_login
```

## Esempio completo: flow registrazione con link speciali

```yaml
appId: com.engage.tomcat_portal.dev
name: "Register - Pilot"
tags:
  - auth
  - screenshots
env:
  FULL_NAME: "Mario Rossi"
  USER_EMAIL: "mario@test.com"
  USER_PHONE: "3331234567"
  USER_PASSWORD: "password123"
---
- launchApp:
    clearState: true

- extendedWaitUntil:
    visible: "Sign in to continue"
    timeout: 30000
- waitForAnimationToEnd
- takeScreenshot: screenshots/register_pilot/00_sign_in_screen

# "?" va escapato come \\? nelle stringhe YAML con doppi apici
- tapOn:
    text: "Don't have an account\\? Register"

- assertVisible: "Create your account"
- waitForAnimationToEnd
- takeScreenshot: screenshots/register_pilot/01_registration_screen_empty

- tapOn:
    text: "Full name"
- inputText: ${FULL_NAME}

- tapOn:
    text: "Email"
- inputText: ${USER_EMAIL}

- tapOn:
    text: "Phone Number"
- inputText: ${USER_PHONE}

# hideKeyboard PRIMA di tappare Password (campo potenzialmente fuori schermo)
- hideKeyboard

- tapOn:
    text: "Password"
- inputText: ${USER_PASSWORD}

- tapOn:
    text: "Confirm password"
- inputText: ${USER_PASSWORD}
- hideKeyboard
- waitForAnimationToEnd
- takeScreenshot: screenshots/register_pilot/02_form_filled

- tapOn:
    text: "Register & Verify"

- assertVisible: "Verify your email"
- waitForAnimationToEnd
- takeScreenshot: screenshots/register_pilot/03_email_verification
```
