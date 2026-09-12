import { Alert, Paper, Stack, Typography } from '@mui/material';
import type { StockMovement } from '../api/stock';
export function StockHistoryPage({
  movements,
}: {
  movements: StockMovement[];
}) {
  return (
    <Stack sx={{ gap: 2.5 }}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        ประวัติที่ฉันบันทึก
      </Typography>
      {movements.length === 0 ? (
        <Alert severity="info">ยังไม่มีการตรวจนับหรือปรับยอดจากบัญชีนี้</Alert>
      ) : (
        movements.map((item) => (
          <Paper
            key={item.id}
            variant="outlined"
            sx={{ p: 2, borderRadius: 3 }}
          >
            <Typography sx={{ fontWeight: 700 }}>
              {item.inventoryItemName}
            </Typography>
            <Typography color="text.secondary">
              {new Date(item.createdAt).toLocaleString('th-TH')}
            </Typography>
            <Typography sx={{ mt: 1 }}>
              จาก {item.quantityBefore} เป็น {item.quantityAfter} · เปลี่ยน{' '}
              {item.quantityDelta > 0 ? '+' : ''}
              {item.quantityDelta}
            </Typography>
            <Typography color="text.secondary" sx={{ fontSize: 14 }}>
              {item.note}
            </Typography>
          </Paper>
        ))
      )}
    </Stack>
  );
}
