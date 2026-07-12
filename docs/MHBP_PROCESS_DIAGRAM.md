# MHBP — Process Diagram

Multi-**Harness** Build Process: a foreign harness — **Antigravity (`agy`, Gemini)** — bolted onto the unchanged MABP baseline as an adversarial, decorrelated auditor at three layers (Gate 1, the serial per-chunk loop, Gate 2), plus a black-box **Tester (Part III)** that exercises each completed module as the user and loops defects back to the builder. Source: [MHBP_LAB.md](MHBP_LAB.md).

> **Experimental / non-normative.** The production process ([MULTI_AGENT_BUILD_PROCESS.md](MULTI_AGENT_BUILD_PROCESS.md)) and `npm run gate` are the binding floor; the foreign audit is advisory signal layered on top.
>
> **Viewing:** open the markdown preview (VS Code: `Cmd+Shift+V`). The diagrams render inline.

## End-to-end: three layers around a serial build

```mermaid
flowchart TD
    PLAN[PLAN<br/>chunk specs + READY.md]

    PLAN --> G1

    subgraph G1box["GATE 1 — HARD SYNCHRONOUS barrier (Design → Build)"]
        G1[Auditor attacks the plan<br/>agy · Gemini 3.1 Pro High · read-only<br/>--add-dir docs/planning]
        G1 --> G1A{Blocking findings?}
        G1A -->|none| PASS1[Cleared]
        G1A -->|open + human present| HUM1[Human adjudicates ONCE<br/>revise / accept / dated rebuttal]
        G1A -->|open + no human| PARK1[Build PARKED<br/>never auto-passes]
        HUM1 -->|cleared| PASS1
    end

    PASS1 --> LOOP

    subgraph LOOP["PART II — SERIAL per-chunk loop (one chunk in flight)"]
        direction TB
        C0[Pick next chunk in dependency order] --> CB[Builder builds<br/>writes UNIT.builder.md · SUBMITTED round N]
        CB -->|auditor watcher fires| CA[Auditor audits independently<br/>blind adversarial pass · re-read source at file:line]
        CA --> CAW[writes UNIT.auditor.md · VERDICT + AUDITOR: own/foreign/human]
        CAW -->|builder watcher fires| CV{Verdict}
        CV -->|AWAITING_FIXES| CB
        CV -->|COMPLETE| C0
        CV -->|blocking / borderline| PARKC[Park chunk → escalation queue<br/>serial = parked chunk holds the line]
        PARKC -.human drains / fallback.-> C0
    end

    LOOP --> MOD{All chunks of<br/>the module COMPLETE?}
    MOD -->|no — keep building chunks| LOOP
    MOD -->|yes — assemble module| TEST

    subgraph TESTbox["PART III — per-module Tester (black-box · represents the USER)"]
        TEST[Tester drives EXPOSED SURFACES only<br/>never reads code to design a test] --> TMODE[exploratory user journeys + edge cases<br/>+ authored module-level integration checks]
        TMODE --> TV{VERDICT}
        TV -->|DEFECTS round N| TROUTE[Architect routes each defect<br/>to the responsible chunk]
        TV -->|_v4 cap| TESC[Escalate to human]
        TV -->|ACCEPTED| TDONE[Module done → next module]
    end

    TROUTE -.re-fire chunk through §5 build↔audit.-> LOOP
    TDONE --> G2

    subgraph G2box["GATE 2 — post-build whole-artifact audit (optional)"]
        G2[Auditor reads TOUCHED-FILES manifest<br/>built mechanically: git diff --name-only<br/>COMPLETENESS + ACCURACY · severity-tagged]
    end

    G2 --> ROUTE[Architect routes findings:<br/>fix-loop / dated rebuttal in BUILD_STATUS / escalate]

    GATE[(npm run gate<br/>non-agentic binding floor —<br/>no auditor ever edits or runs it)]
    GATE -.stays the machine floor under all of this.- LOOP
```

## The semaphore handshake (why Run-1 stalled)

State is **derived** from two files per chunk — no shared mutable flag. Each role runs a **mandatory background watcher** on its inbound file; skipping the watcher is what stalled Run-1.

Concrete mechanism: `docs/build/auditor/PROTOCOL.md` (portable kernel, DeliveryOS is the canonical
origin) + `DELIVERYOS_BINDINGS.md` (this project's resolution). Loop prompts: `ARCHITECT_LOOP_PROMPT.md`
/ `AUDITOR_LOOP_PROMPT.md`. Watcher: `watcher.sh`.

```mermaid
sequenceDiagram
    participant B as Builder (Claude)
    participant FS as lanes/UNIT.*.md
    participant A as Auditor (agy / peer / human)

    Note over B,A: each side has a background watcher on its inbound file
    B->>FS: write UNIT.builder.md (SUBMITTED round N)
    FS-->>A: auditor's watcher fires (AWAITING_AUDIT)
    A->>A: independent blind audit (atomic write: .partial → rename)
    A->>FS: write UNIT.auditor.md (VERDICT round N)
    FS-->>B: builder's watcher fires
    alt VERDICT = AWAITING_FIXES
        B->>FS: re-submit round N+1 (same chunk)
    else VERDICT = COMPLETE
        Note over B,A: advance to next chunk (serial)
    end
```

## Pluggable auditor — own / foreign / human

The chunk's auditor is a **role**; the `AUDITOR:` field records who ruled. Decorrelation comes from the **model family**, not from withholding context.

```mermaid
flowchart TD
    ROLE{Auditor role per chunk}
    ROLE -->|foreign · decorrelation tier| AGY[Antigravity agy · Gemini<br/>NON-Claude required — Claude model voids the run<br/>risk-flagged chunks, seams, random sample]
    ROLE -->|own · same family| PEER[Claude blind peer §16.4<br/>cheap, native — NOT decorrelated]
    ROLE -->|human · async floor| HU[Human<br/>drains escalations + borderline parks]

    AGY -.quota out / outage.-> FB[Fallback: Claude blind pass<br/>logged 'own — agy unavailable'<br/>earns NO foreign catch]
    FB --- PEER
```

## Part III — the per-module Tester loop (the new outer loop)

The per-chunk build↔audit loop is the **inner** loop; the Tester wraps it in an **outer** module-level loop. The Tester is black-box (exposed surfaces only, represents the user) and feeds defects back to the builder via the architect. It is advisory — it never enters `npm run gate`.

```mermaid
flowchart TD
    subgraph INNER["Inner loop — per chunk (§5)"]
        IB[Builder builds chunk] <-->|build ↔ audit| IA[Auditor verdict<br/>COMPLETE / AWAITING_FIXES]
    end

    INNER -->|every chunk of the module COMPLETE| ASM[Assemble module / CR]
    ASM --> T

    subgraph OUTER["Outer loop — per module (§7)"]
        T[Tester · black-box · represents the user] --> TD{Module verdict}
        TD -->|ACCEPTED| DONE[Module done → next module]
        TD -->|DEFECTS round N| RT[Architect routes each defect<br/>to the responsible chunk]
        TD -->|round _v4| ESC[Escalate to human:<br/>iterate / redesign / re-plan / park]
    end

    RT -.re-fire chunk — re-audited, floor never bypassed.-> IB
```

### Pluggable Tester — design vs. execute

```mermaid
flowchart TD
    ROLE{Tester role per module}
    ROLE -->|foreign · doubly independent| AGY["agy / Gemini — DESIGNS<br/>different model family + code-blind by role<br/>read-only/isolated: can't drive a live editor"]
    ROLE -->|own · executes live| CL["Claude peer — EXECUTES<br/>@vscode/test-electron · sideload · surface exercise"]
    ROLE -->|human · async floor| HU["Human — adjudicates<br/>'defect or intended?'"]
    AGY -->|scenarios + integration checks| CL
    AGY -.quota out.-> FB["Fallback: Claude does both<br/>logged 'own — agy unavailable'<br/>no foreign catch credited"]
```
