export type ReceiptMenu = {
  id: number;
  name: string;
};

export type ReceiptMenuMatch = {
  menuItemId: number;
  menuName: string;
  quantity: number;
};

const normalize = (value: string) =>
  value.toLocaleLowerCase('th-TH').replace(/[^\p{L}\p{N}]/gu, '');

// Wongnai receipts omit the roast options that are kept in the catalog name.
// Keep that convenient shorthand, but only when it resolves to one catalog item.
const withoutRoastDescription = (value: string) =>
  value.replace(/คั่ว(?:เข้ม|กลาง)(?:\s*และ\s*คั่ว(?:เข้ม|กลาง))?/g, '');

const quantityAtLineStart = (line: string) => {
  const quantityText = line.match(/^\s*(\d+(?:\.\d+)?)/)?.[1];
  const quantity = Number(quantityText);
  return Number.isInteger(quantity) && quantity > 0 ? quantity : 0;
};

/**
 * Maps receipt lines such as "2 เอสเปรสโซ่ร้อน 120.00" to known menu items.
 * Matching is intentionally conservative: unmatched OCR output never creates a
 * stock deduction and staff review the populated quantities before submitting.
 */
export function matchReceiptMenus(
  receiptText: string,
  menus: ReceiptMenu[],
): ReceiptMenuMatch[] {
  const aliases = menus.flatMap((menu) => {
    const normalizedName = normalize(menu.name);
    const receiptName = normalize(withoutRoastDescription(menu.name));
    const names = [...new Set([normalizedName, receiptName])].filter(
      (name) => name.length > 1,
    );
    return names.map((name) => ({ menu, name }));
  });
  const sortedAliases = aliases
    .filter(
      (alias) =>
        aliases.filter((candidate) => candidate.name === alias.name).length ===
        1,
    )
    .sort((left, right) => right.name.length - left.name.length);
  const quantities = new Map<number, ReceiptMenuMatch>();

  for (const line of receiptText.split(/\r?\n/)) {
    const normalizedLine = normalize(line);
    const matchedAlias = sortedAliases.find((alias) =>
      normalizedLine.includes(alias.name),
    );
    if (!matchedAlias) continue;

    const quantity = quantityAtLineStart(line);
    if (!quantity) continue;

    const current = quantities.get(matchedAlias.menu.id);
    quantities.set(matchedAlias.menu.id, {
      menuItemId: matchedAlias.menu.id,
      menuName: matchedAlias.menu.name,
      quantity: (current?.quantity ?? 0) + quantity,
    });
  }

  return [...quantities.values()];
}
