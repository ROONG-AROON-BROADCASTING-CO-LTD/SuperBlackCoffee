# Central catalog rollout

The central catalog separates shared commercial definitions from each branch's
physical stock. The six authoritative templates are `SBC/Franchise × S/M/L`.

## Ownership contract

- Central template: names, categories, units, stock-tracking mode, default
  costs and reorder levels, menus, channel prices, availability, and recipes.
- Branch: quantities, expiries, lots, movements, purchase orders, counts, and
  sales history.
- Explicit branch exceptions prevent a selected template row from being
  overwritten for that branch.
- A sync may update or hide template-managed branch rows, but never deletes
  physical or historical records.

## Safe rollout sequence

1. Back up the production database using the normal infrastructure process.
2. Deploy the API migration and API handlers before the frontends.
3. Inspect all six seeded templates in Admin > สินค้าและคลังกลาง.
4. Compare the impact preview for each template with the expected branches.
5. Correct template metadata and recipes before syncing. Do not edit branch
   quantities as part of this step.
6. Sync one non-critical branch per scope and size, then verify menu prices,
   recipes, stock count visibility, and that quantities/expiries are unchanged.
7. Sync the remaining branches from the impact dialog.
8. Deploy Admin, Franchise, Stock, and Attendance frontends.
9. Monitor `catalog_template_sync_events` and application errors during the
   rollout. Use branch exceptions for approved one-branch deviations.

## Rollback

- Stop further syncs; template edits alone do not alter branch data.
- Branch quantities, lots, movements, orders, and histories remain intact.
- Re-enable a retired template row or correct template metadata, preview the
  impact, and explicitly sync again.
- Do not drop the migration tables or provenance columns as a rollback: they
  are intentionally non-destructive and preserve the audit trail.

## Verification checklist

- Creating a branch assigns the matching scope/size template.
- New branch inventory begins at zero with no expiry copied from another
  branch.
- Changing branch size switches the assignment and preserves history.
- Template recipe changes affect future deductions only after explicit sync.
- Cost-only ingredients remain usable in recipe costing but are excluded from
  stock alerts, counts, and purchase flows.
- SBC and franchise templates never appear in the other scope's branch list.
