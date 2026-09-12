import { Box, Paper, Stack, Typography } from '@mui/material';
import type { InventoryItem } from '../api/stock';

export function StockOverviewPage({
  ingredients,
  drinkStock,
  postalStock,
}: {
  ingredients: InventoryItem[];
  drinkStock: InventoryItem[];
  postalStock: InventoryItem[];
}) {
  const all = [...ingredients, ...drinkStock, ...postalStock];
  const low = all.filter(
    (item) => item.status === 'low' || item.status === 'out',
  );
  return (
    <Stack sx={{ gap: 2.5 }}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          สต๊อกสาขาวันนี้
        </Typography>
        <Typography color="text.secondary">
          เริ่มตรวจนับเมื่อพร้อมปิดกะ เพื่อให้ยอดคงเหลือตรงกับของจริง
        </Typography>
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          gap: 2,
        }}
      >
        <Summary label="วัตถุดิบ" value={ingredients.length} />
        <Summary label="อุปกรณ์เครื่องดื่ม" value={drinkStock.length} />
        <Summary
          label="ต้องติดตาม"
          value={low.length}
          tone={low.length ? 'error.main' : 'success.main'}
        />
      </Box>
      <Paper sx={{ p: 2.5, borderRadius: '15px' }}>
        <Typography sx={{ fontWeight: 700, mb: 1.5 }}>
          รายการที่ต้องติดตาม
        </Typography>
        {low.length ? (
          <Stack sx={{ gap: 1 }}>
            {low.slice(0, 8).map((item) => (
              <Box
                key={item.id}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 2,
                }}
              >
                <Typography>{item.name}</Typography>
                <Typography color="error.main" sx={{ fontWeight: 700 }}>
                  คงเหลือ {item.quantity} {item.unit}
                </Typography>
              </Box>
            ))}
          </Stack>
        ) : (
          <Typography color="text.secondary">
            สต๊อกทุกกลุ่มอยู่ในระดับที่พร้อมใช้งาน
          </Typography>
        )}
      </Paper>
    </Stack>
  );
}
function Summary({
  label,
  value,
  tone = 'text.primary',
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <Paper sx={{ p: 2.5, borderRadius: '15px' }}>
      <Typography color="text.secondary">{label}</Typography>
      <Typography variant="h4" color={tone} sx={{ fontWeight: 800 }}>
        {value}
      </Typography>
    </Paper>
  );
}
