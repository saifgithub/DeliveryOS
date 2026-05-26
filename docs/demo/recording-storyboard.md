# DeliveryOS — Demo Recording Storyboard

**Version:** 1.0 — CHUNK-16
**Target duration:** 3:30 (hard cap 5:00)
**Workspace:** `examples/bug-triage/` (pre-seeded state from CHUNK-15)
**Pre-recording checklist:**
- [ ] Dark Modern theme active, font size 16pt minimum
- [ ] Cursor highlight enabled (yellow ring, Accessibility → Pointer)
- [ ] All unrelated tabs and terminal sessions closed
- [ ] Bug Triage workspace pre-seeded (run `npm run seed` in `examples/bug-triage/`)
- [ ] Claude Code installed and authenticated
- [ ] DeliveryOS dev build active (F5 in VS Code, or sideloaded `.vsix`)
- [ ] Mic test done — no background noise, Voice Isolation enabled
- [ ] QuickTime screen recording ready (or OBS if multi-source needed)
- [ ] Phone voice-memo running as audio fallback

---

## Scene-by-scene breakdown

### Scene 1 — Title card + thesis hook

**Duration:** 0:15
**What's on screen:** Static title card. Text: "DeliveryOS — a harness around your harness." DeliveryOS logo (or text-only if logo not ready). Black background.

**Voiceover:**
> "The model is not the product. The harness around the model is the product. DeliveryOS is the SDLC harness above the coding harnesses you already use."

**Cut cue:** fade to VS Code after 0:15.

**Notes:** This card sets the thesis before the demo starts. Do not skip it — first 15 seconds is when viewers decide whether to continue. Keep it clean; no animation needed.

---

### Scene 2 — Cold open: activity bar

**Duration:** 0:15
**What's on screen:** Empty VS Code window. User clicks the DeliveryOS icon in the activity bar. The four-stage sidebar (DISCOVER → DEFINE → EXECUTE → VERIFY) expands. Bug Triage project is visible at the top of the tree.

**Voiceover:**
> "Four stages. One extension. Every coding harness. Let's walk a requirement from raw idea to verified release."

**Cut cue:** click DISCOVER in the tree to open the panel.

**Notes:** The sidebar must already show the Bug Triage project name — that's the pre-seeded state. Do not start from an empty "no project" welcome view. Ensure all four stages are visible without scrolling.

---

### Scene 3 — DISCOVER: raw idea to discovery record

**Duration:** 0:30
**What's on screen:** DISCOVER panel open. "Raw Idea" tab shows pre-seeded idea text: "I want a bug triage assistant." User scrolls down to show the completed Discovery Record (pre-seeded).

**Voiceover:**
> "We start with a raw idea — just a sentence. DeliveryOS runs a structured discovery interview to turn that sentence into a record of goals, constraints, and scope. The result is the Discovery Record. Everything downstream is traceable back to this."

**Cut cue:** click DEFINE in the tree.

**Notes:** Do not re-run the discovery interview live — it takes too long. Use the pre-seeded discovery record. Jump-cut if needed from the raw idea to the finished record. The point is showing the artefact, not the process.

---

### Scene 4 — DEFINE: PRD and requirements

**Duration:** 0:30
**What's on screen:** PRD editor open. Scroll through the draft PRD quickly (2–3 seconds). Then switch to the Requirements Catalogue view showing three requirements: REQ-001 (bug submission API), REQ-002 (triage status updates), REQ-003 (notification emails). All three visible in the tree.

**Voiceover:**
> "The discovery record feeds a structured PRD. The PRD decomposes into a requirements catalogue. Three requirements for Bug Triage — each one traceable back to the PRD section that spawned it."

**Cut cue:** click REQ-001 in the tree to select it, then open the Test Designer output.

**Notes:** The requirements must already be seeded. Expand all nodes in the requirements tree before recording so the hierarchy is visible. One-line voiceover per requirement is enough — do not read requirement titles aloud.

---

### Scene 5 — Test Designer: test spec for REQ-001

**Duration:** 0:20
**What's on screen:** Test spec markdown for REQ-001 rendered in the webview. Show: test ID, description, given/when/then structure, expected assertion.

**Voiceover:**
> "Before the coding harness runs, we generate a test specification. Test-first thinking, baked into the brief. The harness knows what success looks like before it writes a line."

**Cut cue:** close the test spec, open the Execution Brief composer for REQ-001.

**Notes:** Scroll slowly enough that viewers can read at least one test case. The given/when/then structure is visually distinctive — let it land.

---

### Scene 6 — EXECUTE: Execution Brief with Forbidden files

**Duration:** 0:30
**What's on screen:** Execution Brief composer open for REQ-001. Scroll to show both the Allowed section (green border: `src/backend/api/bugs.py`, `tests/`) and the Forbidden section (red border: `migrations/`, `src/backend/api/users.py`, `src/frontend/`). Pause on the Forbidden section.

**Voiceover:**
> "Here's the Execution Brief. The brief tells the coding harness what to build, which files it's allowed to touch, and — this is the load-bearing part — which files are absolutely forbidden. Watch what happens when Claude Code tries to touch one of those forbidden files."

**Cut cue:** open an integrated terminal.

**Notes:** Zoom in (Cmd+= two notches) on the Forbidden section before the voiceover line "this is the load-bearing part." The red border must be visible. Do not rush past this — it's the setup for the headline moment.

---

### Scene 7 — Launch Claude Code

**Duration:** 0:15
**What's on screen:** Integrated terminal opens. The brief reference command is pre-typed (or user clicks "Run brief with Claude Code" from the brief composer). Claude Code starts and acknowledges the brief.

**Voiceover:**
> "One command. The brief reference is pre-populated. Claude Code picks it up."

**Cut cue:** Claude Code begins working.

**Notes:** The command should appear via the "Run brief with Claude Code" button in the brief composer — demonstrate that the handoff is one click, not manual copy-paste. If the button is not wired in the current build, type the command; the important thing is that the brief path is visible in the terminal.

---

### Scene 8 — HEADLINE: PreToolUse hook blocks a forbidden write

**Duration:** 0:30
**What's on screen:** Claude Code attempts to write to `src/backend/api/users.py`. The PreToolUse hook fires. The terminal shows the block message. The diff/violation panel in DeliveryOS opens automatically, showing: the blocked file path, the attempted change, and the reason ("File is in the Forbidden list for this brief").

**Voiceover:**
> "DeliveryOS just stopped the model from writing to users.py. Not after the fact — at the moment of the write, before the file was touched. The PreToolUse hook fires in Claude Code's settings.json. The file is clean."

**Hold:** 2 seconds of silence after the voiceover line. Let the blocked-write panel sit on screen. This is the moment. Do not rush it.

**Cut cue:** brief pause, then cut to the corrected run.

**Notes:** This is the whole point of the demo. Hold on the violation panel long enough for viewers to read the file path and the reason. If Claude Code's response is non-deterministic and it doesn't attempt to write the forbidden file in take 1 or take 2, fall back to a single canned response for the forbidden-file write. The PreToolUse hook itself is deterministic — it fires on any write attempt to a forbidden path.

---

### Scene 9 — Successful re-run

**Duration:** 0:20
**What's on screen:** Jump-cut. Claude Code completes the run against the corrected brief (with the users.py file explicitly excluded). Terminal shows completion. No violation in the diff panel.

**Voiceover:**
> "The brief is updated. Claude Code runs again — this time clean. The result lands in the handoff directory."

**Cut cue:** switch to VERIFY stage in the DeliveryOS tree.

**Notes:** Jump-cut is fine here. The viewer understands the pattern. Do not show the full re-run in real time.

---

### Scene 10 — VERIFY: result captured, checks pass

**Duration:** 0:20
**What's on screen:** VERIFY panel. Show: result captured indicator (green), test spec pass count, diff summary (modified files, all within the Allowed list). All checks green.

**Voiceover:**
> "Result captured. Test spec passes. Every modified file is in the Allowed list. The diff is clean. DeliveryOS has verified the run."

**Cut cue:** click "Open Release Evidence" in the VERIFY stage.

**Notes:** The green checks are the visual payoff. Pause for a moment before the voiceover so viewers can see the state before hearing it described.

---

### Scene 11 — Release Evidence

**Duration:** 0:15
**What's on screen:** Release Evidence document rendered in the webview. Scroll once from top to bottom. Visible sections: Intent → PRD reference → Requirement → Test spec → Result → Verification → Commit hash.

**Voiceover:**
> "Every artefact. Traceable. From raw idea to verified release — with a full chain of evidence that survives every session."

**Cut cue:** switch to the DeliveryOS repo's own `docs/planning/` tree.

**Notes:** Slow scroll — this is the wrap-up beat, not a highlight. Viewers should be able to see the traceability chain even if they can't read the text at normal playback speed.

---

### Scene 12 — Dogfooding callout

**Duration:** 0:15
**What's on screen:** VS Code window switches to the DeliveryOS repo itself. Show the `docs/planning/` tree in the file explorer. Click on `part-1-plan.md` and `chunks/` directory. Then click on `chunk-16-demo-recording.md` — the spec for this recording.

**Voiceover:**
> "Everything you just watched — DeliveryOS planned its own build the same way. The planning directory is the proof. The chunk spec for this demo is in there. Verifiable in two clicks."

**Cut cue:** switch to a plain screen for the outro.

**Notes:** This beat is the most important credibility signal for the target audience (AI company builders, technical PMs). Do not skip it even if the overall take is running long. Trim from scene 9 or 10 instead.

---

### Scene 13 — Outro: install + repo

**Duration:** 0:15
**What's on screen:** Plain screen. Text:

```
curl -fsSL https://github.com/saifgithub/deliveryos/releases/download/v0.1.0/install.sh | sh

github.com/saifgithub/deliveryos
```

**Voiceover:**
> "Sideload the .vsix into VS Code, Cursor, Windsurf, VSCodium, or Antigravity. One command. Link in the description."

**Cut cue:** end card (2 seconds, no voiceover).

**Notes:** End card should be the repo URL only. No music, no animation, no subscribe CTA. The audience for this demo is developers; they don't need persuasion to find a GitHub link.

---

## Total target: 3:30

| Scene | Duration | Cumulative |
| --- | ---: | ---: |
| 1 — Title card | 0:15 | 0:15 |
| 2 — Activity bar | 0:15 | 0:30 |
| 3 — DISCOVER | 0:30 | 1:00 |
| 4 — DEFINE | 0:30 | 1:30 |
| 5 — Test Designer | 0:20 | 1:50 |
| 6 — Execution Brief | 0:30 | 2:20 |
| 7 — Launch | 0:15 | 2:35 |
| 8 — HEADLINE: hook fires | 0:30 | 3:05 |
| 9 — Re-run | 0:20 | 3:25 |
| 10 — VERIFY | 0:20 | 3:45 |
| 11 — Release Evidence | 0:15 | 4:00 |
| 12 — Dogfooding | 0:15 | 4:15 |
| 13 — Outro | 0:15 | 4:30 |

If running long: trim scene 9 to 0:10 (jump-cut only) and scene 10 to 0:15. Target floor is 3:00; hard cap is 5:00.

---

## Take strategy

- Plan 2–3 full takes. Pick the best.
- Do not edit-stitch from multiple takes if avoidable — audio mismatches are jarring.
- "Good enough to be credible" beats "polished but late." If take 3 is acceptable, ship take 3.
- The on-camera Claude Code run in scene 8 must be live. The PreToolUse hook is deterministic; only Claude Code's file-choice is non-deterministic. If takes 1–3 all fail to produce the forbidden-file write, use a single canned response for that one scene and do not disclose this.
- After recording: export at 1080p H.264, AAC, ≤100 MB. Upload to YouTube as Unlisted. Save a local copy as `demo.mp4` for the release attachment.

---

## YouTube description template

```
DeliveryOS — a harness around your harness.

DeliveryOS turns raw software intent into verified Execution Briefs for AI coding agents (Claude Code, Codex, Cursor), then preserves the memory, validation, and release evidence around their work.

0:00 — Thesis: the model is not the product
0:30 — DISCOVER: raw idea to discovery record
1:00 — DEFINE: PRD and requirements
1:50 — Test Designer: test-first thinking baked into the brief
2:20 — EXECUTE: Execution Brief with Allowed/Forbidden files
2:35 — Claude Code runs
3:05 — PreToolUse hook blocks a forbidden write (headline moment)
3:25 — Successful re-run
3:45 — VERIFY: result captured, checks pass
4:00 — Release Evidence: full traceability chain
4:15 — Dogfooding callout
4:30 — Install

Install: https://github.com/saifgithub/deliveryos/releases/latest
Source: https://github.com/saifgithub/deliveryos
Essay: https://github.com/saifgithub/deliveryos/blob/main/docs/essay/meta-harness.md
```
