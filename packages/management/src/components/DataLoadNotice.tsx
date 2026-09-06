import { Card, Typography } from '@mui/material';

export function DataLoadNotice({
  message = 'ไม่สามารถโหลดข้อมูลได้',
}: {
  message?: string;
}) {
  return (
    <Card
      variant="outlined"
      role="alert"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1.5,
        p: 2,
        borderColor: '#edc7c3',
        borderRadius: '15px',
        bgcolor: '#fffaf8',
      }}
    >
      <Typography
        sx={{
          color: '#a22e2a',
          fontFamily: 'Kanit, sans-serif',
          fontSize: 14,
        }}
      >
        {message}
      </Typography>
      <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
        กำลังลองเชื่อมต่อใหม่อัตโนมัติ
      </Typography>
    </Card>
  );
}
