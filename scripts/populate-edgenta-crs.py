#!/usr/bin/env python3
"""
Populate edgenta_OKR Change Requests into DeliveryOS SQLite.

These are features that were built outside the original PRD scope
(PRD explicitly listed "No AI model API" and "No email service" as out of scope).

Usage:
  python3 scripts/populate-edgenta-crs.py
"""

import sqlite3
import json
import uuid
import sys
from datetime import datetime
from pathlib import Path

DB_PATH = Path("/Volumes/Extreme Pro/edgenta_OKR/.deliveryos/memory.sqlite")

# The PRD parent entry is requirement-862ee291
PRD_ID = "requirement-862ee291"

def generate_memory_id(entry_type):
    """Generate IDs in DeliveryOS format: <type>-<8hex>."""
    return f"{entry_type}-" + uuid.uuid4().hex[:8]

# Change requests: one per distinct feature area that was added post-PRD
CHANGE_REQUESTS = [
    {
        "description": "AI Ingest — AI-powered actuals ingestion using Gemini + Groq dual-consensus to parse free-form text/CSV into structured KPI updates, with human review before commit. Adds /admin/ai-ingest, history, stats, and configurable prompt pages.",
    },
    {
        "description": "Ask OKR.AI — Conversational AI Q&A panel allowing any role to ask natural-language questions about current KPI data and receive grounded answers with citations. Adds /ask page and /api/ask route.",
    },
    {
        "description": "AI Assist (Check-In) — Chat-based interface for Department Heads to enter actuals conversationally; AI parses chat messages into structured KPI value updates and persists on commit. Adds /checkin page and /api/checkin/* routes.",
    },
    {
        "description": "Self-Assessments — AI-generated performance self-assessment texts for each department, grounded in actual H1/H2 KPI data. Admin-only feature. Adds /admin/assessments and /api/admin/assessments/* routes.",
    },
    {
        "description": "Dashboard Narrative — AI-generated executive summary narrative for the consolidated dashboard, dynamically summarising department performance. Adds /api/narrative route.",
    },
    {
        "description": "AI Prompts Admin — Admin UI to view and edit system prompts for all AI features (Ask OKR.AI, AI Assist, Self-Assessments, Dashboard Narrative) stored in DB via a prompt registry. Adds /admin/ai-prompts and /api/admin/ai-prompts/[key] routes.",
    },
    {
        "description": "Email Reminder System — Automated reminder emails sent to Department Heads with incomplete actuals via a daily cron job, plus admin UI to view sent emails and trigger reminders manually. Adds /admin/emails, /api/cron/reminder-check, and /api/email/inbound routes.",
    },
    {
        "description": "Email Simulator — Admin tool to preview and test reminder emails with configurable sender, subject, and body without sending to real recipients. Adds /admin/email-sim and /api/admin/email-sim route.",
    },
    {
        "description": "Settings page — Admin-configurable app-wide settings (org name, fiscal year, review cycle labels, etc.) stored in DB. Adds /admin/settings and /api/admin/settings* routes.",
    },
    {
        "description": "KPI Target Validation — Admin panel showing which department KPI weights do not sum to 100% and blocking period lock when targets are invalid. Adds TargetValidationPanel component and /api/admin/kpis/validate route.",
    },
]

def main():
    if not DB_PATH.exists():
        print(f"❌ memory.sqlite not found at {DB_PATH}")
        sys.exit(1)

    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()

    # Verify PRD parent exists
    cursor.execute("SELECT id, title FROM memory_entries WHERE id = ?", (PRD_ID,))
    prd_row = cursor.fetchone()
    if not prd_row:
        print(f"❌ PRD parent entry '{PRD_ID}' not found in DB")
        conn.close()
        sys.exit(1)
    print(f"✅ PRD parent: {prd_row[0]} — {prd_row[1]}")

    # Get PRD sections snapshot from PRD parent payload
    cursor.execute("SELECT payload_json FROM memory_entries WHERE id = ?", (PRD_ID,))
    prd_payload = json.loads(cursor.fetchone()[0])
    prd_sections = prd_payload.get("sections", [])
    print(f"   PRD has {len(prd_sections)} sections")

    # Get highest existing CR number
    cursor.execute(
        "SELECT MAX(CAST(SUBSTR(json_extract(payload_json, '$.id'), 4) AS INTEGER)) "
        "FROM memory_entries WHERE type = 'change-request' AND json_extract(payload_json, '$.id') LIKE 'CR-%'"
    )
    row = cursor.fetchone()
    max_cr = row[0] if row and row[0] else 0
    cr_num = max_cr + 1

    print(f"\n📋 Inserting {len(CHANGE_REQUESTS)} change requests (starting CR-{cr_num:03d})...")
    cursor.execute("BEGIN TRANSACTION")

    for cr_def in CHANGE_REQUESTS:
        cr_id = f"CR-{cr_num:03d}"
        entry_id = generate_memory_id("change-request")
        now = int(datetime.now().timestamp() * 1000)

        payload = json.dumps({
            "kind": "change-request",
            "id": cr_id,
            "description": cr_def["description"],
            "status": "logged",
            "prdSnapshotSections": prd_sections,
        })

        title = f"{cr_id} — {cr_def['description'][:80]}"

        cursor.execute(
            "INSERT INTO memory_entries (id, type, title, payload_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            (entry_id, "change-request", title, payload, now, now)
        )

        cursor.execute(
            "INSERT INTO memory_links (from_id, to_id, kind) VALUES (?, ?, ?)",
            (entry_id, PRD_ID, "derives-from")
        )

        print(f"  {cr_id}: {cr_def['description'][:65]}...")
        cr_num += 1

    cursor.execute("COMMIT")
    conn.close()

    print(f"\n✅ Successfully inserted {len(CHANGE_REQUESTS)} change requests!")
    print("\n🎯 Next steps:")
    print("   1. Open the CR panel in DeliveryOS (deliveryos.changeRequest.open)")
    print("   2. Each CR is in 'logged' status — ready to generate prompt → apply → verify")
