import { Box, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import {
  BadgeIcon,
  ChartLineIcon,
  ClockIcon,
  ReceiptTextIcon,
} from '@stackbuild/ui';
import type { AttendanceSummary } from '../api/attendance';

type SummaryCard = {
  label: string;
  value: number | undefined;
  color: string;
  icon: ReactNode;
};

type AttendanceDashboardPageProps = {
  username: string;
  summary: AttendanceSummary | null;
};

export function AttendanceDashboardPage({
  username,
  summary,
}: AttendanceDashboardPageProps) {
  const summaryCards: SummaryCard[] = [
    {
      label: 'ลาป่วย',
      value: summary?.sickLeaveCount,
      color: '#bf5b4b',
      icon: <BadgeIcon size={22} />,
    },
    {
      label: 'ลากิจ',
      value: summary?.personalLeaveCount,
      color: '#9b6a3d',
      icon: <ReceiptTextIcon size={22} />,
    },
    {
      label: 'ลาอื่น ๆ',
      value: summary?.otherLeaveCount,
      color: '#77645a',
      icon: <ChartLineIcon size={22} />,
    },
    {
      label: 'มาสาย',
      value: summary?.lateCount,
      color: '#cf8a35',
      icon: <ClockIcon size={22} />,
    },
  ];
  return (
    <Stack spacing={2.5}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
        }}
      >
        <Box>
          <Typography
            sx={{
              display: { xs: 'none', md: 'block' },
              fontSize: 24,
              fontWeight: 700,
              lineHeight: 1.2,
            }}
          >
            ภาพรวม
          </Typography>
          <Typography color="text.secondary">สวัสดี {username}</Typography>
        </Box>
      </Box>
      <Box>
        <Typography sx={{ mb: 1.25, fontWeight: 700 }}>สรุปเดือนนี้</Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 1.5,
          }}
        >
          {summaryCards.map((card) => (
            <Box
              key={card.label}
              sx={{
                minWidth: 0,
                p: 2,
                border: '1px solid #e8ddd5',
                borderRadius: '15px',
                bgcolor: '#fffdfb',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  color: card.color,
                }}
              >
                <Box sx={{ lineHeight: 0 }}>{card.icon}</Box>
                <Typography sx={{ fontWeight: 600 }}>{card.label}</Typography>
              </Box>
              <Typography
                sx={{
                  mt: 1.5,
                  fontSize: 'clamp(2.25rem, 4vw, 3.5rem)',
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                {card.value ?? '-'}{' '}
                <Typography
                  component="span"
                  color="text.secondary"
                  sx={{
                    fontSize: 'clamp(0.875rem, 1.5vw, 1.125rem)',
                    fontWeight: 500,
                  }}
                >
                  ครั้ง
                </Typography>
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Stack>
  );
}
