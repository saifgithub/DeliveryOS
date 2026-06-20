#!/usr/bin/env python3
"""
Fix bug entry IDs in edgenta_OKR memory.sqlite.
DeliveryOS requires IDs in format `bug-xxxxxxxx` (type prefix + 8-char hex).
We inserted plain UUIDs — fix them and update all foreign-key references.
"""

import sqlite3
import uuid
import sys

DB_PATH = "/Volumes/Extreme Pro/edgenta_OKR/.deliveryos/memory.sqlite"

def short_id():
    """Generate a bug-xxxxxxxx style ID."""
    return "bug-" + uuid.uuid4().hex[:8]

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Get all bugged entries with UUID-style IDs (no 'bug-' prefix)
cursor.execute(
    "SELECT id FROM memory_entries WHERE type = 'bug' AND id NOT LIKE 'bug-%'"
)
rows = cursor.fetchall()

if not rows:
    print("✅ No bug entries need fixing — all already have correct IDs.")
    conn.close()
    sys.exit(0)

print(f"Found {len(rows)} bug entries with incorrect IDs. Fixing...")

cursor.execute("BEGIN TRANSACTION")
try:
    for (old_id,) in rows:
        new_id = short_id()

        # Update the entry's primary key
        cursor.execute(
            "UPDATE memory_entries SET id = ? WHERE id = ?",
            (new_id, old_id)
        )

        # Update all links where this entry is the source (from_id)
        cursor.execute(
            "UPDATE memory_links SET from_id = ? WHERE from_id = ?",
            (new_id, old_id)
        )

        # Update all links where this entry is the target (to_id)
        cursor.execute(
            "UPDATE memory_links SET to_id = ? WHERE to_id = ?",
            (new_id, old_id)
        )

        print(f"  {old_id} → {new_id}")

    cursor.execute("COMMIT")
    print(f"\n✅ Fixed {len(rows)} bug entry IDs.")
except Exception as e:
    cursor.execute("ROLLBACK")
    print(f"❌ Error: {e}")
    sys.exit(1)
finally:
    conn.close()
