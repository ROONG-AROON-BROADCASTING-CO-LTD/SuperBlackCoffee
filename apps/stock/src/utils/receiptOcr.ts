export type ReceiptMenu = {
  id: number;
  name: string;
};

export type ReceiptMenuMatch = {
  menuItemId: number;
  menuName: string;
  quantity: number;
};

export type ReceiptChannel = 'storefront' | 'lineman';

const normalize = (value: string) =>
  value.toLocaleLowerCase('th-TH').replace(/[^\p{L}\p{N}]/gu, '');

const normalizeForMatching = (value: string) =>
  normalize(value).replace(/ju/g, normalize('ปั่น'));

const withoutRoastDescription = (value: string) =>
  value.replace(/คั่ว(?:เข้ม|กลาง)(?:\s*และ\s*คั่ว(?:เข้ม|กลาง))?/g, '');

const quantityAtLineStart = (line: string) => {
  const quantityText = line.match(/^\s*(\d+)(?:\s*[xX×])?/u)?.[1];
  const quantity = Number(quantityText);
  return Number.isInteger(quantity) && quantity > 0 ? quantity : 0;
};

/** Identifies the order source shown in the two POS receipt layouts. */
export function detectReceiptChannel(
  receiptText: string,
): ReceiptChannel | null {
  const text = normalize(receiptText);
  if (
    text.includes(normalize('LINE MAN')) ||
    text.includes(normalize('ไลน์แมน')) ||
    text.includes('lmf')
  ) {
    return 'lineman';
  }
  if (text.includes(normalize('กินที่ร้าน'))) return 'storefront';
  return null;
}

/**
 * Maps receipt lines such as "2 เอสเปรสโซ่ร้อน 120.00" or
 * "1x อเมริกาโน่ (Americano)" to known menu items.
 * Matching is intentionally conservative: unmatched OCR output never creates a
 * stock deduction and staff review the populated quantities before submitting.
 */
export function matchReceiptMenus(
  receiptText: string,
  menus: ReceiptMenu[],
): ReceiptMenuMatch[] {
  const aliases = menus.flatMap((menu) => {
    const exactName = normalizeForMatching(menu.name);
    const receiptName = normalizeForMatching(
      withoutRoastDescription(menu.name),
    );
    return [...new Set([exactName, receiptName])]
      .filter((name) => name.length > 1)
      .map((name) => ({ menu, name }));
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
    const normalizedLine = normalizeForMatching(line);
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
