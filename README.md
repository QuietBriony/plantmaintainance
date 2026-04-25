# plantmaintainance

Static plant maintenance / landscaping Q&A helper focused on Okinawa-oriented plant care prompts.

## Current state

- App type: static web app (HTML/CSS/vanilla JS + local JSON data).
- Current published URL: <https://quietbriony.github.io/plantmaintainance/>.
- Existing behavior: keyword-based Q&A lookup for plant maintenance topics.

## Direction (docs-first)

This repository is being prepared to evolve toward a:

- **Pocket Tree Doctor / ポケット樹木医 companion**,
- **tree consultation light** experience,
- **photo-case contribution** support,
- **observation support workflow**.

The project is intended as a support tool, not an authoritative diagnosis product.

## Safety and scope notes

- **Not a definitive diagnosis tool**.
- **No AI diagnosis integration yet**.
- **No photo dataset publication yet**.
- **No medical/agrochemical prescription guidance**.

See detailed guardrails in:

- `docs/safety-boundary.md`
- `docs/photo-rights-privacy.md`
- `docs/case-data-handling.md`

## Contribution status

`CONTRIBUTING.md` is now available with initial contribution guardrails.

If `LICENSE` is absent, license selection/publication is still pending repository-owner decision.

## Repository structure (current)

- `index.html` / `style.css` / `main.js`: current static app.
- `plantmaintain-db.json`: current Q&A data.
- `docs/`: direction, safety boundary, data/privacy handling, and roadmap notes.

## Implementation policy for this lane

This lane is docs-first only and keeps the existing keyword Q&A app untouched.
