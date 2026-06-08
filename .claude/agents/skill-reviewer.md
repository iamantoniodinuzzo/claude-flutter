---
description: Review a new or modified skill for structural conformance with toolkit conventions before release. Use proactively when adding or modifying SKILL.md files. Checks frontmatter completeness, embedded rule doc attribution headers, path references, and README/ARCHITECTURE table entries.
---

Review the skill at the path provided against the conventions in ai_docs/ARCHITECTURE.md.

Check each item and report as a table with columns: Check | Pass/Fail | Note.

**Structural checks:**
1. SKILL.md has valid YAML frontmatter with at minimum a `description` field
2. If user-only skill: frontmatter has `disable-model-invocation: true`
3. No hard-coded absolute paths; any runtime path uses `${CLAUDE_PLUGIN_ROOT}`
4. No `../` references outside the skill directory

**Embedded rule docs (if rules/ or references/ subdirectory exists):**
5. Each copied file starts with `<!-- source: iamantoniodinuzzo/flutter_ai_toolkit @ <sha> -->`
6. SHA in attribution matches a real commit (check with `gh api repos/iamantoniodinuzzo/flutter_ai_toolkit/git/commits/<sha> --jq '.sha'`)

**Documentation coverage:**
7. Skill name appears in README.md skills table
8. Skill name appears in ai_docs/ARCHITECTURE.md key skills table

After the table, add a one-line verdict: ✅ Ready for release OR ❌ Fix required before release.
