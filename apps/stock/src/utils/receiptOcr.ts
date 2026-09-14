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
  const sortedMenus = [...menus]
    .map((menu) => ({ ...menu, normalizedName: normalize(menu.name) }))
    .filter((menu) => menu.normalizedName.length > 1)
    .sort(
      (left, right) => right.normalizedName.length - left.normalizedName.length,
    );
  const quantities = new Map<number, ReceiptMenuMatch>();

  for (const line of receiptText.split(/\r?\n/)) {
    const normalizedLine = normalize(line);
    const matchedMenu = sortedMenus.find((menu) =>
      normalizedLine.includes(menu.normalizedName),
    );
    if (!matchedMenu) continue;

    const quantity = quantityAtLineStart(line);
    if (!quantity) continue;

    const current = quantities.get(matchedMenu.id);
    quantities.set(matchedMenu.id, {
      menuItemId: matchedMenu.id,
      menuName: matchedMenu.name,
      quantity: (current?.quantity ?? 0) + quantity,
    });
  }

  return [...quantities.values()];
}
