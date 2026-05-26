# Decomposed Requirements — Bug Triage Assistant

---

## REQ-001 — Bug Submission API

**Priority:** High
**Category:** Functional
**Source PRD section:** Requirements

Implement `POST /bugs` and `GET /bugs/{id}` endpoints following the thin-handler pattern established in `src/backend/api/users.py`.

**Acceptance criteria:**
- `POST /bugs` returns HTTP 201 with the new bug report ID and full JSON body.
- `GET /bugs/{id}` returns HTTP 200 with the bug report when the ID exists.
- `GET /bugs/{id}` returns HTTP 404 when the ID does not exist.
- `POST /bugs` returns HTTP 422 when required fields (`title`, `description`, `reporter_id`) are missing.
- All routes require a valid Bearer token (use the `require_auth` dependency).
- Business logic lives in `src/backend/services/bug_report_service.py`, not inline in the handler.
- The Pydantic model lives in `src/backend/models/bug_report.py`.
- Four integration tests in `tests/integration/test_bugs_api.py` cover the above criteria.

---

## REQ-002 — List Bugs

**Priority:** Medium
**Category:** Functional
**Source PRD section:** Requirements

Implement `GET /bugs` to list all bug reports with optional query-parameter filters.

**Acceptance criteria:**
- Returns a JSON array of bug reports ordered by `created_at` descending.
- Supports optional `?severity=` and `?status=` query parameters for filtering.
- Returns an empty array (not 404) when no reports match.
- Requires Bearer token authentication.

---

## REQ-003 — AI Severity Suggestion

**Priority:** Low
**Category:** Functional
**Source PRD section:** Requirements

After a bug report is created, provide an AI-generated severity suggestion endpoint.

**Acceptance criteria:**
- `GET /bugs/{id}/severity-suggestion` returns a JSON object with `suggested_severity` (enum) and `confidence` (float 0–1).
- The suggestion is generated from the report's `title` and `description` fields.
- The endpoint is advisory — it does not modify the stored report.
- Requires Bearer token authentication.
