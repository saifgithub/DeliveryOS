#!/bin/bash

# Populate edgenta_OKR bugs into DeliveryOS SQLite from DEFECT_LIST.md

DEFECT_LIST="/Volumes/Extreme Pro/edgenta_OKR/docs/build/DEFECT_LIST.md"
DB_PATH="/Volumes/Extreme Pro/edgenta_OKR/.deliveryos/memory.sqlite"

# Check if files exist
if [ ! -f "$DEFECT_LIST" ]; then
  echo "❌ DEFECT_LIST.md not found at $DEFECT_LIST"
  exit 1
fi

if [ ! -f "$DB_PATH" ]; then
  echo "❌ memory.sqlite not found at $DB_PATH"
  exit 1
fi

echo "📖 Parsing DEFECT_LIST.md..."

# Extract defect rows from the markdown table (skip header, separator, and section markers)
# Format: DEF-ID | Area | Severity | Status | Description | DiscoveredIn | FixAgent | Verified
defects=$(awk '
  /^\| DEF-/ && !/DEF-ID/ {
    # Split by pipe, trim whitespace
    gsub(/^ *\| */, ""); gsub(/ *\| *$/, "");
    split($0, cells, / *\| */)

    defId = cells[1]
    area = cells[2]
    severity = cells[3]
    status = cells[4]
    description = cells[5]
    discoveredIn = cells[6]
    verified = cells[8]

    # Convert severity to lowercase
    if (severity == "Critical") severity_lower = "critical"
    else if (severity == "High") severity_lower = "high"
    else if (severity == "Medium") severity_lower = "medium"
    else severity_lower = "low"

    # Escape single quotes in description
    gsub(/'\'\'/, "'\''", description)
    gsub(/'\'\'/, "'\''", area)
    gsub(/'\'\'/, "'\''", discoveredIn)

    # Output tab-separated for processing
    printf "%s\t%s\t%s\t%s\t%s\t%s\n", defId, area, severity_lower, "open", description, discoveredIn
  }
' "$DEFECT_LIST")

echo "$defects" | head -3 | sed 's/^/  /'
echo "  ..."

# Count defects
count=$(echo "$defects" | wc -l)
echo "✅ Found $count defects"

echo ""
echo "🗄️  Querying database..."

# Get or create project entry for edgenta_OKR
PROJECT_ID=$(sqlite3 "$DB_PATH" \
  "SELECT id FROM memory_entries WHERE type = 'intent' LIMIT 1 COLLATE NOCASE" 2>/dev/null)

if [ -z "$PROJECT_ID" ]; then
  echo "⚠️  No project entry found; creating one..."
  PROJECT_ID=$(python3 -c "import uuid; print(str(uuid.uuid4()))")
  NOW=$(date +%s000)

  PAYLOAD='{"kind":"intent","title":"edgenta_OKR","description":"OKR.AI — KPI scorecard tracking for MEEM"}'

  sqlite3 "$DB_PATH" <<EOF
INSERT INTO memory_entries (id, type, title, payload_json, created_at, updated_at)
VALUES ('$PROJECT_ID', 'intent', 'edgenta_OKR', '$PAYLOAD', $NOW, $NOW);
EOF
  echo "  Created: $PROJECT_ID"
else
  echo "  Using existing project: $PROJECT_ID"
fi

echo ""
echo "🐛 Inserting bugs..."

# Get highest existing BUG number
MAX_BUG=$(sqlite3 "$DB_PATH" \
  "SELECT MAX(CAST(SUBSTR(json_extract(payload_json, '$.id'), 5) AS INTEGER)) FROM memory_entries WHERE type = 'bug' AND json_extract(payload_json, '$.id') LIKE 'BUG-%';" 2>/dev/null || echo "0")

BUG_NUM=$((${MAX_BUG:-0} + 1))

sqlite3 "$DB_PATH" "BEGIN TRANSACTION;"

# Process each defect
inserted=0
echo "$defects" | while IFS=$'\t' read -r defId area severity status description discoveredIn; do
  if [ -z "$defId" ]; then continue; fi

  BUG_ID=$(printf "BUG-%03d" "$BUG_NUM")
  ENTRY_ID=$(python3 -c "import uuid; print(str(uuid.uuid4()))")
  NOW=$(date +%s000)

  # Escape single quotes
  desc_escaped="${description//\'/\'\'}"
  area_escaped="${area//\'/\'\'}"
  disc_escaped="${discoveredIn//\'/\'\'}"

  PAYLOAD="{\"kind\":\"bug\",\"id\":\"$BUG_ID\",\"description\":\"$desc_escaped\",\"severity\":\"$severity\",\"status\":\"$status\",\"area\":\"$area_escaped\",\"discoveredIn\":\"$disc_escaped\",\"notes\":\"Imported from OKR.AI DEFECT_LIST\"}"

  TITLE="$BUG_ID — ${description:0:80}"
  TITLE_ESC="${TITLE//\'/\'\'}"

  sqlite3 "$DB_PATH" <<EOF
INSERT INTO memory_entries (id, type, title, body, payload_json, created_at, updated_at)
VALUES ('$ENTRY_ID', 'bug', '$TITLE_ESC', '$desc_escaped', '$PAYLOAD', $NOW, $NOW);
INSERT INTO memory_links (from_id, to_id, kind) VALUES ('$ENTRY_ID', '$PROJECT_ID', 'derives-from');
EOF

  inserted=$((inserted + 1))
  BUG_NUM=$((BUG_NUM + 1))

  if [ $((inserted % 5)) -eq 0 ]; then
    echo "  Inserted $inserted/$count bugs..."
  fi
done

sqlite3 "$DB_PATH" "COMMIT;"

echo "✅ Successfully inserted $inserted bugs!"
echo ""
echo "🎯 Next steps:"
echo "   1. Open edgenta_OKR in VS Code with DeliveryOS extension"
echo "   2. Run cmd: deliveryos.bug.open to open the bug panel"
echo "   3. Assign, fix, and verify bugs to test the iteration loop"
