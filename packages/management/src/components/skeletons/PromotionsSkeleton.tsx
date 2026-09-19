import {
  Box,
  Button,
  Card,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { FilterPill, PlusIcon } from '@stackbuild/ui';

export function PromotionsSkeleton({
  readOnly = false,
  showHeader = false,
  branchName,
}: {
  readOnly?: boolean;
  showHeader?: boolean;
  branchName?: string;
}) {
  return (
    <Box aria-label="กำลังโหลดโปรโมชั่น">
      {showHeader ? (
        <Box sx={{ pb: 3 }}>
          <Stack
            sx={{
              mb: 2.5,
            }}
          >
            <Box>
              {branchName ? (
                <Typography
                  sx={{
                    color: '#805637',
                    fontFamily: 'Kanit, sans-serif',
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  สาขา{branchName}
                </Typography>
              ) : null}
              <Typography
                sx={{
                  color: '#201914',
                  fontFamily: 'Kanit, sans-serif',
                  fontSize: { xs: 18, md: 21 },
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                โปรโมชั่น
              </Typography>
              <Typography
                sx={{
                  mt: 0.35,
                  color: 'text.secondary',
                  fontFamily: 'Kanit, sans-serif',
                  fontSize: 13,
                }}
              >
                {readOnly
                  ? 'เลือกดูรายการโปรโมชั่นและเมนูที่ร่วมรายการของสาขาคุณ'
                  : 'โปรโมชั่นจะใช้สูตรวัตถุดิบของเมนูเดิมในการตัดสต๊อกอัตโนมัติ'}
              </Typography>
            </Box>
          </Stack>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            sx={{
              alignItems: { sm: 'center' },
              justifyContent: 'space-between',
              gap: 1.5,
              mb: 1,
            }}
          >
            <TextField
              size="small"
              placeholder="ค้นหาชื่อเมนูหรือโปรโมชั่น"
              slotProps={{
                htmlInput: {
                  'aria-label': 'ค้นหาชื่อโปรโมชั่น',
                  readOnly: true,
                },
              }}
              sx={{
                width: { xs: '100%', sm: 280 },
                '& .MuiOutlinedInput-root': { borderRadius: '10px' },
              }}
            />
            {readOnly ? null : (
              <Button
                aria-disabled="true"
                tabIndex={-1}
                variant="contained"
                startIcon={<PlusIcon size={17} />}
                sx={{
                  alignSelf: { xs: 'stretch', sm: 'auto' },
                  minHeight: 42,
                  px: 2.25,
                  borderRadius: '12px',
                  bgcolor: '#3c2d24',
                  boxShadow: 'none',
                  fontFamily: 'Kanit, sans-serif',
                  fontWeight: 700,
                  '&:hover': { bgcolor: '#3c2d24', boxShadow: 'none' },
                }}
              >
                เพิ่มโปรโมชั่น
              </Button>
            )}
          </Stack>
          <Stack
            sx={{
              mb: 2.5,
            }}
          >
            <Stack
              direction="row"
              spacing={1}
              sx={{ overflowX: 'auto', pt: 1.5, pb: 0.4 }}
            >
              <FilterPill
                selected
                onClick={() => undefined}
                tabIndex={-1}
                sx={{ flexShrink: 0 }}
              >
                ทั้งหมด
              </FilterPill>
              <FilterPill
                count={3}
                selected={false}
                onClick={() => undefined}
                tabIndex={-1}
                sx={{ flexShrink: 0 }}
              >
                กำลังใช้งาน
              </FilterPill>
              <FilterPill
                count={1}
                selected={false}
                onClick={() => undefined}
                tabIndex={-1}
                sx={{ flexShrink: 0 }}
              >
                กำลังจะเริ่ม
              </FilterPill>
              <FilterPill
                selected={false}
                onClick={() => undefined}
                tabIndex={-1}
                sx={{ flexShrink: 0 }}
              >
                สิ้นสุดแล้ว
              </FilterPill>
            </Stack>
          </Stack>
        </Box>
      ) : null}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            md: 'repeat(4, minmax(0, 1fr))',
          },
          gap: '16px',
        }}
      >
        {Array.from({ length: 4 }, (_, index) => (
          <Card
            key={index}
            variant="outlined"
            sx={{
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              borderRadius: '15px',
              borderColor: '#e8ddd5',
            }}
          >
            <Box
              sx={{
                position: 'relative',
                aspectRatio: '1 / .72',
                bgcolor: '#f1e8de',
              }}
            >
              <Skeleton
                variant="rounded"
                width={74}
                height={25}
                sx={{
                  position: 'absolute',
                  top: 12,
                  left: 12,
                  borderRadius: '12px',
                }}
              />
              <Skeleton
                variant="rounded"
                width={70}
                height={25}
                sx={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  borderRadius: '12px',
                }}
              />
            </Box>
            <Box
              sx={{ display: 'flex', flex: 1, flexDirection: 'column', p: 2 }}
            >
              <Skeleton variant="rounded" width="64%" height={22} />
              <Skeleton
                variant="rounded"
                width="43%"
                height={15}
                sx={{ mt: 0.6 }}
              />
              <Skeleton
                variant="rounded"
                width="78%"
                height={23}
                sx={{ mt: 1.1 }}
              />
              <Box
                sx={{
                  display: 'grid',
                  gap: 0.75,
                  mt: 1.2,
                  p: 1,
                  borderRadius: '9px',
                  bgcolor: '#f8f4f1',
                }}
              >
                <Skeleton variant="rounded" width="66%" height={13} />
                <Skeleton variant="rounded" width="100%" height={13} />
              </Box>
              <Skeleton
                variant="rounded"
                width="82%"
                height={13}
                sx={{ mt: 1.1 }}
              />
              {readOnly ? null : (
                <Skeleton
                  variant="rounded"
                  width="100%"
                  height={35}
                  sx={{ mt: 'auto', pt: 1, borderRadius: '10px' }}
                />
              )}
            </Box>
          </Card>
        ))}
      </Box>
    </Box>
  );
}
