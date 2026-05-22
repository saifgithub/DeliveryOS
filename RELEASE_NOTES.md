# DeliveryOS — Release notes

This file is the body of every GitHub Release. The release workflow
(`.github/workflows/release.yml`) reads it verbatim via
`gh release create --notes-file RELEASE_NOTES.md`. Author and commit
**before** pushing the tag. CHUNK-16 expands this file for the v0.1.0
public release.

---

## v0.0.1 — Phase 0 scaffold verification release

DeliveryOS at this tag is a Phase-0 verification artefact, not a
working product. It installs into VS Code + Cursor + a third
Code-OSS-derivative editor; the DeliveryOS activity-bar icon
appears and the sidebar tree renders the four stages (DISCOVER →
DEFINE → EXECUTE → VERIFY). The "DeliveryOS: Create Project"
command persists a project Intent into `.deliveryos/memory.sqlite`
and writes a `.deliveryos/README.md`. The "DeliveryOS: Open Hello"
command renders a React + Tailwind webview as a CSP-clean smoke
test. No user-facing features beyond that.

### Install

```sh
curl -fsSL https://github.com/deliveryos/deliveryos/releases/latest/download/install.sh | sh
```

Or download the `.vsix` and install manually with `<editor>
--install-extension deliveryos-0.0.1.vsix --force`.

### Verify

```sh
shasum -a 256 -c SHA256SUMS.txt
```
