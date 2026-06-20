#!/usr/bin/env python3

"""
Populate edgenta_OKR bugs into DeliveryOS SQLite from DEFECT_LIST.md.

Usage:
  python3 scripts/populate-edgenta-bugs.py
"""

import sqlite3
import json
import uuid
import re
import sys
from datetime import datetime
from pathlib import Path

DEFECT_LIST_PATH = Path("/Volumes/Extreme Pro/edgenta_OKR/docs/build/DEFECT_LIST.md")
DB_PATH = Path("/Volumes/Extreme Pro/edgenta_OKR/.deliveryos/memory.sqlite")

def severity_map(severity):
    """Map severity text to lowercase."""
    m = {
        "Critical": "critical",
        "High": "high",
        "Medium": "medium",
        "Low": "low",
    }
    return m.get(severity, "medium")

def parse_defect_list():
    """Parse DEFECT_LIST.md and extract defect rows."""
    content = DEFECT_LIST_PATH.read_text()
    lines = content.split("\n")

    defects = []
    in_table = False
    header_skipped = False

    for line in lines:
        if "| DEF-ID | Area | Severity" in line:
            in_table = True
            header_skipped = False
            continue

        if not in_table:
            continue

        # Stop at next section
        if line.strip().startswith("---") and header_skipped:
            break

        # Skip separator row
        if "|---" in line or "|-----" in line:
            header_skipped = True
            continue

        # Parse defect row
        cells = [c.strip() for c in line.split("|") if c.strip()]
        if len(cells) < 8:
            continue

        defId = cells[0]
        if not defId.startswith("DEF-"):
            continue

        area = cells[1]
        severity = cells[2]
        status = cells[3]
        description = cells[4]
        discoveredIn = cells[5]
        verified = cells[7]

        defects.append({
            "id": defId,
            "area": area,
            "severity": severity_map(severity),
            "status": "open",  # Always start as open for dogfooding
            "description": description,
            "discoveredIn": discoveredIn,
            "verified": verified,
        })

    return defects

def generate_memory_id(entry_type):
    """Generate IDs in DeliveryOS format: <type>-<8hex>."""
    return f"{entry_type}-" + uuid.uuid4().hex[:8]

def main():
    # Validate files
    if not DEFECT_LIST_PATH.exists():
        print(f"❌ DEFECT_LIST.md not found at {DEFECT_LIST_PATH}")
        sys.exit(1)

    if not DB_PATH.exists():
        print(f"❌ memory.sqlite not found at {DB_PATH}")
        sys.exit(1)

    print("📖 Parsing DEFECT_LIST.md...")
    defects = parse_defect_list()

    if not defects:
        print("❌ No defects found in DEFECT_LIST.md")
        sys.exit(1)

    print(f"✅ Found {len(defects)} defects")
    for d in defects[:3]:
        print(f"  - {d['id']}: {d['description'][:60]}...")

    # Connect to database
    print("\n🗄️  Querying database...")
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()

    # Get or create project entry
    cursor.execute(
        "SELECT id FROM memory_entries WHERE type = 'intent' LIMIT 1"
    )
    row = cursor.fetchone()

    if row:
        project_id = row[0]
        print(f"  Using existing project: {project_id}")
    else:
        print("  Creating new project entry...")
        project_id = str(uuid.uuid4())
        now = int(datetime.now().timestamp() * 1000)
        payload = json.dumps({
            "kind": "intent",
            "title": "edgenta_OKR",
            "description": "OKR.AI — KPI scorecard tracking for MEEM",
        })
        cursor.execute(
            "INSERT INTO memory_entries (id, type, title, payload_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            (project_id, "intent", "edgenta_OKR", payload, now, now)
        )
        conn.commit()
        print(f"  Created: {project_id}")

    # Get highest existing BUG number
    cursor.execute(
        "SELECT MAX(CAST(SUBSTR(json_extract(payload_json, '$.id'), 5) AS INTEGER)) FROM memory_entries WHERE type = 'bug' AND json_extract(payload_json, '$.id') LIKE 'BUG-%'"
    )
    row = cursor.fetchone()
    max_bug = row[0] if row and row[0] else 0
    bug_num = max_bug + 1

    # Insert bugs
    print(f"\n🐛 Inserting {len(defects)} bugs...")
    cursor.execute("BEGIN TRANSACTION")

    for idx, defect in enumerate(defects):
        bug_id = f"BUG-{bug_num:03d}"
        entry_id = generate_memory_id("bug")
        now = int(datetime.now().timestamp() * 1000)

        payload = json.dumps({
            "kind": "bug",
            "id": bug_id,
            "description": defect["description"],
            "severity": defect["severity"],
            "status": "open",
            "area": defect["area"],
            "discoveredIn": defect["discoveredIn"],
            "notes": f"Imported from OKR.AI DEFECT_LIST",
        })

        title = f"{bug_id} — {defect['description'][:80]}"

        # Insert entry
        cursor.execute(
            "INSERT INTO memory_entries (id, type, title, payload_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            (entry_id, "bug", title, payload, now, now)
        )

        # Link to project
        cursor.execute(
            "INSERT INTO memory_links (from_id, to_id, kind) VALUES (?, ?, ?)",
            (entry_id, project_id, "derives-from")
        )

        bug_num += 1

        if (idx + 1) % 5 == 0:
            print(f"  Inserted {idx + 1}/{len(defects)} bugs...")

    cursor.execute("COMMIT")
    conn.close()

    print(f"\n✅ Successfully inserted {len(defects)} bugs!")
    print("\n🎯 Next steps:")
    print("   1. Open edgenta_OKR in VS Code with DeliveryOS extension")
    print("   2. Run cmd: deliveryos.bug.open to open the bug panel")
    print("   3. Assign, fix, and verify bugs to test the iteration loop")

if __name__ == "__main__":
    main()
