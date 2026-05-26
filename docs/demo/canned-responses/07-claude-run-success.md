# Summary of Changes

Implemented the Bug Submission API (REQ-001). Created a BugReport Pydantic model with severity enum (low/medium/high/critical) and status enum (open/in-progress/resolved/closed). Implemented BugReportService with create and get_by_id methods using the injected InMemoryRepository. Created thin handler in bugs.py with POST /bugs and GET /bugs/{id} routes, registered the router in app.py under /bugs prefix. All four integration tests pass.

# Files Changed

- src/backend/api/bugs.py (new)
- src/backend/models/bug_report.py (new)
- src/backend/services/bug_report_service.py (new)
- tests/integration/test_bugs_api.py (new)

# Tests Added/Updated

- tests/integration/test_bugs_api.py::test_post_bug_returns_201_with_id
- tests/integration/test_bugs_api.py::test_get_bug_returns_200_for_existing
- tests/integration/test_bugs_api.py::test_get_bug_returns_404_for_missing
- tests/integration/test_bugs_api.py::test_post_bug_missing_fields_returns_422

# Tests Run

4 passed in 0.31s

# Risks

The implementation uses the InMemoryRepository stub from core/db.py. Data is not persisted between process restarts. This is acceptable for the demo environment and noted in the codebase memory as a known constraint (migrations handled separately).

# Unresolved Questions

- The /bugs router is currently not added to app.py automatically — I added `app.include_router(bugs_router, prefix="/bugs", tags=["bugs"])` in app.py. This change is within the Allowed list (src/backend/app.py is allowed). Confirmed: no forbidden files were modified.
