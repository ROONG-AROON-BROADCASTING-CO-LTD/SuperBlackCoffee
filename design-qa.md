# Central catalog branch table QA

## Comparison target

- Source visual truth: central-catalog table pattern in the user-provided Admin screenshots (2026-09-21), including the ingredient, fresh-ingredient, drink-equipment, and postal-equipment list tables.
- Implementation: `http://localhost:5174/central-catalog/branches`.
- Implementation evidence: browser-rendered capture during this task, state `พิษณุโลก · SBC-PLK-001 · M` selected.
- Viewport: 1478 × 866 CSS px at device scale factor 1.
- Source normalization: the supplied reference screenshots have different browser-chrome crops, so comparison is limited to the app content region at the same desktop density.
- Focused region: branch selector, item-count strip, column header, and the first visible data rows. A focused region is required because table density and dividers are not legible enough in a full-page comparison alone.

## Findings

No actionable P0, P1, or P2 differences remain.

- Fonts and typography: Kanit typography, small metadata scale, and column-label weight now match the central catalog table pattern.
- Spacing and layout rhythm: controls remain padded inside the card; the count strip, header, and rows now run edge-to-edge like the other catalog tables. The card and table use the shared 8 px radius.
- Colors and visual tokens: the count strip and header use the catalog table background `#faf8f6`; dividers use the same warm neutral border token as the other catalog lists.
- Image quality and asset fidelity: this table has no image assets in the reference state.
- Copy and content: empty state, count, branch size, statuses, and toggle labels are preserved and readable.

## Comparison history

1. Initial state: the branch table had an independently rounded, bordered container with a different header fill and inset spacing.
   - Fix: moved the controls to the padded card header and made the count strip, header, body, and empty state use the shared full-width catalog table structure.
2. Post-fix: verified both the empty selection state and the selected `พิษณุโลก · SBC-PLK-001 · M` state in the browser. No actionable visual mismatch was found.

## Implementation checklist

- [x] Keep the branch selector and filters above the table content.
- [x] Use a full-width count strip and column header.
- [x] Keep the empty state inside a real table at the production table height.
- [x] Preserve search, category tabs, status, and enable/disable controls after a branch is selected.

## Follow-up polish

- [P3] Consider adding pagination only when the branch-list API supports a bounded page size; the current fixed-height scroll area intentionally preserves the existing interaction.

final result: passed
