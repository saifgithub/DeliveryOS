#!/bin/sh
# check_bindings.sh - the stand-up verdict for this orchestration tree (install/INSTALL_INTERVIEW.md
# phase 9). PORTABLE CORE: copy verbatim. The ONE thing it must be is non-agentic — an agent's
# summary of a stand-up is the same class of claim as an agent's summary of a test run, which is
# what this whole protocol exists to get underneath. Its EXIT CODE is the verdict.
#
# Six checks. Any failure -> exit 1 and a named reason.
#   1  every row name in each *.TEMPLATE.md is present in the file emitted from it
#   2  no <UNBOUND> markers remain outside install/templates/
#   3  roster owns: sets are pairwise disjoint, and the grammar is machine-parseable
#   4  the honesty grep: this project's own name/hosts/stakeholder must not appear in tier A
#   5  harness/tool/model names must not appear in tier A  (this is what "any LLM" means)
#   6  incident-narration heuristic over tier A            (advisory: warns, never fails)
#
# Checks 4 and 5 need the needles from interview phase 1. Fill NEEDLE_* below. LEAVING THEM EMPTY
# IS ITSELF A FAILURE — an empty needle set silently passes everything, which is worse than not
# running the check, because it prints a pass.
#
# Usage:  sh install/check_bindings.sh [-v]
# Exit:   0 all checks pass · 1 a check failed · 2 bad usage or the tree is not where expected
set -u

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ORCH=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
TEMPLATES="$SCRIPT_DIR/templates"
VERBOSE=0; [ "${1:-}" = "-v" ] && VERBOSE=1

# --- FILL THESE AT STAND-UP (interview phase 1) --------------------------------------------------
# Extended-regex alternations. Every spelling and casing that could appear in a file.
NEEDLE_PROJECT=""     # this project's name, in every form
NEEDLE_HOSTS=""       # hosts, domains, environment names
NEEDLE_PERSON=""      # the stakeholder's name
NEEDLE_HARNESS=""     # harness / CLI / tool / model names in play here  (<HARNESS_TERMS>)
# ------------------------------------------------------------------------------------------------

fails=0
FLIST=${TMPDIR:-/tmp}/.cb_files_$$
trap 'rm -f "$FLIST"' EXIT INT TERM
note() { [ "$VERBOSE" -eq 1 ] && echo "    $*"; return 0; }
fail() { echo "FAIL  $*"; fails=$((fails+1)); }
pass() { echo "ok    $*"; }

# Tier A — the copy-verbatim set. Keep in step with PORTABLE_MANIFEST.md's tier-A list.
tier_a() {
  find "$ORCH" \
    -path "$ORCH/install/templates" -prune -o \
    -path "$ORCH/dispatch/roster" -prune -o \
    -path "$ORCH/dispatch/lanes" -prune -o \
    -path "$ORCH/dispatch/intake" -prune -o \
    -path "$ORCH/audit/cr" -prune -o \
    -path "$ORCH/audit/runs" -prune -o \
    -path "$ORCH/audit/trail" -prune -o \
    -path "$ORCH/audit/regression" -prune -o \
    -path "$ORCH/audit/acceptance" -prune -o \
    -path "$ORCH/history/lanes" -prune -o \
    -path "$ORCH/history/trail" -prune -o \
    -name "*BINDINGS*.md" -prune -o \
    -name "board.md" -prune -o \
    -name "trail.md" -prune -o \
    -name "audit-trail.md" -prune -o \
    -name "ANSWERS.md" -prune -o \
    -name "gate_check.sh" -prune -o \
    -type f \( -name "*.md" -o -name "*.sh" -o -name "*.py" \) -print
}

# --- 1. every template row name survived into the file emitted from it ---------------------------
# A template row name is a `| `<TOKEN>` |` or `**Name**` cell. The emitted file must still contain
# it; a row silently dropped during emission is a binding nobody will notice is missing.
# A template's EMITS-TO: header is one of three forms:
#   an in-tree path       dispatch/BINDINGS.md
#   an in-tree glob       audit/*_BINDINGS.md   dispatch/roster/*.md   (>=1 match required)
#   <interview-bound>     emitted OUTSIDE the tree; the interview must record where, as an
#                         `EMITTED: <template> -> <path>` line in install/ANSWERS.md
# The third form is why ANSWERS.md is load-bearing rather than a transcript: without it, a template
# that emits outside the tree cannot be checked at all, and an unfindable file passes by default.
check_rows() {
  [ -d "$TEMPLATES" ] || { fail "1 rows: no install/templates/ — the kit is incomplete"; return; }
  answers="$SCRIPT_DIR/ANSWERS.md"
  ok=1
  for t in "$TEMPLATES"/*.TEMPLATE.md; do
    [ -f "$t" ] || continue
    base=$(basename "$t" .TEMPLATE.md)
    target=$(grep -Eo '^EMITS-TO: *.+' "$t" 2>/dev/null | head -1 | sed 's/^EMITS-TO: *//; s/ *$//')
    [ -n "$target" ] || { fail "1 rows: $base has no EMITS-TO: header"; ok=0; continue; }

    if [ "$target" = "<interview-bound>" ]; then
      if [ ! -f "$answers" ]; then
        fail "1 rows: $base emits outside the tree and install/ANSWERS.md does not exist, so where"
        echo "        it went is unrecorded and uncheckable"; ok=0; continue
      fi
      line=$(grep -E "^EMITTED: *$base *-> *" "$answers" 2>/dev/null | head -1)
      if [ -z "$line" ]; then
        fail "1 rows: $base emits outside the tree; ANSWERS.md has no 'EMITTED: $base -> <path>' line"
        ok=0; continue
      fi
      p=$(printf '%s' "$line" | sed "s/^EMITTED: *$base *-> *//; s/ *$//")
      case "$p" in /*) f="$p" ;; *) f="$ORCH/../$p" ;; esac
      [ -f "$f" ] || { fail "1 rows: $base was emitted to $p, which does not exist"; ok=0; continue; }
      printf '%s\n' "$f" > "$FLIST"
    else
      # Glob from INSIDE the tree, then re-prefix. Expanding "$ORCH/$target" unquoted would word-split
      # on a space anywhere in the repo's own path, which is a real and silent way for every check to
      # report "matches no file" on a tree that is perfectly fine.
      ( cd "$ORCH" 2>/dev/null && ls -1d $target 2>/dev/null ) | sed "s|^|$ORCH/|" > "$FLIST"
      [ -s "$FLIST" ] || { fail "1 rows: $base emits to $target, which matches no file"; ok=0; continue; }
    fi

    toks=$(grep -Eo '`<[A-Z_]+>`' "$t" 2>/dev/null | sort -u)
    [ -n "$toks" ] || continue
    while IFS= read -r f; do
      [ -f "$f" ] || continue
      for tok in $toks; do
        grep -qF "$tok" "$f" || { fail "1 rows: $(basename "$f") is missing $tok (from $base)"; ok=0; }
      done
    done < "$FLIST"
  done
  rm -f "$FLIST"
  [ "$ok" -eq 1 ] && pass "1 rows: every template row present in the file emitted from it"
}

# --- 2. no <UNBOUND> markers outside the templates ----------------------------------------------
# Scoped to exclude install/templates/, which is SUPPOSED to be full of them. Unscoped, this check
# can never pass, and a check that can never pass gets disabled rather than fixed.
check_unbound() {
  # Excludes install/templates/ (supposed to be full of them) and this script (which names the
  # marker in order to search for it — a checker matching itself is noise, not a finding).
  hits=$(grep -rl "<UNBOUND>" "$ORCH" 2>/dev/null | grep -v "^$TEMPLATES/" | grep -v "^$SCRIPT_DIR/check_bindings.sh$" || true)
  if [ -n "$hits" ]; then
    fail "2 unbound: <UNBOUND> remains in:"; echo "$hits" | sed 's/^/        /'
  else
    pass "2 unbound: no <UNBOUND> outside install/templates/"
  fi
}

# --- 3. roster owns: disjointness + grammar -----------------------------------------------------
# Grammar first, because disjointness is not computable without it: one glob per line, no braces,
# no inline prose. Then pairwise comparison of the literal glob strings.
check_owns() {
  R="$ORCH/dispatch/roster"
  [ -d "$R" ] || { fail "3 owns: no dispatch/roster/ — no instances are defined"; return; }
  n=0; bad=0
  tmp=/tmp/.cb_owns_$$; : > "$tmp"
  for f in "$R"/*.md; do
    [ -f "$f" ] || continue
    n=$((n+1))
    id=$(basename "$f" .md)
    # owns: block = the owns: line plus following indented lines, until the next `key:` at col 0-ish.
    awk '/^owns:/{o=1;sub(/^owns: */,"");if(length($0))print;next}
         o&&/^[a-z_]+:/{o=0}
         o{sub(/^ +/,"");if(length($0))print}' "$f" > "$tmp.one"
    while IFS= read -r g; do
      case "$g" in
        \#*) continue ;;
        "") continue ;;
        *[\{\}]*) fail "3 owns: $id has brace expansion in owns: -> $g"; bad=$((bad+1)); continue ;;
        *\ *)     fail "3 owns: $id has prose or two globs on one owns: line -> $g"; bad=$((bad+1)); continue ;;
      esac
      echo "$id	$g" >> "$tmp"
    done < "$tmp.one"
    rm -f "$tmp.one"
  done
  [ "$n" -eq 0 ] && { fail "3 owns: dispatch/roster/ is empty"; rm -f "$tmp"; return; }
  dupes=$(cut -f2 "$tmp" | sort | uniq -d)
  if [ -n "$dupes" ]; then
    echo "$dupes" | while IFS= read -r g; do
      owners=$(grep -F "	$g" "$tmp" | cut -f1 | tr '\n' ' ')
      echo "OVERLAP $g claimed by: $owners"
    done | sed 's/^/        /'
    fail "3 owns: owned-path sets are not disjoint (see above)"
  elif [ "$bad" -eq 0 ]; then
    pass "3 owns: $n instance(s), grammar clean, owned paths disjoint"
  fi
  rm -f "$tmp"
}

# --- 4/5. the honesty greps ----------------------------------------------------------------------
grep_tier_a() {  # $1=label $2=needles
  if [ -z "$2" ]; then
    fail "$1: needle set is EMPTY — fill it at stand-up (interview phase 1). An empty needle set
        passes everything and prints a pass, which is worse than not checking."
    return
  fi
  # NOT `tier_a | xargs grep` — xargs splits on whitespace, so any space in the repo's own path
  # silently turns every filename into two nonexistent ones and the check passes on nothing.
  hits=$(tier_a | while IFS= read -r f; do grep -niE "$2" "$f" 2>/dev/null | sed "s|^|$f:|"; done)
  if [ -n "$hits" ]; then
    fail "$1: found in tier A:"; echo "$hits" | sed 's/^/        /'
  else
    pass "$1: clean across tier A"
  fi
}

# --- 6. incident narration (advisory) ------------------------------------------------------------
# PORTABLE_MANIFEST.md invariant 2 bans narrated incidents in tier A. It cannot be checked exactly —
# this is a heuristic over the phrasings a narrated incident tends to use. It WARNS and never fails,
# because a false positive that blocks a stand-up is a check people delete.
check_narration() {
  pat="(this once|we (once|had|hit|lost|saw)|last (week|month|time)|on one occasion|there was a time|stranded (a|the)|for ~?[0-9]+ ?(h|hr|hours|min|minutes)|in practice we)"
  hits=$(tier_a | while IFS= read -r f; do grep -niE "$pat" "$f" 2>/dev/null | sed "s|^|$f:|"; done)
  if [ -n "$hits" ]; then
    echo "warn  6 narration: possible incident narration in tier A (invariant 2) — review, do not"
    echo "        auto-edit. Keep the rule; move the anecdote to BINDINGS or the commit log."
    echo "$hits" | sed 's/^/        /'
  else
    pass "6 narration: no incident-narration phrasing detected in tier A"
  fi
}

echo "check_bindings.sh — orchestration stand-up verdict"
echo "tree: $ORCH"
echo
check_rows
check_unbound
check_owns
PROJECT_NEEDLES=$(echo "$NEEDLE_PROJECT|$NEEDLE_HOSTS|$NEEDLE_PERSON" | sed 's/||*/|/g; s/^|//; s/|$//')
grep_tier_a "4 project" "$PROJECT_NEEDLES"
grep_tier_a "5 harness" "$NEEDLE_HARNESS"
check_narration
echo

if [ "$fails" -gt 0 ]; then
  echo "STAND-UP INCOMPLETE — $fails check(s) failed."
  exit 1
fi
echo "STAND-UP COMPLETE — all checks pass."
exit 0
