---
description: Finish feature branch using git flow with formatted Conventional Commits merge message
argument-hint: [issue-numbers (comma-separated)]
allowed-tools: Read, Run, Edit
---

Finish the current feature branch using git flow with a properly formatted Conventional Commits merge message based on all commits made in the branch.

## Instructions

Read and follow the complete guide in `ai_toolkit/commands/git-flow-feature-finish.md`.

## Arguments

**Optional:** Comma-separated list of GitHub issue numbers to close (e.g., `123` or `123,456,789`).

**Issue Number Resolution Priority:**

1. Use `$ARGUMENTS` if provided
2. Extract from branch name pattern `feature/<number>_name` (e.g., `feature/123_oauth-login` → `123`)
3. Ask the user if neither of the above is available

## Workflow Summary

1. Verify current feature branch (`feature/*`)
2. Collect issue numbers (from arguments, branch name, or user input)
3. Analyze all commits with `git log develop..HEAD --oneline --no-merges`
4. Generate comprehensive Conventional Commits merge message with:
   - Header: `<type>(<scope>): <description>`
   - Body: Summary, Changes, Technical Details
   - Footer: `Closes #<issue-number>` for each issue
5. Execute `git flow feature finish <feature-name>` with the generated message
6. Verify the merge with `git log develop -1 --stat`

## Output

A complete, formatted merge commit message that:

- Follows Conventional Commits v1.0.0 specification
- Summarizes all work done in the feature branch
- Properly references GitHub issues for automatic closure
- Enables automated changelog generation
