---
brief_id: brief_demo-req-001
schema_version: 1
profile: claude-code
project: Bug Triage Assistant
requirement: REQ-001
locked_at: "2026-05-26T10:00:00Z"
---

# DeliveryOS Execution Brief

Profile: claude-code
Project: Bug Triage Assistant
Requirement: REQ-001

## 1. Objective

Implement the Bug Submission API for REQ-001. Specifically: create `POST /bugs` and `GET /bugs/{id}` endpoints following the thin-handler architecture already established in the codebase. The implementation must pass four integration tests without modifying any forbidden files.

## 2. Approved Requirement

**REQ-001 — Bug Submission API (High priority)**

Implement `POST /bugs` and `GET /bugs/{id}` endpoints. Requests must be authenticated with a Bearer token. The API must return:
- HTTP 201 on creation with the new report ID and full JSON body
- HTTP 200 on retrieval when the ID exists
- HTTP 404 when the ID is unknown
- HTTP 422 on missing required fields

Business logic lives in `src/backend/services/bug_report_service.py`. Pydantic model lives in `src/backend/models/bug_report.py`.

## 3. Business Intent

Engineering teams need a programmatic way to create and retrieve bug reports without manual UI workflows. This endpoint is the foundation for CI/CD pipeline integration and internal dashboard consumption. Getting the contract right (HTTP semantics, field names, auth) in the first iteration prevents costly API versioning downstream.

## 4. Approved Design Context

Follow the thin-handler pattern from `src/backend/api/users.py`:
1. Route handler in `src/backend/api/bugs.py` imports from the service layer.
2. Service layer in `src/backend/services/bug_report_service.py` contains all business logic.
3. Pydantic model in `src/backend/models/bug_report.py` defines request/response shapes.
4. Register the new router in `src/backend/app.py` under prefix `/bugs`.

Severity is a Pydantic enum: `low | medium | high | critical` (default `medium`). Status is a Pydantic enum: `open | in-progress | resolved | closed` (default `open`).

## 5. Existing Codebase Context

```
src/backend/
  app.py           — FastAPI app factory; add bugs_router here
  api/
    users.py       — reference thin-handler (DO NOT MODIFY)
    bugs.py        — ★ implement POST /bugs + GET /bugs/{id}
  models/          — add bug_report.py here
  services/        — add bug_report_service.py here
  core/
    auth.py        — require_auth FastAPI Depends (DO NOT MODIFY)
    db.py          — get_repository FastAPI Depends (DO NOT MODIFY)
tests/
  conftest.py      — AsyncClient + AUTH_HEADER fixtures
  integration/     — add test_bugs_api.py here
```

See `src/backend/api/users.py` as the reference pattern for thin route handlers.

## 6. Test-First Specification

Four integration tests must pass:

1. **TC-001:** `POST /bugs` returns 201 with ID — valid payload → 201 + id in body
2. **TC-002:** `GET /bugs/{id}` returns 200 — existing id → 200 + full report
3. **TC-003:** `GET /bugs/{id}` returns 404 — unknown id → 404
4. **TC-004:** `POST /bugs` missing fields returns 422 — partial payload → 422

All tests use `AsyncClient` from `tests/conftest.py` with `AUTH_HEADER = {"Authorization": "Bearer demo-token"}`.

Test file location: `tests/integration/test_bugs_api.py`

## 7. Allowed Changes

- `src/backend/api/bugs.py`
- `src/backend/models/bug_report.py`
- `src/backend/services/bug_report_service.py`
- `tests/integration/test_bugs_api.py`
- `src/backend/app.py`

## 8. Forbidden Changes

- `src/backend/api/users.py`
- `migrations/`
- `src/frontend/`

## 9. Expected Output

When complete, the AI must produce a `result.md` file at `.deliveryos-handoff/result.md` with the following sections:

### Summary of Changes
Brief description of what was implemented.

### Files Changed
List of files created or modified (with status: new/modified).

### Tests Added/Updated
List of test cases added.

### Tests Run
Output summary from `pytest -q` (e.g. "4 passed in 0.3s").

### Risks
Any caveats or known limitations in this implementation.

### Unresolved Questions
Any open questions that remain after implementation.

## 10. Completion Criteria

- [ ] `pytest -q` reports 4 passed, 0 failed, 0 errors.
- [ ] `ruff check .` exits 0.
- [ ] No forbidden files were modified.
- [ ] `result.md` written to `.deliveryos-handoff/result.md`.
