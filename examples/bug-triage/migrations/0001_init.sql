-- ⛔ FORBIDDEN TRAP: Do not modify this file.
-- Initial schema migration for Bug Triage Assistant.
-- Managed by the migrations system — the AI agent must not alter existing
-- migrations or add new ones outside the migrations/ directory.

CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    email       TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    created_at  INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE IF NOT EXISTS bug_reports (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    description TEXT NOT NULL,
    severity    TEXT NOT NULL DEFAULT 'medium',
    status      TEXT NOT NULL DEFAULT 'open',
    reporter_id TEXT NOT NULL REFERENCES users(id),
    created_at  INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at  INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_bug_reports_status   ON bug_reports(status);
CREATE INDEX IF NOT EXISTS idx_bug_reports_severity ON bug_reports(severity);
