# Specification Quality Checklist: RAW to JPEG Folder Converter

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-10-10
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

**Iteration 1 (2026-10-10)** — 15 of 16 passing. Three `[NEEDS CLARIFICATION]` markers
raised, all deliberate forks rather than gaps a default could close: supported RAW formats
(FR-007), output fidelity (FR-014), and unsupported-browser behavior (FR-030).

**Iteration 2 (2026-10-10)** — 16 of 16 passing. All three resolved:

- **Supported formats** → Fujifilm `.raf`, Canon `.cr2`/`.cr3`, Nikon `.nef`, Sony `.arw`,
  Adobe `.dng` (FR-007). Other RAW formats are detected and reported as skipped-unsupported
  rather than ignored (FR-008), so the list can be extended later without redesign.
- **Output fidelity** → Extraction of the camera's embedded full-size JPEG preview, not a
  full sensor decode (FR-014). Decided on the user's Fujifilm context: film simulations are
  baked into the embedded preview and would be lost by a neutral decode, and X-Trans
  demosaicing is both hard to do well and easy to do badly. The accepted tradeoff — output
  carries the camera's rendering rather than a neutral grading base — is recorded in
  **Assumptions** under "Output source" and "Not an editing pipeline".
  Guard added at FR-017: a file with no usable embedded preview fails by name rather than
  being silently written at reduced resolution.
- **Unsupported browsers** → Blocked up front with the supported browsers named, and the
  folder-selection flow withheld (FR-034). No upload-and-download fallback in v1.

Knock-on changes from the fidelity decision: FR-015/FR-016 split pass-through from
re-encode; FR-022 adds an "as shot" default quality; SC-003 tightened from 5 minutes to
2 (preview extraction is far faster than a decode); SC-011 and SC-012 added to hold the
rendering fidelity and the zero-generation-loss guarantee.

No items outstanding. Ready for `/speckit-plan`.
