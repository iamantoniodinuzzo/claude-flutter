# Commands — full Maestro command surface

Tutti gli esempi usano **`id:`** (Semantics identifier). `text:` è vietato.

---

## Tap variants

```yaml
# Tap standard
- tapOn:
    id: "auth_sign_in_button"

# Long press
- longPressOn:
    id: "booking_card_item"

# Double tap
- doubleTapOn:
    id: "map_zoom_area"

# Retry tap se l'elemento non risponde (es. durante animazione)
- retryTapIfNoChange:
    id: "auth_sign_in_button"
    maxRetries: 3

# Last resort: coordinate percentuali (documentare perché)
- tapOn:
    point: "10%,13%"
```

---

## Assertions

```yaml
# Elemento visibile nell'accessibility tree
- assertVisible:
    id: "home_profile_tab"

# Elemento non visibile
- assertNotVisible:
    id: "auth_error_banner"

# Condizione booleana (evalScript result)
- assertTrue: ${IS_LOGGED_IN}

# Attesa estesa con visibilità
- extendedWaitUntil:
    visible:
      id: "home_profile_tab"
    timeout: 30000

# Attesa estesa con scomparsa
- extendedWaitUntil:
    notVisible:
      id: "splash_loading_indicator"
    timeout: 15000

# Attendi fine animazioni Flutter prima di assertVisible / takeScreenshot
- waitForAnimationToEnd
```

---

## Scroll / gestures

```yaml
# Scroll verso il basso nella view principale
- scroll

# Scroll fino a rendere visibile un elemento (id-based)
- scrollUntilVisible:
    element:
      id: "booking_submit_button"
    direction: DOWN      # UP | DOWN | LEFT | RIGHT
    timeout: 10000       # ms

# Swipe (direzione relativa allo schermo)
- swipe:
    direction: LEFT      # UP | DOWN | LEFT | RIGHT
    duration: 500        # ms

# Swipe da coordinata a coordinata
- swipe:
    start: "10%,50%"
    end: "90%,50%"

# Torna indietro (Android back button / iOS swipe back)
- back

# Premi un tasto fisico/software
- pressKey: Enter        # Enter | Backspace | Home | Back | VolumeUp | VolumeDown
```

---

## Input / clipboard

```yaml
# Digita testo nel campo focalizzato
- inputText: ${USER_EMAIL}

# Cancella testo nel campo focalizzato
- eraseText

# Copia testo da un elemento nell'accessibility tree
- copyTextFrom:
    id: "confirmation_code_label"

# Incolla dagli appunti
- pasteText

# Input casuale
- inputRandomEmail
- inputRandomText
- inputRandomNumber
- inputRandomPersonName
```

---

## Control flow

```yaml
# Repeat N volte
- repeat:
    times: 3
    commands:
      - tapOn:
          id: "gallery_next_button"
      - waitForAnimationToEnd

# Repeat while condizione (evalScript)
- repeat:
    while:
      notVisible:
        id: "list_end_marker"
    commands:
      - scroll

# runFlow condizionale (esegui solo se elemento visibile)
- runFlow:
    when:
      visible:
        id: "onboarding_skip_button"
    file: skip_onboarding.yaml

# Retry flow in caso di fallimento
- retry:
    maxRetries: 2
    file: 01_login.yaml

# Script JS inline
- runScript: scripts/check-env.js

# Valuta espressione JS e metti in variabile env
- evalScript: ${TIMESTAMP} = new Date().toISOString()
```

---

## Lifecycle / misc

```yaml
# Ferma l'app
- stopApp

# Pulisci stato app (sessione, storage locale)
- clearState

# Pulisci keychain (iOS)
- clearKeychain

# Apri deep link o URL
- openLink: myapp://booking/123

# Imposta posizione GPS
- setLocation:
    lat: 41.9028
    long: 12.4964

# Aggiungi media alla galleria
- addMedia: path/to/image.jpg
```

---

## Screenshot recipe (pattern obbligatorio)

```yaml
# Per ogni screenshot:
- assertVisible:
    id: "<screen_or_element_id>"
- waitForAnimationToEnd
- takeScreenshot: screenshots/<flow_name>/<nn>_<name>
```

---

## Cold-start pattern

```yaml
- launchApp:
    clearState: true

# extendedWaitUntil copre cold-start (splash nera 10-30s su emulatori lenti)
- extendedWaitUntil:
    visible:
      id: "<first_screen_element_id>"
    timeout: 30000
- waitForAnimationToEnd
- takeScreenshot: screenshots/<flow>/00_<screen_name>
```

---

## `hideKeyboard`

```yaml
- tapOn:
    id: "auth_email_field"
- inputText: ${USER_EMAIL}

- tapOn:
    id: "auth_password_field"
- inputText: ${USER_PASSWORD}

- hideKeyboard    # SEMPRE dopo l'ultimo inputText — prima di tap su altri elementi o screenshot
```

Senza `hideKeyboard`: la tastiera copre elementi sottostanti, fa fallire tap successivi,
e rende screenshot poco leggibili.
