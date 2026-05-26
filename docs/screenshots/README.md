# docs/screenshots

This directory holds the screenshots used in the root `README.md` and the
GitHub Release page.

## Naming convention

`NN-short-name.png` — two-digit prefix in README display order so the
directory listing matches the gallery section.

## Required screenshots (v0.1.0)

| File | What's in frame |
| --- | --- |
| `01-activity-bar.png` | Full VS Code chrome, DeliveryOS activity-bar icon highlighted, sidebar collapsed |
| `02-tree-view.png` | Four-stage tree (DISCOVER, DEFINE, EXECUTE, VERIFY) fully populated, Bug Triage workspace |
| `03-prd-editor.png` | PRD editor webview with a section being edited; word counts and empty-section placeholders visible |
| `04-brief-composer.png` | Execution Brief composer; Allowed (green border) and Forbidden (red border) sections both on screen |
| `05-diff-violation.png` | Diff/violation panel after a forbidden-file write attempt; blocked file path and reason visible |
| `06-release-evidence.png` | Release Evidence markdown rendered in the webview; full traceability chain visible |

## Optional screenshots (if time)

| File | What's in frame |
| --- | --- |
| `07-version-check.png` | In-extension version-check notification firing on activation |
| `08-multi-editor.png` | DeliveryOS running in Cursor or Windsurf (proves harness-neutrality) |

## Capture checklist

Before every shot:

1. Editor font size: 16pt minimum (`Cmd+=` a few times).
2. Theme: Dark Modern (or the host editor's nearest equivalent).
3. Close all unrelated tabs and panels.
4. Cursor and IME indicator: out of frame unless the shot is about the cursor.
5. Capture: `Cmd+Shift+4` + Space + click-window on macOS (single window with drop shadow).
6. Crop in Preview: remove personal information from the title bar if present.
7. Compress: `pngquant --quality=65-85 *.png` — target ≤500 KB per file, ≤3 MB total.

## Compression

```sh
# Install pngquant if needed: brew install pngquant
pngquant --quality=65-85 --force --ext .png docs/screenshots/*.png
```

Run before committing. GitHub renders README images at display width; there is no benefit to shipping full-resolution PNGs.

## Placeholder note

The `.png` files themselves are not committed to the repository — they are
binary artefacts produced during the recording session (CHUNK-16, Day 3).
This `README.md` documents what belongs here and how to produce it.
Once captured, add and commit each file with a message like:

```sh
git add docs/screenshots/01-activity-bar.png
git commit -m "docs(screenshots): add 01-activity-bar"
```
