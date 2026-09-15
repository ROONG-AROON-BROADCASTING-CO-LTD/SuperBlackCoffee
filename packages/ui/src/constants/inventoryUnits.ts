export const INVENTORY_UNIT_OPTIONS = [
  { value: 'กรัม', label: 'กรัม' },
  { value: 'กิโลกรัม', label: 'กิโลกรัม' },
  { value: 'ml.', label: 'ml.' },
  { value: 'ลิตร', label: 'ลิตร' },
  { value: 'ขวด', label: 'ขวด' },
  { value: 'กระป๋อง', label: 'กระป๋อง' },
  { value: 'กล่อง', label: 'กล่อง' },
  { value: 'ถุง', label: 'ถุง' },
  { value: 'ซอง', label: 'ซอง' },
  { value: 'ห่อ', label: 'ห่อ' },
  { value: 'ชิ้น', label: 'ชิ้น' },
  { value: 'ใบ', label: 'ใบ' },
  { value: 'ลูก', label: 'ลูก' },
  { value: 'ชุด', label: 'ชุด' },
  { value: 'หลอด', label: 'หลอด' },
  { value: 'กระปุก', label: 'กระปุก' },
  { value: 'แผ่น', label: 'แผ่น' },
  { value: 'มัด', label: 'มัด' },
  { value: 'คู่', label: 'คู่' },
] as const;

/** Keeps the full unit catalog easy to scan without letting the menu fill a drawer. */
export const inventoryUnitSelectSlotProps = {
  select: {
    MenuProps: {
      slotProps: {
        paper: {
          sx: {
            maxHeight: 280,
            borderRadius: '12px',
            mt: 0.5,
          },
        },
        list: {
          dense: true,
          sx: {
            py: 0.5,
            '& .MuiMenuItem-root': {
              minHeight: 32,
              py: 0.5,
              fontFamily: 'Kanit, sans-serif',
              fontSize: 14,
            },
          },
        },
      },
    },
  },
} as const;

const legacyInventoryUnitAliases: Record<string, string> = {
  kg: 'กิโลกรัม',
  liter: 'ลิตร',
  bottle: 'ขวด',
  piece: 'ชิ้น',
  cup: 'ใบ',
  box: 'กล่อง',
  pack: 'ห่อ',
};

/** Keeps existing English unit codes editable while new entries use display units. */
export function normalizeInventoryUnit(unit?: string | null) {
  if (!unit) return '';
  return legacyInventoryUnitAliases[unit] ?? unit;
}
