# CHUNK-16 — Demo recording + README + essay + GitHub release publish

**Phase:** 4 (Demo and polish)
**Week:** 14 (target ship date 2026-08-24)
**Effort:** 4–5 session-days
**Status:** spec (Prompt 2)
**Depends on:** CHUNK-15 (Bug Triage demo runs cleanly end-to-end)
**Exposes:** nothing further — terminal chunk; produces the public artefacts (`v0.1.0` release, README, essay, demo video, screenshots).

---

## 1. Restated goal and scope

**Goal.** Ship the proof of work. By the end of this chunk, a stranger landing on the GitHub repo can:

1. Read the README and grok DeliveryOS in under two minutes.
2. Watch a 3–5 minute demo video that shows the full loop, including the headline diff/PreToolUse moment.
3. Install the `.vsix` from a tagged GitHub Release (`v0.1.0`) into VS Code, Cursor, Windsurf, VSCodium, or Antigravity using the install script from CHUNK-04.
4. Verify the artefact's SHA-256 hash.
5. Read a ~1500–2000-word essay that defends the meta-harness thesis and surfaces the dogfooding evidence.

This chunk is shipping and marketing, not engineering. No new product code lands. The only code-adjacent work is screenshot capture and minor copy fixes inside the running extension (e.g. typo corrections caught during the recording).

### In scope

- Record, edit, and publish a 3–5 minute demo video with voiceover.
- Capture and place 6+ screenshots into `docs/screenshots/`.
- Rewrite `README.md` to the public-launch shape (pitch → install → quick-start → screenshots → video → essay link → verification).
- Write the meta-harness essay at `docs/essay/meta-harness.md`.
- Write `docs/demo/recording-storyboard.md` as a per-take script.
- Tag `v0.1.0` and trigger the GitHub Action from CHUNK-04 to attach the `.vsix` and SHA-256 to a public Release page.
- Hand the repo URL to one non-DeliveryOS reader for a comprehension test.

### Out of scope

- OpenVSX publishing (deferred — research finding from ADR-0001).
- VS Code Marketplace listing.
- Auto-update beyond the in-extension version-check notification from CHUNK-04.
- Code signing.
- Any new product features. If the demo reveals a missing feature, file a follow-up; do not bend this chunk to fix it.
- API integration, MCP server, additional specialists, additional harness profiles.

### What success looks like

- `https://github.com/<owner>/deliveryos/releases/tag/v0.1.0` exists, has the `.vsix` attached, lists the SHA-256, links to install scripts, demo video, README, and essay.
- The demo video is reachable from the README (YouTube unlisted) with a self-hosted `.mp4` backup attached to the release.
- A stranger can install and run the demo from the README in under five minutes.

---

## 2. Demo video

### 2.1 Constraints

- **Length:** 3–5 minutes. Target 3:30. Hard cap 5:00.
- **Audio:** clear voiceover. Use a lapel mic (recommend Rode SmartLav+ or equivalent) if available; otherwise the built-in MacBook mic in a quiet room with `Compression: Voice Isolation` enabled. No background music.
- **Resolution:** 1920×1080 at 30fps minimum. Record at 2560×1440 if the display supports it and downscale; gives crisper text in compressed YouTube playback.
- **Cursor:** enable cursor highlight (System Settings → Accessibility → Pointer Size: medium, Pointer Color: yellow ring) so viewers can track clicks.
- **Editor theme:** dark theme, default VS Code "Dark Modern" or Cursor equivalent. High contrast, screenshot-friendly.
- **Font size:** bump editor and terminal to 16pt minimum so text reads at 1080p.

### 2.2 Tooling

- **Primary recommendation:** macOS QuickTime Player (File → New Screen Recording, full screen + internal microphone). Free, zero setup, ships with macOS.
- **Alternative:** OBS Studio if multi-source compositing (camera bug, separate mic track) is wanted. Heavier setup; only adopt if QuickTime's single-track output proves limiting in the edit.
- **Editing:** iMovie (already on macOS) or DaVinci Resolve free tier. The edit is cut-and-trim; no effects work needed. Add a 2-second title card at start ("DeliveryOS — a harness around your harness") and a 2-second end card with the repo URL.
- **Backup recorder:** run a phone voice-memo in parallel as audio fallback in case the screen recorder's mic channel fails.

### 2.3 Storyboard outline

Total target: 3:30. Cut to 3:00 if pacing allows; never exceed 5:00.

| # | Scene                                                                                  | Duration | Notes                                                                                                                                                                                                                                                              |
| - | -------------------------------------------------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 | Title card + thesis hook                                                                |    0:15  | "The model is not the product. The harness is the product. DeliveryOS is a harness around your harness." Hold on a static title card with the DeliveryOS logo (or text-only if no logo).                                                                          |
| 2 | Cold open: empty VS Code, click the DeliveryOS activity-bar icon                       |    0:15  | Show the four-stage sidebar (DISCOVER → DEFINE → EXECUTE → VERIFY). One sentence of voiceover: "Four stages, one extension, every coding harness."                                                                                                               |
| 3 | DISCOVER: paste raw idea "I want a bug triage assistant", run discovery interview      |    0:30  | Skip the actual back-and-forth (cut to canned answers from rehearsal mode if available, otherwise jump-cut). Show the resulting Discovery Record.                                                                                                                  |
| 4 | DEFINE: generate PRD, decompose into 3 requirements (REQ-001 bug submission API, etc.) |    0:30  | Quick PRD scroll. Then the requirements list rendered in the tree view. One-line voiceover per requirement.                                                                                                                                                       |
| 5 | Test Designer: generate test spec for REQ-001                                          |    0:20  | Show the test spec markdown. Voiceover: "Test-first thinking, baked into the brief."                                                                                                                                                                              |
| 6 | EXECUTE: Execution Brief composer with Allowed/Forbidden sections highlighted          |    0:30  | Zoom in (Cmd+= or video-editor zoom) on the Forbidden section. Voiceover: "Here's where it gets interesting. Watch what happens when Claude Code tries to touch a forbidden file."                                                                                |
| 7 | Launch Claude Code from the terminal integration                                       |    0:15  | One-click "Run brief with Claude Code" → terminal opens with the brief reference pre-typed.                                                                                                                                                                       |
| 8 | **HEADLINE MOMENT** — Claude Code modifies a forbidden file → PreToolUse hook blocks   |    0:30  | This is the whole point. Hold on the blocked-write moment. Voiceover: "DeliveryOS just stopped the model from writing to `migrations/`. Not after the fact — at the moment of the write."                                                                          |
| 9 | Fix and re-run successfully                                                            |    0:20  | Jump-cut. Show the successful completion.                                                                                                                                                                                                                          |
| 10 | VERIFY: result captured, test spec passes, diff is clean                              |    0:20  | The verification dashboard with green checks.                                                                                                                                                                                                                      |
| 11 | Release Evidence export                                                                |    0:15  | Open the generated `release-evidence.md`. Scroll once. Voiceover: "Every artefact, traceable. From raw idea to released change."                                                                                                                                  |
| 12 | Dogfooding callout                                                                     |    0:15  | Switch to the actual `docs/planning/` tree in the DeliveryOS repo itself. Voiceover: "Everything you just watched — DeliveryOS planned its own build the same way." Show `part-1-plan.md` and `chunks/` directory.                                                |
| 13 | Outro: install instructions + repo URL                                                 |    0:15  | One screen: `curl ... \| sh` or the GitHub Releases URL. Voiceover: "Sideload the .vsix, run in any of five editors. Link in the description."                                                                                                                    |

**Total:** ~3:30.

### 2.4 Upload targets

- **Primary:** YouTube, set to **Unlisted**. Embed the YouTube URL in the README via the standard `[![Demo](thumbnail.png)](https://youtu.be/<id>)` markdown pattern (GitHub does not iframe-embed YouTube; the thumbnail-click pattern is standard).
- **Backup:** the same video re-encoded to `.mp4` (H.264, AAC, ≤100 MB to fit a single Release asset comfortably) and attached to the `v0.1.0` GitHub Release alongside the `.vsix`. This guarantees the demo survives if YouTube takes the video down or the channel disappears.
- **Captions:** auto-generate on YouTube, then proofread and correct the auto-captions (10–15 minutes of cleanup). Captions matter for accessibility and for viewers watching with sound off.

### 2.5 Take strategy

- **Plan 2–3 full takes.** Pick the best. Do not edit-stitch from multiple takes if avoidable — small audio mismatches and pacing changes are jarring.
- **"Good enough to be credible" beats "polished but late."** If take 3 lands by Friday morning, ship it. Do not slip the chunk for take 4.
- **Rehearsal mode** (from CHUNK-15) is allowed off-camera to prime state, but the **on-camera Claude Code run must be live** — that's the load-bearing claim. If live runs prove too flaky for the headline moment, fall back to a single canned response on the forbidden-file write, and disclose nothing in the video; the PreToolUse hook fires deterministically.

---

## 3. README rewrite

### 3.1 Target shape

A single `README.md` at repo root. Target length **600–900 lines including screenshots** (each screenshot reference is ~3 lines, so allow ~30 lines of screenshot blocks).

Section order:

1. **Header** — name, one-line tagline ("A harness around your harness"), badges (license, latest release version, demo-video link).
2. **Hero screenshot** — the activity bar + tree view + one open webview, one shot, full editor frame.
3. **What is DeliveryOS?** — 3–4 paragraphs. Open with: "DeliveryOS turns raw software intent into verified Execution Briefs for AI coding agents, then preserves the memory, validation, and release evidence around their work." (Lifted from PRD § 1 with minor tightening.) Then: the harness-around-your-harness pitch. Then: who it's for (AI-native solo builder; technical PM; solution architect).
4. **The five-minute quick-start** — numbered, raw idea to release evidence:
   1. Install the `.vsix` (link to § 4 below).
   2. Open any VS Code-family editor in a project folder.
   3. Click the DeliveryOS activity-bar icon.
   4. Paste a raw idea into DISCOVER.
   5. Walk through DEFINE → EXECUTE → VERIFY using the manual AI flow.
   6. Export Release Evidence.
5. **Demo video** — embedded thumbnail-link to the YouTube unlisted upload. One sentence under it: "Three and a half minutes, end to end, including the moment DeliveryOS catches Claude Code touching a forbidden file."
6. **Install** — see § 4 below.
7. **Verify the download (SHA-256)** — see § 5 below.
8. **Screenshots** — gallery section, six screenshots inline. Each has a one-line caption.
9. **Architecture at a glance** — 5–8 bullets, link to `docs/PRD.md` and `docs/architecture/`. Do not duplicate the PRD here.
10. **The meta-harness essay** — single paragraph teaser + link to `docs/essay/meta-harness.md`.
11. **Dogfooding** — 2–3 sentences: "DeliveryOS planned its own build using DeliveryOS's own discipline. See `docs/planning/part-1-plan.md` and the per-chunk specs in `docs/planning/chunks/`." Link both.
12. **Project status** — "v0.1.0, proof of work. MVP scope is intentionally trimmed (four stages, one specialist, two harness profiles, one demo target). See `docs/PRD.md` § 15."
13. **Roadmap** — short bullet list: API integration, MCP server mode, OpenVSX publishing, additional specialists. Link to PRD § 26.
14. **Contributing** — for v0.1.0, just: "This is a personal proof-of-work build. Issues welcome. Pull requests not actively solicited until v0.2."
15. **License** — MIT (or whatever is decided; default MIT for proof-of-work).
16. **Acknowledgements** — list Claude Code, Codex, and the editors DeliveryOS targets (VS Code, Cursor, Windsurf, VSCodium, Antigravity).

### 3.2 Length discipline

- 600 lines: minimum to feel substantial. Less than that reads as a throwaway.
- 900 lines: maximum. Past that, the README becomes a manual; push detail into `docs/`.
- Rule of thumb: if a section is longer than 60 lines, ask whether it belongs in `docs/` instead.

### 3.3 Tone

- Direct, no hype. No "revolutionary." No "game-changing." Let the dogfooding evidence and the headline moment carry the weight.
- First person plural ("we") is fine. First person singular ("I") is also fine and arguably better for a solo proof-of-work — establishes that this is one builder's bet, not a startup.
- Cite PRD sections where useful but do not paste PRD content verbatim; the README is the front door, not the spec.

### 3.4 Pitch line

Use this exact tagline below the project name: **"A harness around your harness."**

This is the load-bearing one-liner. Do not soften it. Do not append qualifiers in the H1 area.

---

## 4. Install instructions (all 5 editors)

Live inside the README under § Install. Mirror the install behaviour shipped in CHUNK-04 — do not document anything the install scripts do not actually do.

### 4.1 Recommended path: install script

````markdown
**macOS / Linux**

```sh
curl -fsSL https://github.com/<owner>/deliveryos/releases/download/v0.1.0/install.sh | sh
```

**Windows (PowerShell)**

```powershell
iwr -useb https://github.com/<owner>/deliveryos/releases/download/v0.1.0/install.ps1 | iex
```

The script auto-detects which of `code`, `cursor`, `windsurf`, `codium`, `antigravity` are on your PATH and installs the `.vsix` into each. Run it again later to upgrade.
````

### 4.2 Manual sideload (per editor)

Document one command per editor, in this order:

| Editor      | Command                                                                |
| ----------- | ---------------------------------------------------------------------- |
| VS Code     | `code --install-extension deliveryos-0.1.0.vsix`                       |
| Cursor      | `cursor --install-extension deliveryos-0.1.0.vsix`                     |
| Windsurf    | `windsurf --install-extension deliveryos-0.1.0.vsix`                   |
| VSCodium    | `codium --install-extension deliveryos-0.1.0.vsix`                     |
| Antigravity | `antigravity --install-extension deliveryos-0.1.0.vsix` (path may vary; see § Notes) |

Add a short "Notes" block:

- The Antigravity binary may not be on PATH by default. Document the typical install path (macOS: `/Applications/Antigravity.app/Contents/Resources/app/bin/antigravity`).
- If the editor refuses the `.vsix` on signature grounds, see the troubleshooting block linked below.

### 4.3 Install troubleshooting

A short collapsible block (use `<details>` HTML inside README markdown) covering:

- "VS Code says the extension is not signed" — the trimmed-MVP `.vsix` is unsigned; use the "Install from VSIX" GUI command which presents a one-click trust prompt.
- "Cursor doesn't see the extension after install" — restart Cursor; the install script does this automatically on most platforms but not all.
- "Activity-bar icon doesn't appear" — Cmd+Shift+P → "DeliveryOS: Show DeliveryOS" forces the view container open.

Link to CHUNK-04's `scripts/install.sh` and `scripts/install.ps1` from this section so the README does not re-document script internals.

---

## 5. SHA-256 verification

A standalone section in the README, immediately after Install. Three blocks:

### 5.1 Where to find the hash

The hash is in the GitHub Release notes for `v0.1.0` and is also attached as a `SHA256SUMS.txt` asset.

### 5.2 How to verify

```sh
# macOS / Linux
shasum -a 256 deliveryos-0.1.0.vsix
# Compare against the SHA256SUMS.txt asset on the release page.
```

```powershell
# Windows
Get-FileHash -Algorithm SHA256 deliveryos-0.1.0.vsix
```

### 5.3 Why this matters

One sentence: "DeliveryOS is sideloaded, not signed by a marketplace. Verifying the hash confirms you have the same `.vsix` the project published."

The hash itself is filled in at release-tag time; the README ships with a placeholder (`<sha256-to-be-filled-on-release>`) that gets updated by a release script (see § 8 below) or by hand before pushing the tag.

---

## 6. Meta-harness essay

### 6.1 Location

`docs/essay/meta-harness.md`.

### 6.2 Length

**~1500–2000 words.** Hard floor 1500 (less than that reads like a blog tease, not a thesis). Hard ceiling 2200.

### 6.3 Outline

Five sections. Suggested word counts in parentheses.

1. **The thesis** (~400 words).
   - Open with the line from PRD § 1: "The model is not the product. The harness around the model is the product."
   - One paragraph on why the harness matters: context, memory, tool use, file conventions. Cite Claude Code's CLAUDE.md, Codex's AGENTS.md, Cursor's rules — the harness is where the actual product surface lives, not the underlying model.
   - The lift: DeliveryOS applies the same idea one level up. Around the model is the coding harness; around the coding harness is the SDLC. The SDLC is where intent, requirements, validation, and release evidence live. Currently it's scattered across chat history, READMEs, Linear tickets, terminal scrollback, and human memory.
   - The meta-harness is the structured layer that holds all of that and hands a clean brief to whichever coding harness the user prefers.

2. **What's new vs. existing tools** (~500 words).
   - **Linear / Jira / Asana / Shortcut.** Track tickets, not memory. The artefact a ticket produces (PR, deploy) is a hyperlink, not a structured handoff. Tickets don't tell Claude Code which files are allowed and which are forbidden, don't bundle test specs, don't capture release evidence in a model-readable way.
   - **Devin / Cognition / similar autonomous agents.** Black-box the entire SDLC. The user submits an intent, the agent does whatever. DeliveryOS goes the other way: every stage is human-inspectable and every artefact is markdown on disk. The harness is the product; the model is interchangeable.
   - **Raw harnesses (Claude Code, Codex, Cursor).** Powerful at execution, weak around it. Memory lives in CLAUDE.md / AGENTS.md, which is good for one session and brittle across many. No structured way to say "this brief came from this requirement which came from this PRD." DeliveryOS supplies that scaffolding.
   - **Cursor / Windsurf / Antigravity / forks of VS Code.** Editors with a coding agent baked in. They compete with each other at the editor layer. DeliveryOS deliberately sits above them — it's a `.vsix` that runs in all of them. Harness-neutral by construction.
   - The honest comparison: DeliveryOS is closer in spirit to Linear-meets-CLAUDE.md than to Devin. It does not try to replace the model or the editor; it organises the territory between intent and shipped code.

3. **The dogfooding evidence** (~500 words, **load-bearing**).
   - State it plainly: DeliveryOS planned its own build using DeliveryOS's own discipline. The reader can verify this in two clicks.
   - Walk the reader through what to look at:
     - `docs/PRD.md` — the PRD for DeliveryOS, written as a DeliveryOS PRD.
     - `docs/BUILD-PLAN.md` — phased schedule, the same kind DeliveryOS expects to produce for any project.
     - `docs/planning/part-1-plan.md` — the chunk-by-chunk break-down produced by the same chunk-expand-validate-iterate loop DeliveryOS will run on user projects.
     - `docs/planning/chunks/` — per-chunk specs. Each one matches the shape DeliveryOS will produce. This document itself (chunk-16) is one of them.
     - `docs/decisions/` — ADRs in the format DeliveryOS will template for user projects.
   - Acknowledge the limits honestly: at the time of writing, DeliveryOS the *extension* has just shipped v0.1.0. The dogfooding evidence is in the *planning artefacts*, not yet in a live "DeliveryOS used itself to build itself" session. That's the next layer of dogfooding, planned for v0.2.
   - Make the point cleanly: the planning loop already works. The shape is right. The proof of the engineering is the v0.1.0 demo; the proof of the *thesis* is the planning directory.

4. **What it doesn't do (yet)** (~300 words).
   - No API integration in MVP — manual copy-paste to whichever AI tool the user prefers. This is deliberate: it forces the harness boundaries to be honest. Once the manual mode fatigues, API integration earns its keep.
   - No MCP server mode in MVP — the memory graph is local files, queried by the extension. MCP comes when the memory graph proves valuable across tools.
   - One specialist (Test Designer), two harness profiles (Claude Code, Codex), one demo target (Bug Triage). The PRD lists the full set; this build ships the smallest set that closes the loop.
   - No OpenVSX, no marketplace, no auto-update beyond a notification. Sideloading is the whole distribution story for v0.1.0.
   - The point is not breadth; the point is that the loop closes. Once a closed loop exists, expanding it is incremental.

5. **Closing** (~300 words).
   - Restate the thesis one last time, in different words: the value is no longer in the model — frontier models are commoditising. The value is in the harness around them. The next abstraction up — the SDLC harness — is where structured discipline can dominate ad-hoc orchestration. DeliveryOS is one bet on what that abstraction looks like.
   - One line on the personal stake: this is a solo proof-of-work, built deliberately as a credible-builder signal to AI companies. The artefact (this repo) is the argument; the essay is the legend that goes with the argument.
   - Link out to the README's install section.

### 6.4 Tone

- **Avoid hype.** Specifically avoid: "revolutionary," "game-changing," "the future of," "AI-first," "10x." These words are noise.
- Let the dogfooding evidence carry the weight. The strongest move in the essay is the section that says "go look at `docs/planning/`." Pointing at evidence is more persuasive than asserting quality.
- Personal voice is allowed and probably better than corporate voice. This is a single builder's argument; write it like one.
- Cite specifics: file paths, PRD section numbers, exact line counts of the planning directory if it makes the dogfooding point sharper.

### 6.5 What not to write

- No competitive trash-talk of Linear / Jira / Devin / etc. State the comparison plainly and move on. Trash-talk reads as insecurity.
- No founder story / origin story. The reader is here for the thesis, not the autobiography.
- No "future roadmap" beyond the brief note in § 4 above. The roadmap belongs in the README and PRD.

---

## 7. Screenshots

### 7.1 Location

`docs/screenshots/` directory at repo root. PNG, full-resolution.

### 7.2 Naming

`NN-short-name.png`, prefix in capture order: `01-activity-bar.png`, `02-tree-view.png`, etc. The prefix makes the directory listing match the README order.

### 7.3 Required screenshots (minimum 6)

For each: filename, what's in frame, exact app state needed to capture it.

| # | Filename                     | What's in frame                                                                              | Capture state                                                                                                                                                                       |
| - | ---------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 | `01-activity-bar.png`        | The full VS Code chrome with the DeliveryOS activity-bar icon highlighted, sidebar collapsed | Open the Bug Triage workspace from CHUNK-15. Click anywhere outside the sidebar so the icon is unselected. Use Cmd+B to collapse the sidebar.                                       |
| 2 | `02-tree-view.png`           | The four-stage tree (DISCOVER, DEFINE, EXECUTE, VERIFY), fully populated                     | Bug Triage workspace with the demo halfway run: raw idea + discovery captured, draft PRD, 3 requirements, no execution yet. Expand all tree nodes (right-click → Expand All).        |
| 3 | `03-prd-editor.png`          | The PRD editor webview with a section being edited                                           | Open the draft PRD for Bug Triage. Click into the "Goals" section. The cursor is in the editor; the section-level "Revise with AI" button is visible.                              |
| 4 | `04-brief-composer.png`      | The Execution Brief composer with Allowed and Forbidden sections visible                     | Open the Execution Brief for REQ-001. Scroll so both Allowed and Forbidden lists are on screen. Forbidden list includes `migrations/`, `src/backend/api/users.py`, `src/frontend/`. |
| 5 | `05-diff-violation.png`      | **HEADLINE.** The diff/PreToolUse panel showing a blocked write to a forbidden file          | After running Claude Code with the deliberately-broken brief. The PreToolUse hook fires and the panel shows the blocked file path, the attempted change, and the reason.            |
| 6 | `06-release-evidence.png`    | The Release Evidence markdown rendered in a webview preview                                  | After the successful re-run. Open `release-evidence.md` from the VERIFY stage. Show the full traceability chain (intent → PRD → REQ → test spec → result → verification).            |

### 7.4 Optional bonus screenshots (if time)

- `07-version-check.png` — the version-check notification from CHUNK-04 firing on activation against a stale install.
- `08-multi-editor.png` — DeliveryOS running in Cursor or Windsurf, to prove harness-neutrality visually.

### 7.5 Capture script

For each shot, before clicking the screen-capture button:

1. Bump editor font to 16pt (Cmd+= a few times) so text is readable in compressed README rendering.
2. Set theme to "Dark Modern" (or the host editor's nearest equivalent).
3. Close all unrelated tabs and panels.
4. Make sure the cursor and the IME indicator are not in frame unless the shot is about the cursor.
5. Use Cmd+Shift+4 + Space + click-window on macOS to capture a single window with its drop shadow. Avoid full-screen captures unless the activity bar shot needs the editor chrome for context.
6. Crop with Preview to remove personal information from the title bar (workspace folder names that reveal directory structure are fine; full home-directory paths are not).
7. Compress with `pngquant` or similar before commit; target ≤500 KB per screenshot, ≤3 MB total for the directory.

### 7.6 README placement

Inline in the screenshot gallery section, in numerical order. Each:

```markdown
### Activity bar in any VS Code-family editor
![DeliveryOS activity bar](docs/screenshots/01-activity-bar.png)
*One icon, five editors. The same `.vsix` installs into VS Code, Cursor, Windsurf, VSCodium, and Antigravity.*
```

Each caption is one sentence. Resist the urge to add a second.

---

## 8. GitHub Release v0.1.0

### 8.1 Tag and trigger

**Order of operations matters (M14):** CHUNK-16 owns the **content** of `RELEASE_NOTES.md`. The file must be **authored and committed at the repo root BEFORE the tag is pushed**. CHUNK-04's GitHub Actions workflow consumes the committed file verbatim via `gh release create --notes-file RELEASE_NOTES.md`.

```sh
# 1. Author RELEASE_NOTES.md (content per § 8.3) and demo.mp4 at repo root.
# 2. Commit them on main.
git add RELEASE_NOTES.md demo.mp4
git commit -m "release: prepare v0.1.0 notes and demo backup"
git push origin main

# 3. Tag and push. The workflow now sees the notes file.
git tag -a v0.1.0 -m "DeliveryOS v0.1.0 — first public proof of work"
git push origin v0.1.0
```

This triggers the GitHub Actions workflow from CHUNK-04 (`.github/workflows/release.yml`). The workflow:

1. Checks out the tag.
2. Runs `npm ci`.
3. Runs `vsce package` → produces `deliveryos-0.1.0.vsix`.
4. Computes `SHA256SUMS.txt` covering all attached binary assets (the `.vsix`, install scripts, `demo.mp4`).
5. Creates a GitHub Release from the tag.
6. Attaches: the `.vsix`, `SHA256SUMS.txt`, `demo.mp4` (CHUNK-16 owns this file; committed at repo root before tagging), `scripts/install.sh`, `scripts/install.ps1`.
7. Generates release notes by passing `--notes-file RELEASE_NOTES.md` to `gh release create` (the file at repo root, committed in step 2 above). **CHUNK-16 owns the file content; CHUNK-04 owns the workflow plumbing that consumes it.**

### 8.2 Release page contents

| Asset                          | Source                                            |
| ------------------------------ | ------------------------------------------------- |
| `deliveryos-0.1.0.vsix`        | Built by GitHub Actions from `vsce package`       |
| `SHA256SUMS.txt`               | Built by GitHub Actions                           |
| `demo.mp4`                     | Hand-uploaded (or attached as the workflow runs)  |
| `install.sh`                   | Copied from `scripts/install.sh` (CHUNK-04)       |
| `install.ps1`                  | Copied from `scripts/install.ps1` (CHUNK-04)      |

### 8.3 Release notes body

`RELEASE_NOTES.md` at repo root, populated before tagging. Sections:

- **What is this?** — 2 sentences, lifted from the README pitch.
- **Install** — the two one-liner install-script commands from § 4.1, plus a link to the manual sideload table.
- **Verify** — the SHA-256 verification snippets from § 5.2.
- **Demo video** — YouTube link (or the attached `demo.mp4`).
- **Documentation** — links to README, PRD, the essay, the planning directory.
- **What's in v0.1.0** — trimmed MVP summary lifted from PRD § 15.
- **Known limitations** — sideloaded VSIXes do not auto-update; the in-extension version check notifies you when a new release is available. Not signed by a marketplace. See SHA-256.
- **What's next** — short list of v0.2 candidates (API integration, additional specialists, MCP server mode).

### 8.4 Post-release verification

After the tag is pushed:

1. Wait for the GitHub Action to complete (typically <3 minutes).
2. Visit `https://github.com/<owner>/deliveryos/releases/tag/v0.1.0` and confirm all assets are attached.
3. From a clean machine (or a fresh `/tmp` dir), run the install script and confirm the extension installs into VS Code.
4. Run `shasum -a 256 deliveryos-0.1.0.vsix` against the downloaded asset and compare to `SHA256SUMS.txt`.
5. Click every link in the release notes and confirm none 404.

---

## 9. File-by-file breakdown

| Path                                          | Action  | Notes                                                                                                                                                                                              |
| --------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `README.md`                                   | rewrite | Replace the existing minimal README. 600–900 lines including screenshot blocks. Sections per § 3.1.                                                                                                |
| `docs/essay/meta-harness.md`                  | create  | New file. 1500–2200 words. Outline per § 6.3.                                                                                                                                                      |
| `docs/demo/recording-storyboard.md`           | create  | Per-take script with the storyboard table from § 2.3, plus voiceover lines verbatim. Used during recording; can stay in the repo afterwards as a working artefact.                                |
| `docs/screenshots/01-activity-bar.png`        | create  | Capture per § 7.3.                                                                                                                                                                                 |
| `docs/screenshots/02-tree-view.png`           | create  | Capture per § 7.3.                                                                                                                                                                                 |
| `docs/screenshots/03-prd-editor.png`          | create  | Capture per § 7.3.                                                                                                                                                                                 |
| `docs/screenshots/04-brief-composer.png`      | create  | Capture per § 7.3.                                                                                                                                                                                 |
| `docs/screenshots/05-diff-violation.png`      | create  | Capture per § 7.3. **Headline.**                                                                                                                                                                   |
| `docs/screenshots/06-release-evidence.png`    | create  | Capture per § 7.3.                                                                                                                                                                                 |
| `docs/screenshots/07-version-check.png`       | create  | Optional. Only if time.                                                                                                                                                                            |
| `docs/screenshots/08-multi-editor.png`        | create  | Optional. Only if time.                                                                                                                                                                            |
| `RELEASE_NOTES.md`                            | create  | New file at repo root. **CHUNK-16 owns the content (M14).** Body for the GitHub Release per § 8.3. Authored + committed BEFORE tagging. CHUNK-04's workflow consumes it via `--notes-file RELEASE_NOTES.md`.                                                                              |
| `demo.mp4`                                    | create  | Demo-video backup committed at repo root before tagging. Attached by CHUNK-04's workflow when present.                                                                                                                                                                                  |
| `package.json`                                | edit    | Bump `version` to `0.1.0`. Confirm `publisher`, `displayName`, `description`, `repository`, `bugs`, `homepage`, `icon`, `categories`, `keywords` are all populated. No code logic change.          |
| `CHANGELOG.md`                                | edit    | Append `## [0.1.0] - 2026-08-24` with a one-paragraph summary lifted from the release notes.                                                                                                       |
| `.github/workflows/release.yml`               | tweak   | From CHUNK-04. Confirm it picks up `RELEASE_NOTES.md`, attaches the demo `.mp4` and install scripts. No new functionality, only verification that the existing workflow handles v0.1.0 cleanly.    |

**Do not touch:**

- `docs/PRD.md` — no MVP scope changes at this chunk.
- `docs/BUILD-PLAN.md` — schedule frozen.
- `docs/decisions/` — no new ADRs.
- `docs/architecture/` — no architecture changes.
- Any `src/` file — no product code changes (modulo typo fixes caught during recording, which should be filed as bugs and fixed only if blocking the demo).

---

## 10. Step-by-step implementation outline

A four-day pass with one buffer day. Adjust to taste; treat the order as the load-bearing part, not the day boundaries.

### Day 1 — Recording prep + first take

1. Pull CHUNK-15's clean demo state. Run the demo twice end-to-end without recording to confirm stability.
2. Write `docs/demo/recording-storyboard.md` per § 2.3, including verbatim voiceover lines.
3. Set up the recording environment: dark theme, 16pt fonts, cursor highlight, quiet room, mic test.
4. Record take 1 of the demo following the storyboard.
5. Watch take 1 back; note pacing issues, audio problems, missed beats.

### Day 2 — Take 2/3 + edit

1. Re-record take 2 with notes from take 1.
2. If take 2 is clearly better, ship it. If still rough, record take 3.
3. Edit in iMovie / Resolve: trim, add title card, add end card, no music, no transitions beyond cuts.
4. Export at 1080p H.264 ≤100 MB.
5. Upload to YouTube as Unlisted. Note the URL.
6. Proofread auto-captions.
7. Save a copy locally as `demo.mp4` for the release attachment.

### Day 3 — Screenshots + README

1. Capture all 6 required screenshots per § 7.3, committing each one with a clear message.
2. Crop and compress each.
3. Rewrite README following § 3.1, inserting screenshots inline.
4. Verify every link in the README resolves (manual click-through).
5. Run a markdown linter to catch broken syntax.

### Day 4 — Essay + release prep

1. Draft the essay following § 6.3. First pass for structure, second pass for tone.
2. Show the essay to one outside reader for the comprehension test (§ 11). Apply feedback.
3. **Author `RELEASE_NOTES.md` at the repo root per § 8.3.** This file is the canonical release-notes body that CHUNK-04's workflow consumes via `--notes-file`. CHUNK-16 owns the content (M14); CHUNK-04 owns the consumption.
4. Commit `RELEASE_NOTES.md` and `demo.mp4` to `main` **before** tagging — the workflow only sees what's at the tagged commit.
5. Bump `package.json` version to `0.1.0`.
6. Update `CHANGELOG.md`.
7. Final sanity pass: `git diff` for typos, broken paths, placeholder text.
8. Compute SHA-256 of a local `vsce package` build and confirm the release workflow will produce the same.

### Day 5 — Tag, push, verify

1. `git tag -a v0.1.0 -m "..." && git push origin v0.1.0`.
2. Watch the GitHub Action run.
3. Verify the release page (§ 8.4).
4. Update the README SHA-256 placeholder with the real hash from `SHA256SUMS.txt`, commit, push (the hash is known only after the workflow builds).
5. Re-fetch the release page; confirm hash matches.
6. Hand the repo URL to one outside reader (§ 11).

### Buffer day (Day 5 spillover or Day 6)

- Recording take 4 if takes 1–3 all failed.
- README cleanup based on outside-reader feedback.
- Screenshot re-takes if any look amateurish.
- Do **not** use buffer time to add features. If the demo passes the outside-reader test, ship.

---

## 11. Test plan

The test surface for this chunk is comprehension, not correctness. There are no unit tests to write.

### 11.1 The outside-reader test ("grok in under 2 minutes")

The bar from CHUNK-16's "Done when" clause.

**Setup.** Find one person who has **not** seen DeliveryOS. Preferably a developer; ideally one who uses Cursor or Claude Code so the harness layer is familiar territory. Friend, ex-colleague, or a Twitter/X mutual is fine.

**Protocol.**

1. Send them the GitHub repo URL with no preamble beyond "tell me what this is in two minutes."
2. Start a stopwatch.
3. After two minutes, ask: "What does DeliveryOS do? Who is it for? What's the headline thing it does that other tools don't?"
4. Note their answers. Do not coach.

**Pass criteria.**

- They can state, in their own words, that DeliveryOS is a layer above coding agents (Claude Code / Cursor / etc.).
- They can identify at least one concrete capability — typically the diff/PreToolUse moment or the file-based handoff.
- They can identify who it's for (solo builders, technical PMs).
- Bonus: they mention the dogfooding evidence unprompted.

**Fail criteria.**

- They can't tell what category DeliveryOS is in.
- They confuse it with Devin / Linear / a chat UI.
- They say "I don't know" to any of the first three questions.

**What to do if it fails.** Iterate on the README opening and the demo-video first 30 seconds — these are where comprehension happens. Re-test with a second reader. If still failing, the pitch ("A harness around your harness") may need restating; the essay is the long-form fallback but the README and the first 30 seconds of video are where the test is won or lost.

### 11.2 Install-test on a clean machine

After tagging:

1. On a separate machine (or a fresh VM), run the install script.
2. Open VS Code, click the DeliveryOS activity bar, confirm the four-stage tree renders.
3. Run the first three steps of the quick-start to confirm the docs-as-written match the install-as-shipped.

### 11.3 Demo-video integrity check

1. Play the YouTube upload at 480p and confirm text is still readable. If not, re-export at higher bitrate.
2. Play the attached `demo.mp4` from the release page in a clean browser session to confirm it streams.
3. Click every link in the YouTube description (the description should mirror the release notes summary).

### 11.4 Link-rot sweep

A one-time click-through of every link in:

- `README.md`
- `docs/essay/meta-harness.md`
- `RELEASE_NOTES.md`
- The GitHub Release page

For each link: confirm it resolves and points at the intended target. Internal `docs/` links must be relative paths so they survive being viewed inside the GitHub repo and inside the published release.

---

## 12. Risks, edge cases, open questions

### 12.1 Recording quality

- **Risk.** First take is unwatchable; second take is okay; perfect take never lands.
- **Mitigation.** Hard-cap takes at 3. "Good enough to be credible" beats "polished but late." If take 3 has one rough moment but the headline (forbidden-file block) lands cleanly, ship take 3.
- **Fallback.** If all three takes fail on the headline moment specifically (e.g. Claude Code's response varies and the PreToolUse hook doesn't fire as expected), fall back to a single canned response on the forbidden-file write. The PreToolUse hook itself is deterministic; only Claude Code's choice to write the forbidden file is non-deterministic.

### 12.2 README length

- **Risk.** Too long — readers bounce before reaching the install section. Too short — looks like a throwaway.
- **Target.** 600–900 lines including screenshot blocks (~600 lines of prose + ~30 lines of screenshot markdown + tables).
- **Mitigation.** If the README crosses 900, move detail into `docs/`. The README is the front door, not the manual.
- **Edge case.** GitHub renders the README inside the repo home page with a soft scroll. Below ~700 lines, most readers scroll; past that, they don't. The most important content (pitch, demo video, install) must be in the first 200 lines.

### 12.3 Essay tone

- **Risk.** Hype-laden language ("revolutionary," "game-changing") erodes credibility for the AI-company audience the essay is aimed at.
- **Mitigation.** Read it back in a flat voice; if any sentence sounds like a launch tweet, rewrite. Cite specific file paths instead of asserting quality.
- **Risk.** Over-justification — the essay becomes defensive about what DeliveryOS does not do.
- **Mitigation.** State limits plainly once (§ 6.3 part 4) and move on.

### 12.4 Dogfooding claim is load-bearing

- **Risk.** The dogfooding claim is the strongest argument in the essay and the README. If a reader inspects `docs/planning/` and finds it half-finished or inconsistent with what the essay claims, the whole argument weakens.
- **Mitigation.** Before shipping, do one pass through `docs/planning/` to confirm:
  - `part-1-plan.md` is complete and current.
  - All `chunks/chunk-NN-*.md` files exist (this depends on the validation pass in Prompt 3/4 of the planning loop).
  - The cross-references between chunks resolve.
- **Open question.** Should the essay link directly to specific chunk spec files as evidence, or just to the `chunks/` directory listing? Recommendation: link to the directory; let curious readers self-serve. Calling out specific chunks risks invitation to nit-pick.

### 12.5 SHA-256 placeholder

- **Risk.** The README ships with `<sha256-to-be-filled-on-release>` as a placeholder; the real hash is only known after the GitHub Action runs.
- **Mitigation.** Two options. (a) Update the README in a follow-up commit on `main` after the tag is pushed. Simple, slightly ugly. (b) Modify the release workflow from CHUNK-04 to compute the hash, edit the README on the tag branch, and force-amend the tag. Brittle.
- **Recommendation.** Option (a). One extra commit, no tag rewriting. Document the dance in `RELEASE_NOTES.md`.

### 12.6 Antigravity install path

- **Risk.** Antigravity may not be on PATH; the install script may silently skip it.
- **Mitigation.** Document the typical install path in the README. CHUNK-04 already handles probing for it; verify that path coverage end-to-end during the install-test.

### 12.7 Video hosting

- **Risk.** YouTube takes the video down; the repo's primary video link 404s.
- **Mitigation.** Attach the `.mp4` to the GitHub Release. The README points at YouTube first, but the README install section also says "if the video is unavailable, the backup is attached to the release." Redundancy by design.

### 12.8 First-public-release jitters

- **Risk.** Once the repo is public, hesitation about quality leads to last-minute changes that destabilise the demo.
- **Mitigation.** Tag-and-push is a one-way door. Before tagging, run the demo from a clean clone of the tag commit. After tagging, the only allowed changes are typo fixes and the SHA-256 README update.

### 12.9 Open question: license

- The chunk assumes MIT. If a different license is wanted (Apache 2.0, BSL, "all rights reserved"), surface this before Day 4 of the implementation outline. Default to MIT if undecided.

### 12.10 Open question: project author / publisher name in `package.json`

- The `publisher` field affects the extension ID inside VS Code. Once published, changing it requires an extension-ID migration. Lock this in before tagging.

---

## 13. Explicit dependencies

### 13.1 Upstream

- **CHUNK-15.** A working, repeatable Bug Triage demo. The demo flow drives the recording and most of the screenshots.
- **CHUNK-14.** Release Evidence export — feeds the final scene of the video and screenshot #6.
- **CHUNK-13.** The Allowed/Forbidden diff + PreToolUse hook — the headline moment of the demo and screenshot #5.
- **CHUNK-04.** GitHub Release workflow, install scripts, SHA-256 mechanics. All re-used here as-is.
- **CHUNK-01 through CHUNK-12.** The product itself. Every screenshot and every video beat shows surfaces shipped earlier.
- All planning documents under `docs/planning/` — the dogfooding evidence claim depends on these being complete and consistent. Prompt 3 (validation) and Prompt 4 (iteration) of the current planning loop must finish before CHUNK-16's essay can credibly claim "DeliveryOS planned its own build."

### 13.2 Shared contracts honoured

This chunk produces no new contracts and does not redefine any. It consumes the existing build artefacts and docs as-is. Specifically:

- Uses CHUNK-04's release workflow without modification.
- Uses CHUNK-04's install scripts without modification.
- Uses CHUNK-13's diff/hook output for the headline moment without modification.
- Uses CHUNK-14's Release Evidence markdown without modification.

### 13.3 Downstream

Nothing depends on CHUNK-16. This is the terminal chunk. After this, the project's next move is either v0.2 (post-MVP) or extension-of-MVP work driven by feedback from the launch.

---

## 14. Acceptance criteria (the "Done when" checklist)

- [ ] `README.md` rewritten, 600–900 lines, screenshots inline, pitch is "A harness around your harness."
- [ ] `docs/essay/meta-harness.md` exists, 1500–2200 words, three core sections (thesis / vs. existing / dogfooding).
- [ ] `docs/demo/recording-storyboard.md` exists, matches the recorded video.
- [ ] 6 screenshots in `docs/screenshots/`, named `01`–`06`, inlined in the README.
- [ ] Demo video uploaded to YouTube unlisted; URL linked from README.
- [ ] Demo video `.mp4` attached to GitHub Release as backup.
- [ ] `RELEASE_NOTES.md` exists, populated per § 8.3.
- [ ] `package.json` version bumped to `0.1.0`; all metadata fields populated.
- [ ] `CHANGELOG.md` has a `0.1.0` entry.
- [ ] `git tag v0.1.0 && git push --tags` triggers GitHub Action and produces a release page.
- [ ] Release page has: `.vsix`, `SHA256SUMS.txt`, `demo.mp4`, `install.sh`, `install.ps1`, populated release notes.
- [ ] README SHA-256 placeholder replaced with the real hash from the release.
- [ ] One outside reader passes the "grok in under 2 minutes" test.
- [ ] All links in README, essay, and release notes resolve.

When the checklist is fully ticked, the chunk is done and the MVP is shipped.
