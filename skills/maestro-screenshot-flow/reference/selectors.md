# Selectors — id-only doctrine

## Selector ladder (rispettare sempre l'ordine)

| Priorità | Selettore | Sintassi Maestro | Quando |
|---|---|---|---|
| 1 | `id:` — Semantics identifier | `tapOn: id: "x"` / `assertVisible: id: "x"` | SEMPRE — default per tutti i tap e asserzioni |
| 2 | `point:` — coordinate percentuali | `tapOn: point: "10%,30%"` | Last resort: target genuinamente non esponibile nell'accessibility tree |

**`text:` è vietato** — rompe con traduzione, rinomina label, e l18n. Non usarlo in tap né in assertVisible.

---

## Come `Semantics(identifier:)` diventa `id:` in Maestro

Flutter 3.19+ (Feb 2024): il widget `Semantics(identifier: 'x')` viene convertito dall'`AccessibilityBridge` Flutter in un accessibility identifier nativo:
- **Android**: resource-id (`com.example.app:id/x`)
- **iOS**: `accessibilityIdentifier`

Maestro lo raggiunge con `tapOn: id: "x"` / `assertVisible: id: "x"`.

> **Keys Flutter NON sono esposti** all'accessibility layer — Maestro non le vede.
> Non usare mai `Key(...)` per selezionare elementi in Maestro; usare `Semantics(identifier:)`.

---

## Naming convention degli identifier

Formato: `<feature>_<elemento>_<ruolo>` — snake_case, inglese, stabile.

```
auth_email_field
auth_password_field
auth_sign_in_button
auth_register_link
home_bookings_tab
booking_date_picker
```

Regole:
- Stabile: non cambia con il testo visualizzato
- Univoco: non riusare lo stesso id in schermate diverse
- Inglese: indipendente dalla lingua dell'UI

---

## Authoring workflow — "non trovo il target nell'albero"

### Step 1 — Ispeziona cosa vede Maestro

```bash
bash skills/maestro-screenshot-flow/scripts/maestro-hierarchy.sh [<query>]
# oppure direttamente:
maestro hierarchy
```

Confronta la lista con il target cercato.

### Step 2 — Decision tree

```
Target visibile in maestro hierarchy?
│
├─ Sì, con id → usalo direttamente: tapOn: id: "<id>"
│
├─ Sì, ma senza id → aggiungi Semantics(identifier:) nel sorgente Flutter
│     └─ vedi "Aggiungere un identifier" sotto
│
├─ No — target assente dall'albero
│   │
│   ├─ Causa: ancestor merges semantics (MergeSemantics, ListTile, InkWell+Icon+Text, nav-rail)
│   │   └─ Due opzioni:
│   │       A) Aggiungi explicitChildNodes: true sull'ancestor → i figli diventano nodi distinti
│   │       B) Metti l'identifier sull'ancestor merged e tappa quello
│   │
│   ├─ Causa: ExcludeSemantics / BlockSemantics → il nodo è rimosso intenzionalmente
│   │   └─ Scegli un sibling accessibile, oppure rimuovi l'exclusion se è un bug
│   │
│   └─ Target genuinamente non esponibile → point: fallback (documentare perché)
│
└─ Non sicuro → aggiungi explicitChildNodes: true sul parent più vicino e reinspeziona
```

### Aggiungere un identifier (nessun id presente)

```dart
// Prima
ElevatedButton(
  onPressed: _signIn,
  child: const Text('Sign In'),
)

// Dopo
Semantics(
  identifier: 'auth_sign_in_button',
  child: ElevatedButton(
    onPressed: _signIn,
    child: const Text('Sign In'),
  ),
)
```

### Fixare un ancestor che merge semantics

```dart
// ListTile con Icon + Text: il testo non è individualmente selezionabile
ListTile(
  leading: const Icon(Icons.admin_panel_settings),
  title: const Text('Club Administration'),
  onTap: _onAdminTap,
)

// Opzione A — explicitChildNodes: true mantiene i figli come nodi distinti
Semantics(
  explicitChildNodes: true,
  child: ListTile(
    leading: Semantics(
      identifier: 'nav_admin_icon',
      child: const Icon(Icons.admin_panel_settings),
    ),
    title: Semantics(
      identifier: 'nav_admin_label',
      child: const Text('Club Administration'),
    ),
    onTap: _onAdminTap,
  ),
)

// Opzione B — identifier sull'ancestor: tappa il tile intero
Semantics(
  identifier: 'nav_admin_tile',
  child: ListTile(
    leading: const Icon(Icons.admin_panel_settings),
    title: const Text('Club Administration'),
    onTap: _onAdminTap,
  ),
)
```

Culprits comuni (ancestors che merge semantics):
- `MergeSemantics` — explicit merge node
- `ListTile` — merge icon + label
- `InkWell` wrapping `Row(Icon + Text)` — merge figli
- Navigation rail items — merge label + icon
- `Checkbox` / `Switch` con label → la label sparisce

---

## Dialog e BottomSheet

I titoli di dialog/bottom-sheet spesso non sono nell'accessibility tree Flutter.

**Non assertare il titolo per text** — usa invece un id sul dialog container o un elemento figlio stabile, oppure salta l'asserzione e cattura una screenshot come prova:

```yaml
# NON fare:
- assertVisible: "New Booking"   # fallisce anche se visibile

# FARE — id sul titolo se esposto:
- assertVisible:
    id: "booking_dialog_title"

# OPPURE — skip asserzione, screenshot come prova:
- waitForAnimationToEnd
- takeScreenshot: screenshots/feature/02_booking_dialog
```

---

## `point:` fallback (last resort)

Usare SOLO quando il target è genuinamente non esponibile nell'accessibility tree e non è possibile modificare il sorgente.

```yaml
- tapOn:
    point: "10%,13%"   # 10% da sinistra, 13% dall'alto — relativo alle dimensioni schermo
```

Come trovare le coordinate: apri la screenshot di debug in
`C:\Users\<user>\.maestro\tests\<timestamp>\screenshot-❌-…png` e stima la posizione
percentuale dell'elemento. Le percentuali variano con la dimensione dello schermo del device —
**device-bound: non portabile**.

Documentare sempre perché `point:` è stato usato (commento nel flow YAML).

---

## Per-role UI divergence

Prima di scrivere i passi di un flow per un ruolo specifico, ispeziona sempre la screenshot del primo step. Non assumere che due ruoli che accedono alla stessa feature abbiano gli stessi widget o gli stessi identifier.

Esempio: booking screen pilot ha `booking_day_tab` / `booking_all_tab`; booking screen manager ha `booking_week_toggle` su un layout calendario+Gantt. I passi non sono intercambiabili.

---

## Screenshot debug ritardata

Quando un'asserzione fallisce, Maestro prende la screenshot **dopo** il fallimento — non nell'istante esatto dell'assert. La screenshot può mostrare l'elemento mentre il log dice "not found": l'elemento è apparso tra l'assert e lo screenshot.

Causa quasi sempre: animazione non finita, rete lenta. Fix: `waitForAnimationToEnd` prima dell'assert, o `extendedWaitUntil` con timeout adeguato.
