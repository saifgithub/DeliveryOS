# MABP — Process Diagram

End-to-end flow of the Multi-Agent Build Process: Phase A (planning) → Phase B (build cycle) with the §16 autonomous acceptance gate. Source: [MULTI_AGENT_BUILD_PROCESS.md](MULTI_AGENT_BUILD_PROCESS.md).

> **Viewing:** open the markdown preview (VS Code: `Cmd+Shift+V`, or the preview icon top-right of the editor). The diagram renders inline.

```mermaid
flowchart TD
    subgraph A["Phase A — Planning (track O)"]
        A1[4-prompt loop:<br/>chunk · expand · validate · iterate] --> A2[chunks/ specs + READY.md<br/>dependency order]
    end

    A2 --> B0

    subgraph B["Phase B — Build cycle (track R), one chunk at a time"]
        B0[Architect picks next chunk<br/>from BUILD_STATUS.md] --> B1[Architect pre-fire audit<br/>+ interpret each check]
        B1 -->|drift| B1f[Fix chunk spec] --> B1
        B1 -->|clean| B2[Architect writes builder invocation<br/>≤80 lines, design-quality stance, tier]
        B2 --> B3[[Builder sub-agent]]
        B3 --> B4[Re-run audit · write code+tests<br/>unit suite + extension smoke<br/>evidence manifest + hot spots]
        B4 -->|ambiguity| BLK[BLOCKER file]
        BLK --> B0
        B4 -->|report closed| B5[Architect writes verifier invocations<br/>G1–G4 + Pass-0 blind authoring]
        B5 --> B6[[≥2 QA verifiers, blind & independent]]
        B6 --> B7[Pass 0: author executable checks<br/>Pass 1: FAILED-until-proven re-verify<br/>Pass 2: hot-spot reconciliation]
        B7 --> GATE{{Non-agentic gate:<br/>run checks · exit code}}
    end

    GATE -->|green + verifiers converged| V1[Auto-advance:<br/>sync BUILD_STATUS.md, confirm commit<br/>~0 human touch]
    GATE -->|check fails / verifiers disagree| V2[Divergence:<br/>fix_prompt vK ≤60 lines] --> B0
    GATE -->|stuck / v4 cap| V3[Escalate to stakeholder<br/>AskUserQuestion]

    V1 --> SAMPLE{Random sample audit?}
    SAMPLE -->|selected| HUMAN[Human spot-check<br/>rows derived from spec]
    SAMPLE -->|no| NEXT[Next chunk]
    HUMAN -->|fail| V2
    HUMAN -->|pass| NEXT
    NEXT --> B0

    V3 -.->|keep / redesign / re-plan / park| B0
```

## Session topology

```mermaid
flowchart TD
    SH[Stakeholder / human<br/>owns intent + final adjudication]
    SH -->|talks only to| AR[Architect<br/>sustained session, only stateful agent]
    AR -->|AskUserQuestion| SH
    AR -->|Agent tool, fresh per chunk| BD[[Builder sub-agent]]
    AR -->|Agent tool, fresh per chunk| QA[[QA verifiers ×N]]
    BD -.no shared memory.- QA
    AR --- ST[(BUILD_STATUS.md +<br/>chunk specs = durable state)]
```
