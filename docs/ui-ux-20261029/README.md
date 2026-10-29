# Admin UI review — 2026-10-29

Synthetic screenshots retained locally; public disclosure pending separate approval. This source-only candidate preserves the reviewed runtime files and recorded measurements.

This local review fixes measured Admin layout and accessibility problems while preserving the existing vanilla JavaScript, dark theme, provider behavior and API contracts.

Baseline: `f919f46de3aef9b1602e2dc6c164219d4b87a684`. Local branch: `codex/ui-ux-20261029`.

## Changes and evidence

| Measured case | Before | After |
| --- | --- | --- |
| 360 CSS px, long unbroken provider name | Page scroll width 1183px | 360px; full name wraps |
| 360 CSS px, long validation error | Dialog client width 320px, scroll width 1019px | Both 320px; input remains intact |
| Mobile navigation height | 379.19px | 253px with two columns |
| Provider settings / text input height | 38px / 40px | 44px / 44px |
| Global loading / error messages | No live region | `role=status`, atomic updates |
| Reduced motion | 150ms nav transition and smooth scrolling | No transition; immediate navigation scroll |
| CSS 200% zoom, dirty-state label | Empty message column squeezed `No changes` into ellipsis | Flexible message column preserves the full status |

The touch dimensions above are CSS pixels for this Web UI, not native iOS points or Android dp. Desktop screenshots and mobile viewport simulations are browser checks, not physical phone certification.

Synthetic screenshots retained locally; public disclosure pending separate approval.

## Validation

- Chrome 156.0.8078.73 headless; actual repository HTML, CSS and JavaScript executed.
- 360×800, 412×915, 440×956, 1440×900 and 844×390 landscape viewports; provider view and validation dialog captured at every size.
- 36 final assertions passed; zero JavaScript page errors. [Final results](after/results.json). The [baseline results](before/results.json) contain 24 original checks; the final suite adds contrast, native modal background-isolation and zoomed status-readability checks.
- Loading, unavailable config, empty custom-provider list, unavailable integrations, long names and long errors use **synthetic fixtures**. All browser requests are intercepted: local source assets are read from disk, API responses are generated in memory, and non-local origins are aborted. No server is started and no account, credential or integration setting is used or changed.
- Keyboard focus remains visible; native dialog blocks background controls and returns focus on Escape. Browser chrome can receive focus during native dialog Tab traversal; this is recorded separately from background application focus.
- Existing contrast ratios on panel background: muted text 7.30:1, error text 4.92:1, focus accent 7.30:1; primary button text 7.62:1. These sampled colors pass their applicable 4.5:1 text / 3:1 focus targets; this is not a full WCAG certification.
- CSS 200% zoom checked at 1440×900 under both light and dark OS preferences. The product intentionally continues to use its existing dark theme in both; no light theme was added.
- `node --check` passed for the modified Admin script and audit script; `git diff --check` passed.

Backend integration, Python lint/type/tests and the existing Python Playwright suite were **not run**: this checkout pins Python `==3.14.7`; the available host has Python 3.13 and no `uv`, `ruff` or `pytest`. The UI fixture checks do not validate provider connectivity, configuration persistence, OAuth or Code sessions. CI still needs its pinned environment (`ruff-format`, `ruff-check`, `ty`, `pytest`, `playwright` and version policy). No tools or packages were installed for this review.

## Reproduce the isolated UI checks

Use an already available Playwright Core module and Chrome executable. The script does not download either:

```powershell
$env:PLAYWRIGHT_MODULE = 'C:\path\to\playwright-core\index.mjs'
$env:CHROME_PATH = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
node scripts/ui-layout-audit.mjs after
```

Output defaults to `test-results/ui-ux/after`; set `UI_AUDIT_DIR` to another local directory if needed. The `before` argument labels a run and records failures without a failing exit status; it does not automatically switch source versions. To reproduce the original baseline, check out the baseline in a separate directory and run the audit against that source there. Saved before screenshots were captured before product edits.

## Restore

The original baseline and a verified Git bundle are retained in the private local audit workspace alongside all 32 full-resolution screenshots. To undo this review after committing, use `git revert <UI-review-commit>` on a clean local branch. To recover the baseline without modifying current work, create another branch from `f919f46de3aef9b1602e2dc6c164219d4b87a684`. Preserve any later uncommitted work first. No push, pull request, deployment or repository visibility change is part of this review.

Design guidance was read statically from UI/UX Pro Max at upstream commit `28b3b8dee8c976df4fa3e94aed4e092ad43fcb03`: responsive wrapping, visible focus, touch sizing, status semantics and reduced motion. No third-party installation or design-generation script was executed or copied. Existing project license and branding remain intact.
