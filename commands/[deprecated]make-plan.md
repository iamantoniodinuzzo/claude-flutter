---
description: Generate comprehensive implementation plan from user specification in ai_specs/
argument-hint: <path-to-spec-file.md>
allowed-tools: Read, Write, Glob, Grep, Task, AskUserQuestion
---

# Make Plan Command

This command transforms a user specification file from `ai_specs/` into a comprehensive, actionable implementation plan written in English.

## Required Argument

You **must** provide the path to a markdown file in the `ai_specs/` folder:

```
/make-plan ai_specs/<filename>.md
```

Example:

```
/make-plan ai_specs/539_auth_package_extraction.md
```

## Source of Truth

The complete workflow specification is in:

- `ai_toolkit/commands/make-plan.md`

Read this file first to understand the full planning workflow.

## Workflow Overview

When this command runs, you must:

1. **Read the specification file** provided as argument
   - File must exist in `ai_specs/` folder
   - Contains user's problem statement, requirements, context

2. **Read the workflow specification**
   - Open `ai_toolkit/commands/make-plan.md`
   - Follow the 6-step workflow defined there

3. **Exploration Phase** (if needed)
   - Launch Explore agents to understand existing code
   - Analyze current architecture and patterns
   - Identify dependencies and integration points

4. **Ask Clarification Questions** (if needed)
   - Use `AskUserQuestion` tool for ambiguous requirements
   - Clarify architectural choices
   - Understand scope and constraints

5. **Design the Plan**
   - Launch Plan agent with exploration context
   - Design comprehensive implementation strategy
   - Consider alternatives and trade-offs

6. **Generate and Write Plan**
   - Create detailed plan following the structure in `make-plan.md`
   - **Always write in English** regardless of request language
   - **Overwrite** the original specification file with the plan

## Plan Structure (Required Sections)

Your generated plan must include:

### Overview

- Problem statement and proposed solution
- High-level approach summary

### Implementation Strategy

- Architectural approach
- Technology choices and rationale
- Key design decisions

### Implementation Phases

Each phase with:

- Phase name: `### Phase N: Name (Week X)`
- Objective statement
- Numbered, specific steps
- Risk assessment (None/Low/Medium/High)

### Critical Files

- Files to create (with ⭐ priority markers)
- Files to modify
- Grouped by package/feature

### Migration Strategy (if applicable)

- Backward compatibility approach
- Step-by-step migration path

### Success Metrics

- Measurable outcomes
- Testing criteria

### Implementation Notes

- Commands and workflows
- Testing strategy
- Common pitfalls

### Next Steps

- Immediate actionable items with ✅ checkboxes

## Quality Requirements

Your plan must be:

- **Specific**: Exact file paths, commands, code snippets
- **Actionable**: Implementable without ambiguity
- **Incremental**: Code compiles after each phase
- **Risk-aware**: Risks identified and mitigated
- **Testable**: Verification steps for each phase

## Language Requirement

⚠️ **CRITICAL**: The generated plan must **always be written in English**, even if the original specification file is in another language.

## Example Usage

User creates `ai_specs/feature-request.md`:

```markdown
# Richiesta: Sistema di notifiche push

Voglio implementare un sistema di notifiche push...
```

User runs:

```
/make-plan ai_specs/feature-request.md
```

You:

1. Read `ai_specs/feature-request.md`
2. Read `ai_toolkit/commands/make-plan.md` for workflow
3. Explore relevant codebase areas
4. Ask clarification questions
5. Generate comprehensive plan in English
6. Overwrite `ai_specs/feature-request.md` with the plan

Result: `ai_specs/feature-request.md` now contains detailed implementation plan in English.

## Validation

Before overwriting the file, ensure:

- [ ] Plan is written entirely in English
- [ ] All required sections are present
- [ ] Code examples are included where helpful
- [ ] File paths are specific and correct
- [ ] Phases have risk assessments
- [ ] Next steps are actionable with checkboxes

## Error Handling

If the argument is missing or invalid:

- Inform user they must provide a file path
- Show usage example: `/make-plan ai_specs/<filename>.md`
- Do not proceed without valid file path

If the file doesn't exist:

- Tell user the file was not found
- Suggest checking the `ai_specs/` folder
- List available files if helpful

## Notes

- This command uses the **Task tool** to launch specialized agents
- The final plan should be self-contained and executable by another developer
- Balance detail with readability
- Include visual aids (file trees, diagrams) when helpful
- Mark optional/future enhancements clearly

---

**Command Purpose:**
Transform user specification files into comprehensive, actionable implementation plans following the structured workflow defined in `ai_toolkit/commands/make-plan.md`.
