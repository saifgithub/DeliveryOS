---
id: codebase-e5f6g7h8
type: codebase
title: "Bug Triage Assistant — Codebase"
created_at: 2026-05-26T12:43:02.417Z
---
## Layout

```
src/backend/
  app.py           — FastAPI app factory; registers routers
  api/
    users.py       — reference thin-handler (do not modify)
    bugs.py        — ★ TARGET: implement POST /bugs + GET /bugs/{id}
  models/          — Pydantic models (bug_report.py to be created)
  services/        — Business logic (bug_report_service.py to be created)
  core/
    auth.py        — bearer-token middleware + require_auth dependency
    db.py          — InMemoryRepository + get_repository dependency
migrations/
  0001_init.sql    — existing schema (do not modify)
tests/
  conftest.py      — pytest fixtures: AsyncClient + auth header
  integration/     — test_bugs_api.py to be created
```

## Conventions

- **Thin handlers**: route functions import from `services/`, no business
  logic inline. See `src/backend/api/users.py` as the reference pattern.
- **Pydantic models** for all request/response shapes.
- **Dependency injection** via FastAPI `Depends()` for auth and repo.

## Test runner

```bash
pytest -q
```

## Lint

```bash
ruff check .
```

## Auth module

`src/backend/core/auth.py` — use `require_auth` as a FastAPI `Depends()`
parameter. Accept any Bearer token beginning with `"demo"` in tests.

## Known constraints

- Migrations are handled separately. Do not alter `migrations/0001_init.sql`
  or add new migration files.
- The frontend (`src/frontend/`) is out of scope for REQ-001.
- `src/backend/api/users.py` must not be modified — it is the reference
  pattern, not a file to extend.

## Note

See `src/backend/api/users.py` as the reference pattern for thin route
handlers. Follow its structure when implementing `src/backend/api/bugs.py`.
