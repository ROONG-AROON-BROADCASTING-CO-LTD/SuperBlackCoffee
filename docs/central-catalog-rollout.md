# Central catalog rollout

The central catalog separates shared commercial definitions from each branch's
physical stock. There is one shared source for SBC and franchise branches;
individual inventory and menu rows declare their S/M/L applicability. The six
former scope/size templates are archived for audit, not used as separate sources.

## Ownership contract

- Central catalog: names, categories, units, stock-tracking mode, default
  costs and reorder levels, menus, channel prices, recipes, and S/M/L membership.
- Branch selection: which eligible central rows are enabled for that branch.
- Branch: quantities, expiries, lots, movements, purchase orders, counts, and
  sales history.
- Explicit branch exceptions prevent a selected template row from being
  overwritten for that branch.
- A sync may update or hide template-managed branch rows, but never deletes
  physical or historical records.

## Safe rollout sequence

1. Back up the production database using the normal infrastructure process.
2. Deploy the API migration and API handlers before the frontends.
3. Inspect the one shared catalog in Admin > สินค้าและคลังกลาง, including the
   migrated size memberships and any formerly conflicting definitions.
4. Compare the impact preview with the expected SBC and franchise branches.
5. Correct catalog metadata and recipes before syncing. Do not edit branch
   quantities as part of this step.
6. Sync one non-critical SBC and franchise branch per size, then verify menu prices,
   recipes, stock count visibility, and that quantities/expiries are unchanged.
7. Sync the remaining branches from the impact dialog.
8. Deploy Admin, Franchise, Stock, and Attendance frontends.
9. Monitor `catalog_template_sync_events` and application errors during the
   rollout. Use per-branch selection or metadata exceptions for approved deviations.

## Rollback

- Stop further syncs; template edits alone do not alter branch data.
- Branch quantities, lots, movements, orders, and histories remain intact.
- Re-enable a retired template row or correct template metadata, preview the
  impact, and explicitly sync again.
- Do not drop the migration tables or provenance columns as a rollback: they
  are intentionally non-destructive and preserve the audit trail.

## Verification checklist

- Creating a branch assigns the same central catalog ID for both ownership types;
  size controls which rows are eligible.
- New branch inventory begins at zero with no expiry copied from another
  branch.
- Changing branch size switches the assignment and preserves history.
- Template recipe changes affect future deductions only after explicit sync.
- Cost-only ingredients remain usable in recipe costing but are excluded from
  stock alerts, counts, and purchase flows.
- Opting out a branch item does not affect another branch. A recipe ingredient
  cannot be disabled while an enabled branch menu uses it.
