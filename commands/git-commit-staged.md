---
description: Generate commit message for staged changes following Conventional Commits
allowed-tools: Bash, Read
---

# Git Commit Staged

Generate a commit message for staged changes following Conventional Commits v1.0.0 guidelines.

## Source of Truth

The **single source of truth** for this command is:

- `ai_toolkit/commands/git-commit-staged.md`

That file contains:

- Step-by-step procedure for analyzing staged changes
- Conventional Commits type reference table
- Scope selection guidelines for this project
- Practical examples for different change types
- Best practices for commit messages

## Your Task When This Command Runs

When invoked, you must:

1. **Read the procedure file** `ai_toolkit/commands/git-commit-staged.md` to load the complete workflow.

2. **Check for staged changes**:

   ```bash
   git diff --cached --stat
   ```

   If no staged changes exist, inform the user and stop.

3. **Analyze staged changes** by running these commands in parallel:

   ```bash
   git diff --cached --name-status
   git diff --cached
   git log -5 --oneline
   ```

4. **Categorize the changes** following the type selection guide:

   | Type | Use When |
   |------|----------|
   | `feat` | New feature for users |
   | `fix` | Bug fix |
   | `docs` | Documentation only |
   | `refactor` | Code restructuring |
   | `test` | Adding or updating tests |
   | `chore` | Maintenance tasks |

5. **Select appropriate scope** based on affected area:
   - Feature name: `auth`, `missions`, `map`, `memberships`
   - App name: `tomcat-portal`, `pollicino-viewer`
   - Layer: `domain`, `data`, `presentation`

6. **Generate commit message** with this structure:

   ```
   <type>(<scope>): <short description>

   <body explaining what and why>

   Refs #<issue-number>
   ```

7. **Present the message** to the user for confirmation.

8. **Execute the commit** using multiple `-m` flags (cross-platform compatible):

   ```bash
   git commit -m "<header>" -m "<body paragraph 1>" -m "<body paragraph 2>" -m "<footer>"
   ```

   **Important**: Each `-m` flag creates a new paragraph. Use separate `-m`
   flags for the header, each body paragraph, and footer.

   **Example:**

   ```bash
   git commit -m "refactor(common-ui): extract reusable components" \
     -m "Extract repeated UI patterns into reusable components." \
     -m "New components:" \
     -m "- AsyncActionButton: Button with loading state" \
     -m "- SecondaryButton: Outlined button wrapper" \
     -m "Refs #123"
   ```

   **Note**: HEREDOC syntax does not work in PowerShell on Windows. Using
   multiple `-m` flags is the cross-platform compatible approach.

9. **Verify the commit**:

   ```bash
   git log -1 --stat
   ```

## Handling User Arguments

If the user provides additional context:

- **Issue numbers**: `$ARGUMENTS` may contain issue references like `refs #123` or `closes #456`
- **Custom scope**: User may specify a scope to use
- **Additional context**: Include any provided context in the commit body

## Output Expectations

- Commit message follows Conventional Commits format
- Uses plain English, imperative mood
- Header under 72 characters
- Body explains what changed and why
- References relevant issues when provided
- Uses multiple `-m` flags for cross-platform compatibility (works on bash, PowerShell, Git Bash)

## Platform Compatibility

The command uses multiple `-m` flags instead of HEREDOC syntax to ensure
compatibility across platforms:

- **Bash/Linux/macOS**: Works natively
- **PowerShell/Windows**: Works without errors (HEREDOC not supported)
- **Git Bash on Windows**: Works natively

When building the commit command:

- First `-m`: Header line
- Subsequent `-m` flags: Each paragraph or bullet point section
- Last `-m`: Footer with issue references

Each `-m` flag automatically creates a blank line separator.

## Quick Reference

```
feat:     New feature
fix:      Bug fix
docs:     Documentation
style:    Formatting
refactor: Code restructure
perf:     Performance
test:     Tests
build:    Build/deps
ci:       CI/CD
chore:    Maintenance
```

**Breaking changes**: Add `!` after scope and include `BREAKING CHANGE:` in footer.
