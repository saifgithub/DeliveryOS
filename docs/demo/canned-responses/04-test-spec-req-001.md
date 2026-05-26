# Test Spec — REQ-001 Bug Submission API

**Test spec ID:** TS-REQ-001
**Linked requirement:** REQ-001 — Bug Submission API
**Confidence:** High

---

## Verification criteria

1. `POST /bugs` with valid payload returns HTTP 201 and a response body containing the new bug report ID and all submitted fields.
2. `GET /bugs/{id}` with an existing ID returns HTTP 200 and the full bug report JSON.
3. `GET /bugs/{id}` with a non-existent ID returns HTTP 404.
4. `POST /bugs` with missing required fields (`title` or `description` or `reporter_id`) returns HTTP 422.

---

## Test cases

### TC-001 — POST /bugs returns 201 with ID

**Given:** A running FastAPI test client with a Bearer token `demo-token`.
**When:** `POST /bugs` is called with body `{"title": "Login fails on Safari", "description": "Users report being unable to log in on Safari 17", "reporter_id": "user-abc"}`.
**Then:**
- Response status is `201 Created`.
- Response body contains `"id"` (a non-empty string).
- Response body contains `"title": "Login fails on Safari"`.
- Response body contains `"status": "open"`.

---

### TC-002 — GET /bugs/{id} returns 200 for existing report

**Given:** A bug report was created via `POST /bugs` and its ID was captured.
**When:** `GET /bugs/{id}` is called with the captured ID and a valid Bearer token.
**Then:**
- Response status is `200 OK`.
- Response body contains the same `title`, `description`, and `reporter_id` as the creation payload.
- Response body contains `"severity"` and `"status"` fields.

---

### TC-003 — GET /bugs/{id} returns 404 for missing report

**Given:** A valid Bearer token.
**When:** `GET /bugs/nonexistent-id-xyz` is called.
**Then:**
- Response status is `404 Not Found`.
- Response body contains `"detail"` with a human-readable message.

---

### TC-004 — POST /bugs with missing fields returns 422

**Given:** A running FastAPI test client with a Bearer token.
**When:** `POST /bugs` is called with body `{"title": "Partial bug"}` (missing `description` and `reporter_id`).
**Then:**
- Response status is `422 Unprocessable Entity`.
- Response body contains a `"detail"` array listing the missing fields.

---

## Open questions

- Should the test client fixture use `scope="function"` (fresh repo per test) or `scope="module"`? Recommended: `scope="function"` to prevent test-order coupling.
