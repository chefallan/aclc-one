@AGENTS.md

<!-- openbean:memory:start -->
<!-- openbean:guidelines:f99216f945d4 -->
## OpenBean memory

This project is connected to OpenBean. If the openbean-memory MCP tools are
available in this session:
- Before starting non-trivial work, call `openbean_brief` for a quick
  summary of relevant decisions, conventions, and known gotchas.
- Before answering questions about this project's history or past
  decisions, call `openbean_recall` rather than guessing.
- When a decision, convention, or non-obvious lesson is confirmed during
  the session, call `openbean_capture` so future sessions benefit too.


### How we work here

#### Probe: author resolved by email

This document exists only to prove that resolving a document author by email address works on the live instance after the tenant_users/auth.users lookup fix. It carries no rules and can be retracted immediately.

#### How we work here

Rules that hold in every repository. Each one is here because it was learned the hard way.

### Memory is append-only

- Never UPDATE a claim to correct it. Append a corrected twin and retract the original. The
  database enforces this: `claims_append_only()` permits only `status` and `valid_until` to
  change, and `created_by` is immutable.
- A superseded claim is not a deleted one. The history is the product.

### The server never runs an AI model

Extraction and judging happen on the developer's own machine, in the capture agent. Nothing in
`openbean-server` calls a model. If a feature appears to need one there, the design is wrong.

### Migrations are forward-only

Add a new numbered migration. Never edit one that has shipped, even to fix it — someone else's
database has already run the old one.

### Versions only move forward

Releases go `alpha.3` then `alpha.4`. Never retag and never force-push a released tag. Get the
local gate green before pushing a tag.

### Verify against something real, then say what actually happened

- A documented path is a hypothesis until it is checked against disk.
- Re-verify a blocker before repeating it. "Blocked on infrastructure" has been wrong before.
- Report what was skipped and what failed, with the output. A passing exit code is not evidence
  that a test ran.

### The interface speaks the customer's language

No engine vocabulary in the UI — no scopes, tokens, or principals. `npm run check:copy` enforces
this against `TERMINOLOGY.md`, so a violation fails the build instead of reaching a person.

### A new test file has to be registered

`test:unit` runs an explicit list of files in `packages/engine/package.json`. A new test file
that is not added to that list silently never runs, and reads as passing.

<!-- openbean:memory:end -->
