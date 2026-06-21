# Suite config — `.maestro/` folder, config.yaml, master flow

## Struttura cartelle

```
apps/<app_name>/
├── .maestro/
│   ├── config.yaml            ← configurazione suite: ordine, tag, output dir
│   ├── 00_all_flows.yaml      ← flow master: chiama tutti i subflow via runFlow
│   ├── 01_login.yaml
│   ├── 02_register_pilot.yaml
│   └── 03_register_aeroclub.yaml
│
└── screenshots/               ← generati da Maestro (aggiungere a .gitignore)
    ├── login/
    │   ├── 00_sign_in_screen.png
    │   └── ...
    ├── register_pilot/
    └── register_aeroclub/
```

Gli screenshot finiscono in `apps/<app_name>/screenshots/<flow_name>/` — path relativo alla CWD
dove si esegue `maestro test`. Maestro crea le sottocartelle automaticamente.

---

## `config.yaml`

```yaml
# .maestro/config.yaml
executionOrder:
  continueOnFailure: false   # interrompe la suite al primo fallimento
  flowsOrder:
    - 01_login               # nome file senza estensione, nell'ordine desiderato
    - 02_register_pilot
    - 03_register_aeroclub

excludeTags:
  - all                      # esclude 00_all_flows.yaml dalla run della cartella
```

**Chiave**: `excludeTags: - all` evita la doppia esecuzione quando si lancia `maestro test .maestro/`.
Il master va eseguito esplicitamente con `maestro test .maestro/00_all_flows.yaml`.

Opzioni aggiuntive:

```yaml
testOutputDir: test_output/   # artefatti report HTML/JSON (diverso da takeScreenshot)
includeTags:
  - screenshots
flows:
  - "**"                      # include flow in sottocartelle (default: solo top-level)
```

---

## Header flow

```yaml
appId: com.example.app.dev    # Dev flavor → .dev, Prod → senza .dev
name: "Login"
tags:
  - auth
  - screenshots
env:
  USER_EMAIL: "test@example.com"
  USER_PASSWORD: "password123"
---
# Comandi flow qui sotto
```

---

## Flow master (`00_all_flows.yaml`)

Chiama i flow individuali via `runFlow`. I path sono **relativi al file chiamante**
(da `.maestro/00_all_flows.yaml` → `01_login.yaml` risolve a `.maestro/01_login.yaml`).

Le env nel blocco `runFlow` sovrascrivono quelle nell'header del subflow.

```yaml
appId: com.example.app.dev
name: "All Flows - Full Screenshot Suite"
tags:
  - all    # tag "all" → escluso da maestro test .maestro/ via config.yaml
---
- runFlow:
    file: 01_login.yaml
    env:
      USER_EMAIL: "marco@example.com"
      USER_PASSWORD: "12121212"

- runFlow:
    file: 02_register_pilot.yaml
    env:
      FULL_NAME: "Mario Rossi"
      USER_EMAIL: "mario@example.com"
      USER_PHONE: "3331234567"
      USER_PASSWORD: "12121212"

- runFlow:
    file: 03_register_aeroclub.yaml
    env:
      FULL_NAME: "Mario Manager"
      USER_EMAIL: "manager@example.com"
      USER_PHONE: "3339876543"
      USER_PASSWORD: "12121212"
      AEROCLUB_NAME: "Aeroclub Test"
```

---

## Forme di `runFlow`

```yaml
# Forma breve (env dall'header del subflow)
- runFlow: Login.yaml

# Con env override
- runFlow:
    file: 01_login.yaml
    env:
      USER_EMAIL: "custom@example.com"

# Condizionale (esegui solo se elemento visibile)
- runFlow:
    when:
      visible:
        id: "onboarding_skip_button"
    file: skip_onboarding.yaml

# Inline (comandi senza file separato)
- runFlow:
    env:
      INNER_ENV: "valore"
    commands:
      - inputText: ${INNER_ENV}
```

---

## Firebase emulator (flavor dev)

Il flavor `.dev` si connette ai Firebase emulators. Senza di essi l'app resta in stato **nero** indefinitamente dopo il launch — nessun flow funzionerà.

```bash
firebase emulators:start \
  --project <project-id> \
  --config apps/<app>/firebase.json \
  --import apps/<app>/seed/data

# In alternativa: usa il flavor prod (appId senza .dev) se disponibile
```
