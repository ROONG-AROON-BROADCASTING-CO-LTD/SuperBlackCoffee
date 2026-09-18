export const INGREDIENT_STATUS_BADGES = {
  พร้อมใช้: { main: '#166534', contrastText: '#ffffff' },
  วัตถุดิบใกล้หมด: { main: '#9a4d18', contrastText: '#ffffff' },
  วัตถุดิบหมด: { main: '#b42318', contrastText: '#ffffff' },
  วัตถุดิบค้างสต๊อก: { main: '#5f4b3d', contrastText: '#ffffff' },
  คิดต้นทุนเท่านั้น: { main: '#5f4b3d', contrastText: '#ffffff' },
} as const;

export type IngredientStatus = keyof typeof INGREDIENT_STATUS_BADGES;
