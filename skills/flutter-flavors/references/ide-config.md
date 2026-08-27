# IDE configuration — VSCode and Android Studio

## VSCode — `.vscode/launch.json`

### Generating via flavorizr

```bash
dart run flutter_flavorizr -f -p ide:config
```

Reads the `flavorizr:` pubspec block and produces one configuration per flavor × build-mode (3
flavors × {Debug, Profile, Release} = 9 entries for the default 3-flavor setup). **Output is
minified JSON on one line** — reformat immediately:

```bash
jq '.' .vscode/launch.json > .vscode/formatted_launch.json && mv .vscode/formatted_launch.json .vscode/launch.json
```

If `jq` isn't installed, reformat by hand or install it first
([jqlang.github.io/jq/download](https://jqlang.github.io/jq/download/)) — an unformatted
`launch.json` is unreviewable and any manual patch after it will produce an unreadable diff.

### What needs patching after generation

The generated configs always point `program` at `lib/main.dart` and never include `WEB_FLAVOR` —
both need a manual pass:

```json
{
  "name": "dev Debug",
  "request": "launch",
  "type": "dart",
  "flutterMode": "debug",
  "args": ["--flavor", "dev", "--dart-define", "WEB_FLAVOR=dev"],
  "program": "lib/main_dev.dart"
}
```

- `program`: only needs changing if multiple entry points are in scope (Phase 1) — set it to
  `lib/main_<flavor>.dart` for every configuration of that flavor. If the project uses a single
  `main.dart`, leave `program` alone.
- `--dart-define WEB_FLAVOR=<flavor>` in `args`: only add if web is in scope (Phase 1). Harmless
  to include even on mobile-only runs (ignored there), but don't add it if web was explicitly
  ruled out — keep the config matching what was actually chosen.

Every one of the `<flavor count> × 3` configurations needs this pass — a common mistake is
patching only the first flavor's Debug config and leaving the rest pointing at `lib/main.dart`
(`FLAVOR-IDE-01`).

### Manual creation (no flavorizr)

Same target shape as above — write the `configurations` array directly if flavorizr isn't in use
for this project. There's no manual shortcut; write out all N configurations.

## Android Studio — `.idea/runConfigurations/`

### Default state (no flavors)

A fresh project has exactly one run configuration, `main_dart.xml`:

```xml
<component name="ProjectRunConfigurationManager">
  <configuration default="false" name="main.dart" type="FlutterRunConfigurationType" factoryName="Flutter">
    <option name="filePath" value="$PROJECT_DIR$/lib/main.dart" />
    <method />
  </configuration>
</component>
```

### Generating via flavorizr (Debug only)

Set `ide: "idea"` in the `flavorizr:` pubspec block (this is a separate setting from `ide:
"vscode"` — switching it changes which `ide:config` output format gets generated; a project
targeting both IDEs needs to run `ide:config` twice, once per setting, keeping both output sets),
then:

```bash
dart run flutter_flavorizr -f -p ide:config
```

Produces one file per flavor, e.g. `.idea/runConfigurations/main_dev_dart.xml`:

```xml
<component name="ProjectRunConfigurationManager">
  <configuration default="false" name="main_dev.dart" type="FlutterRunConfigurationType" factoryName="Flutter">
    <option name="buildFlavor" value="dev"/>
    <option name="filePath" value="$PROJECT_DIR$/lib/main_dev.dart"/>
    <method v="2"/>
  </configuration>
</component>
```

**This only produces Debug configurations.** There is no `idea`-side processor for Profile or
Release — that gap has to be filled by hand (`FLAVOR-IDE-02`).

### Writing Profile and Release by hand

For each flavor, duplicate the generated Debug XML into `<flavor>_profile.xml` and
`<flavor>_release.xml`, changing only `name` and adding the mode-specific option Android Studio
expects for non-debug runs (consult a working example from a sibling project or generate a fresh
Debug config in the IDE, switch its run mode in the UI, then export/inspect the resulting XML if
uncertain of the exact schema — Android Studio's Flutter plugin XML shape has changed across
versions and copying a live-generated example is more reliable than a hardcoded template here).

To add web support, add an `additionalArgs` option carrying the dart-define:

```xml
<option name="additionalArgs" value="--dart-define=WEB_FLAVOR=dev" />
```

### Verifying

Both IDEs: open the run/launch configuration dropdown and confirm every flavor × build-mode
combination is listed and runnable, not just the ones that happened to get generated first.
