import { Alert, Box, Chip, Paper, Stack, Typography } from '@mui/material';
import type { StockMovement } from '../api/stock';

const sourceLabel = (note: string) => {
  if (note.startsWith('ตัดสต๊อกจากไฟล์ Excel')) {
    return 'นำเข้ายอดขายจาก Excel';
  }
  if (note.startsWith('ตัดสต๊อกจาก')) return 'ตัดสต๊อกตามสูตรเมนู';
  return note;
};

export function StockHistoryPage({
  movements,
}: {
  movements: StockMovement[];
}) {
  return (
    <Stack sx={{ gap: 1.25 }}>
      {movements.length === 0 ? (
        <Alert severity="info">ยังไม่มีการตรวจนับหรือปรับยอดจากบัญชีนี้</Alert>
      ) : (
        movements.map((item) => (
          <Paper
            key={item.id}
            variant="outlined"
            sx={{ p: { xs: 1.75, sm: 2 }, borderRadius: '15px' }}
          >
            <Stack sx={{ gap: 1.25 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 1,
                }}
              >
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>
                    {item.inventoryItemName}
                  </Typography>
                  <Typography color="text.secondary" sx={{ fontSize: 12 }}>
                    บันทึกเมื่อ{' '}
                    {new Date(item.createdAt).toLocaleString('th-TH')}
                  </Typography>
                </Box>
                <Chip
                  label={`${item.quantityDelta < 0 ? 'ลด' : 'เพิ่ม'} ${Math.abs(item.quantityDelta).toLocaleString('th-TH')}`}
                  size="small"
                  sx={{
                    flexShrink: 0,
                    bgcolor: item.quantityDelta < 0 ? '#fbe8e6' : '#e6f2e8',
                    color: item.quantityDelta < 0 ? '#aa3328' : '#2d6d47',
                    fontWeight: 700,
                  }}
                />
              </Box>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto 1fr',
                  alignItems: 'center',
                  gap: 1,
                  p: 1.25,
                  border: '1px solid #eee5df',
                  borderRadius: '10px',
                  bgcolor: '#fffcfa',
                }}
              >
                <Box>
                  <Typography color="text.secondary" sx={{ fontSize: 11 }}>
                    ก่อนบันทึก
                  </Typography>
                  <Typography sx={{ fontSize: 18, fontWeight: 700 }}>
                    {item.quantityBefore.toLocaleString('th-TH')}
                  </Typography>
                </Box>
                <Typography color="text.secondary" sx={{ fontWeight: 700 }}>
                  →
                </Typography>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography color="text.secondary" sx={{ fontSize: 11 }}>
                    คงเหลือ
                  </Typography>
                  <Typography sx={{ fontSize: 18, fontWeight: 700 }}>
                    {item.quantityAfter.toLocaleString('th-TH')}
                  </Typography>
                </Box>
              </Box>
              <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                {sourceLabel(item.note)}
              </Typography>
            </Stack>
          </Paper>
        ))
      )}
    </Stack>
  );
}
