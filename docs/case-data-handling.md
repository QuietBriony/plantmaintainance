# Case Data Handling (Pre-schema Policy)

This file defines handling principles before formal case schema implementation.

## Current state

- The repository currently serves static Q&A data.
- Structured case-record storage is not yet implemented.

## Handling principles for future case data

- Data minimization: collect only fields needed for observation support.
- Purpose limitation: use case data only for consultation support objectives.
- Safety-first language: avoid storing fields framed as definitive diagnosis.
- Separation of concerns: keep case records separate from static Q&A content.
- Do not store exact address/GPS unless a future policy explicitly allows it.
- Case records are observation notes, not diagnosis records.

## Operational baseline for future implementation

- Define retention expectations.
- Define deletion/update workflow.
- Define auditability for edits.
- Define access boundaries for maintainers/reviewers.

## Publication boundary

Do not publish identifiable or rights-uncertain data.

## Dependency boundary

No external AI/vendor data pipeline should be introduced until policy docs and contributor terms are stable.
