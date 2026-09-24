import { Box, Button, Card, Skeleton, Typography } from '@mui/material';
import { MapPinHouseIcon } from '@stackbuild/ui';

const listSx = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  maxWidth: 1180,
} as const;

const rowSx = {
  display: 'grid',
  gridTemplateColumns: {
    xs: 'repeat(2, minmax(0, 1fr))',
    md: 'minmax(260px, 1.55fr) minmax(125px, .55fr) minmax(145px, .65fr) auto',
  },
  alignItems: 'center',
  gap: { xs: 2, md: 0 },
  p: { xs: 2.25, md: 2.5 },
  borderRadius: 2,
  borderColor: '#e8ddd5',
} as const;

const identitySx = {
  display: 'flex',
  alignItems: 'center',
  gap: 2.25,
  minWidth: 0,
  gridColumn: { xs: '1 / -1', md: 'auto' },
} as const;

const metricSx = {
  px: { xs: 0, md: 2.5 },
  borderLeft: { xs: 0, md: '1px solid #eee4dc' },
} as const;

const actionSx = {
  justifySelf: { xs: 'stretch', md: 'end' },
  gridColumn: { xs: '1 / -1', md: 'auto' },
  minWidth: { md: 172 },
  minHeight: 44,
} as const;

export type BranchOverviewRow = {
  name: string;
  code: string;
  total: number;
  available: number;
};

export function BranchOverviewList({
  rows,
  total,
  totalLabel,
  availableLabel,
  actionLabel,
  unit = 'รายการ',
  onSelectBranch,
}: {
  rows: BranchOverviewRow[];
  total: number;
  totalLabel: string;
  availableLabel: string;
  actionLabel: string;
  unit?: string;
  onSelectBranch: (name: string, code: string) => void;
}) {
  return (
    <>
      <Typography
        sx={{
          mb: 1.5,
          color: 'text.secondary',
          fontFamily: 'Kanit, sans-serif',
          fontSize: 13,
        }}
      >
        {total.toLocaleString('th-TH')} สาขา
      </Typography>
      <Box sx={listSx}>
        {rows.map((branch) => (
          <Card key={branch.code} variant="outlined" sx={rowSx}>
            <Box sx={identitySx}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  flexShrink: 0,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: '50%',
                  color: '#6b4a33',
                  bgcolor: '#f7f1eb',
                }}
              >
                <MapPinHouseIcon size={27} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{
                    fontFamily: 'Kanit, sans-serif',
                    fontSize: { xs: 18, md: 20 },
                    fontWeight: 600,
                    lineHeight: 1.35,
                    color: '#30251f',
                  }}
                >
                  สาขา {branch.name}
                </Typography>
                <Typography
                  sx={{ mt: 0.3, color: 'text.secondary', fontSize: 13 }}
                >
                  {branch.code}
                </Typography>
              </Box>
            </Box>
            {(
              [
                [totalLabel, branch.total],
                [availableLabel, branch.available],
              ] as const
            ).map(([label, value]) => (
              <Box key={label} sx={metricSx}>
                <Typography
                  sx={{
                    color: 'text.secondary',
                    fontFamily: 'Kanit, sans-serif',
                    fontSize: 12,
                  }}
                >
                  {label}
                </Typography>
                <Typography
                  sx={{
                    color: '#30251f',
                    fontFamily: 'Kanit, sans-serif',
                    fontSize: 22,
                    fontWeight: 600,
                    lineHeight: 1.3,
                  }}
                >
                  {value.toLocaleString('th-TH')}{' '}
                  <Box component="span" sx={{ fontSize: 14, fontWeight: 400 }}>
                    {unit}
                  </Box>
                </Typography>
              </Box>
            ))}
            <Button
              variant="contained"
              onClick={() => onSelectBranch(branch.name, branch.code)}
              sx={{
                ...actionSx,
                px: 2.5,
                borderRadius: 1.5,
                bgcolor: '#513723',
                color: '#fff',
                boxShadow: 'none',
                fontFamily: 'Kanit, sans-serif',
                fontSize: 14,
                '&:hover': { bgcolor: '#392719', boxShadow: 'none' },
              }}
            >
              {actionLabel}
            </Button>
          </Card>
        ))}
      </Box>
    </>
  );
}

export function BranchOverviewListSkeleton({ rowCount }: { rowCount: number }) {
  return (
    <Box role="status" aria-label="กำลังโหลดสรุปสาขา">
      <Skeleton variant="text" width={42} height={20} sx={{ mb: 1.5 }} />
      <Box sx={listSx}>
        {Array.from({ length: Math.max(1, rowCount) }, (_, index) => (
          <Card key={index} variant="outlined" sx={rowSx}>
            <Box sx={identitySx}>
              <Skeleton
                variant="circular"
                width={64}
                height={64}
                sx={{ flexShrink: 0 }}
              />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Skeleton variant="text" width={130} height={27} />
                <Skeleton
                  variant="text"
                  width={88}
                  height={18}
                  sx={{ mt: 0.3 }}
                />
              </Box>
            </Box>
            {[72, 48].map((labelWidth, metric) => (
              <Box key={metric} sx={metricSx}>
                <Skeleton variant="text" width={labelWidth} height={18} />
                <Skeleton variant="text" width={84} height={30} />
              </Box>
            ))}
            <Box sx={actionSx}>
              <Skeleton
                variant="rounded"
                width="100%"
                height={44}
                sx={{ borderRadius: 1.5 }}
              />
            </Box>
          </Card>
        ))}
      </Box>
    </Box>
  );
}
