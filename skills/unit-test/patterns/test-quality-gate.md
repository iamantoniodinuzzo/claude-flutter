# Pattern: Test Quality Gate (mutation mindset)

## Purpose

A test suite that merely mirrors the implementation passes even when the code is wrong. This gate is a self-review checklist run on every test file written or modified, **after** tests are green and analysis is clean, **before** the final summary. A weak test found here is either strengthened or deleted — never left in as coverage padding.

## 1. Anti-tautology rule

Expected values must be derived from the **contract** — doc comments, method/class names, domain rules, how call sites use the result — never by running the code and copying its output into the assertion.

- Wrong workflow: run test → observe actual `42` → write `expect(result, 42)`.
- Right workflow: read spec/name → conclude "sum of the two line items, 40 + 2" → write `expect(result, 42)`.

If the expected value **cannot** be deduced without executing the code, the behavior is under-specified. Do not invent an assertion that blesses whatever the code currently does — report the case as under-specified in the final summary.

## 2. Mental mutation check

For every test ask: **"what plausible bug would make this test fail?"** Name a concrete mutation — flipped `<`/`<=`, dropped guard clause, swapped arguments, inverted boolean, missing `await`. If no mutation would fail the test, the test is weak.

Weak-assertion signatures:

| Signature | Why it survives every mutation |
|---|---|
| `expect(result, isNotNull)` as the only assert | almost any wrong value is still non-null |
| `expect(state, isA<AsyncData<Foo>>())` with no value assert | wrong data still satisfies the type check |
| `verify(...)` calls with no assertion on resulting state | side effect fired, but the outcome is unchecked |
| `expect(() => ..., returnsNormally)` alone | asserts only absence of a throw |
| Asserting a value the mock itself returned, with no logic in between | tests the mock, not the subject |

Fix: assert the strongest checkable property — exact value, exact error type + relevant fields, full state including unchanged fields after `copyWith`.

## 3. Both sides of every branch

Every `if` / `switch` / ternary in the subject needs a test where the condition is true AND one where it is false. One-sided branch tests are coverage without correctness: mutating the condition to a constant would still pass.

Boundary conditions (`x < limit`) additionally need the equality case (`x == limit`) — that is where `<` vs `<=` bugs live (see `edge-case-catalog.md`).

## 4. Over-testing anti-patterns — delete on sight

| Anti-pattern | Why it is harmful |
|---|---|
| Testing the mock | Asserting values that flow straight from a stub through zero logic. Green regardless of the subject. |
| Over-verification | `verifyInOrder` on internal call sequences with no behavioral contract. Breaks on refactor, catches no bug. |
| Implementation-detail assertions | Asserting private/intermediate state instead of observable behavior. Couples tests to structure. |
| Trivial getter/setter tests | `expect(foo.name, 'x')` after `Foo(name: 'x')` with no logic. Padding. |
| Placeholder tests | `expect(true, isTrue)`, empty test bodies, commented-out asserts. Worse than absent — fake confidence. |

Interaction verification (`verify`) is legitimate only when the call **is** the observable behavior (e.g. "saves the order to the repository exactly once").

## 5. One behavior per test

- Each `test(...)` asserts a single behavior; name states the behavior (`given expired token when refresh called then re-authenticates`), not the method name (`test refresh()`).
- Multiple `expect`s are fine when they describe one outcome (e.g. all fields of one emitted state).
- A test that exercises two actions with asserts between them is two tests — split it.

## Gate procedure

1. Re-read every test written/modified this session against checks 1–5.
2. Strengthen weak asserts; split multi-behavior tests; delete anti-pattern tests.
3. Re-run the affected files after any change.
4. Record in the final summary: tests strengthened, tests deleted (with reason), behaviors flagged as under-specified.
