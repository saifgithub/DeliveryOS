---
name: sm-mabp-plan
description: MABP Phase A — transform a DeliveryOS project (with a PRD + approved requirements in .deliveryos/) into a Phase B-ready build workspace. Creates docs/planning/READY.md, chunk spec files, docs/build/BUILD_STATUS.md, CLAUDE.md, .gitignore, and git-inits the project. Run /sm-mabp-plan in a project that has a PRD.md and .deliveryos/ requirements but no MABP build structure yet.
---

# /sm-mabp-plan — MABP Phase A: Plan

Turn a DeliveryOS project into a MABP-ready build workspace. Run once, before the first `/sm-mabp-run`.

**Prerequisite:** Project must have:
- `PRD.md` (product requirements doc)
- `.deliveryos/memory.sqlite` OR `requirements.json` with the full requirement list

Detailed reference: see [REFERENCE.md](REFERENCE.md).

---

## Step 0 — Verify inputs

```bash
# Check PRD
test -f PRD.md && echo "PRD: ok" || echo "PRD: MISSING"

# Check requirements source
test -f requirements.json && echo "reqs: JSON" || \
  (test -f .deliveryos/memory.sqlite && echo "reqs: DeliveryOS SQLite" || echo "reqs: MISSING")

# Check git state
git status 2>/dev/null && echo "git: ok" || echo "git: not initialized"
```

If PRD and requirements are both missing: stop, surface to user.

---

## Step 1 — Read and understand the project

1. Read `PRD.md` in full — note: tech stack, users/roles, goals, constraints, non-goals, success criteria
2. Read all requirements (from `requirements.json` OR via sqlite query — see REFERENCE.md § Reading requirements from DeliveryOS)
3. Note any **unresolved assumptions** in the PRD (phrases like "must be confirmed", "TBD", "to be decided")

---

## Step 2 — Group requirements into chunks

Chunk size: 2–7 requirements per chunk. Rules:
- Foundation first (scaffold, DB schema, infra setup) — always CHUNK-01
- Auth/security second — always CHUNK-02
- Core data features before dashboards/reporting
- Each chunk must be independently buildable and testable
- Aim for 6–12 chunks total; more is better than fewer for failure isolation
- `must` requirements ship before `should` requirements

For each chunk, decide:
- **Slug**: kebab-case name (e.g. `excel-bootstrap`)
- **Requirements covered**: list by title (or REQ-NNN if IDs available)
- **Builder start tier**: Economy (no design decisions), Standard (most chunks), Premium (parsing, integrations, complex UI)
- **Dependencies**: which prior chunks must be done

Write the dependency map before writing any spec files.

---

## Step 3 — Write chunk spec files

For each chunk write `docs/planning/chunks/chunk-NN-<slug>.md` from the template in REFERENCE.md § Chunk spec template. The load-bearing section is **Pre-resolved design decisions** — the 3–5 choices the architect makes so the builder doesn't have to (CHUNK-01: the full DB schema; other chunks: API route shapes, data structures, file paths). Every done-criterion must be verifiable by a command or observable behaviour; the pre-fire audit is 5–8 checks; **Allowed changes** must name both what the builder may touch and what it must not.

---

## Step 4 — Write planning docs

```bash
mkdir -p docs/planning/chunks docs/build/builder_reports docs/build/qa_reports \
         docs/build/invocations docs/build/qa_invocations docs/build/fix_prompts \
         docs/build/blockers
```

Write:
- `docs/planning/part-1-plan.md` — chunk breakdown table + dependency map + unresolved assumptions
- `docs/planning/READY.md` — ordered list of chunk file links (dependency order)
- `docs/build/BUILD_STATUS.md` — chunk ledger scaffold (all chunks `pending`)

---

## Step 5 — Bootstrap the project

```bash
# Initialize git if not already done
git status 2>/dev/null || git init

# Create .gitignore if missing
test -f .gitignore || echo "→ write .gitignore (node_modules, .env, .next, .vercel, .DS_Store)"

# Create CLAUDE.md if missing
test -f CLAUDE.md || echo "→ write CLAUDE.md with: project purpose, tech stack, roles, key constraints, dev commands"

# .claude/session-config.yml for this project
test -f .claude/session-config.yml || echo "→ write .claude/session-config.yml (prefix from project name, R track for development)"
```

Write `.gitignore`, `CLAUDE.md`, and `.claude/session-config.yml` if they don't exist.

---

## Step 6 — Initial git commit

```bash
git add docs/ CLAUDE.md .gitignore .claude/session-config.yml requirements.json PRD.md answer.md
git commit -m "chore(planning): MABP Phase A complete — 9 chunks, READY.md, BUILD_STATUS scaffold"
```

---

## Step 7 — Surface the plan

Present to the user:
- Total chunks created, with dependency order
- Unresolved assumptions that must be confirmed before affected chunks fire
- First chunk to build (`/sm-mabp-run` will pick it up)
- Any BLOCKERs found (missing DATABASE_URL, missing input data, etc.)

Then ask: "Ready to start Phase B? Run `/sm-mabp-run` to fire chunk 01."

---

## Hard constraints

- Do NOT write any application code (`.ts`, `.tsx`, `.py` etc.) — planning only
- Do NOT run `npm install` or `npx create-next-app` — that's CHUNK-01's job
- Do NOT commit application code — only planning docs, config, and gitignore
