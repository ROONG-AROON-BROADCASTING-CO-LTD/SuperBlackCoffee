import {
  Box,
  Card,
  CardContent,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';

type CentralCatalogSkeletonSection =
  | 'menus'
  | 'ingredients'
  | 'fresh-ingredients'
  | 'drink-equipment'
  | 'postal-equipment'
  | 'branches'
  | 'sync';

const cardSx = {
  borderColor: '#eadfd7',
  boxShadow: 'none',
  borderRadius: 1,
  overflow: 'hidden',
};

const tableColumns = {
  xs: '52px minmax(0,1fr) auto',
  lg: '48px minmax(0,1fr) 64px 56px 80px 88px 200px',
};

const skeletonSx = { bgcolor: '#eee5df' };

function CatalogRowsSkeleton({ isMenu }: { isMenu: boolean }) {
  return (
    <>
      <Box
        sx={{
          px: 2,
          py: 1,
          bgcolor: '#faf8f6',
          borderBlock: '1px solid #eee3dc',
        }}
      >
        <Skeleton variant="rounded" width={56} height={14} sx={skeletonSx} />
      </Box>
      <Box
        sx={{
          display: { xs: 'none', lg: 'grid' },
          gridTemplateColumns: tableColumns,
          alignItems: 'center',
          columnGap: 2,
          px: 2,
          py: 1,
          bgcolor: '#faf8f6',
          borderBottom: '1px solid #eee3dc',
        }}
      >
        {[28, 72, 52, 48, isMenu ? 64 : 72, 64, 92].map((width, index) => (
          <Skeleton
            key={`${width}-${index}`}
            variant="rounded"
            width={width}
            height={12}
            sx={{
              ...skeletonSx,
              justifySelf: index === 4 || index === 5 ? 'end' : 'start',
            }}
          />
        ))}
      </Box>
      <Box role="presentation" aria-label="กำลังโหลดรายการข้อมูลกลาง">
        {Array.from({ length: 8 }, (_, index) => (
          <Box
            key={index}
            sx={{
              display: 'grid',
              gridTemplateColumns: tableColumns,
              alignItems: 'center',
              columnGap: 2,
              px: 2,
              py: 1.25,
              minHeight: 77,
              borderBottom: '1px solid #f0e7e1',
            }}
          >
            <Skeleton
              variant="rounded"
              width={52}
              height={52}
              sx={{ ...skeletonSx, borderRadius: '10px' }}
            />
            <Box sx={{ minWidth: 0 }}>
              <Skeleton
                variant="rounded"
                width={`${58 + (index % 3) * 9}%`}
                height={15}
                sx={skeletonSx}
              />
              <Skeleton
                variant="rounded"
                width="38%"
                height={11}
                sx={{ ...skeletonSx, mt: 0.75 }}
              />
              <Skeleton
                variant="rounded"
                width="72%"
                height={11}
                sx={{
                  ...skeletonSx,
                  mt: 0.75,
                  display: { xs: 'block', lg: 'none' },
                }}
              />
            </Box>
            {[54, 38, 66, 58].map((width, valueIndex) => (
              <Skeleton
                key={`${width}-${valueIndex}`}
                variant="rounded"
                width={width}
                height={13}
                sx={{
                  ...skeletonSx,
                  display: { xs: 'none', lg: 'block' },
                  justifySelf: valueIndex > 1 ? 'end' : 'start',
                }}
              />
            ))}
            <Stack
              direction="row"
              spacing={1}
              sx={{ borderLeft: '1px solid #f0e7e1', pl: 2 }}
            >
              <Skeleton
                variant="rounded"
                width={84}
                height={36}
                sx={{ ...skeletonSx, borderRadius: '12px' }}
              />
              <Skeleton
                variant="rounded"
                width={84}
                height={36}
                sx={{ ...skeletonSx, borderRadius: '12px' }}
              />
            </Stack>
          </Box>
        ))}
      </Box>
      <Stack
        direction="row"
        sx={{
          px: 2,
          py: 1.5,
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Skeleton variant="rounded" width={150} height={13} sx={skeletonSx} />
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <Skeleton
            variant="rounded"
            width={62}
            height={30}
            sx={{ ...skeletonSx, borderRadius: '12px' }}
          />
          <Skeleton variant="rounded" width={30} height={13} sx={skeletonSx} />
          <Skeleton
            variant="rounded"
            width={62}
            height={30}
            sx={{ ...skeletonSx, borderRadius: '12px' }}
          />
        </Stack>
      </Stack>
    </>
  );
}

function CatalogListSkeleton({
  section,
}: {
  section: CentralCatalogSkeletonSection;
}) {
  const isMenu = section === 'menus';
  return (
    <Card variant="outlined" sx={cardSx} aria-label="กำลังโหลดข้อมูลกลาง">
      <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          sx={{ p: 2, gap: 1, alignItems: { md: 'center' } }}
        >
          <Skeleton
            variant="rounded"
            height={38}
            sx={{ ...skeletonSx, flex: 1, minWidth: 180, borderRadius: '12px' }}
          />
          {isMenu ? (
            <Skeleton
              variant="rounded"
              width={190}
              height={38}
              sx={{ ...skeletonSx, borderRadius: '12px' }}
            />
          ) : null}
          <Stack direction="row" spacing={0.5}>
            {[64, 58, 58, 58].map((width, index) => (
              <Skeleton
                key={index}
                variant="rounded"
                width={width}
                height={38}
                sx={{ ...skeletonSx, borderRadius: '12px' }}
              />
            ))}
          </Stack>
          <Skeleton
            variant="rounded"
            width={isMenu ? 118 : 150}
            height={38}
            sx={{ ...skeletonSx, borderRadius: '12px' }}
          />
        </Stack>
        <CatalogRowsSkeleton isMenu={isMenu} />
      </CardContent>
    </Card>
  );
}

const headingSx = {
  color: '#3c2d24',
  fontFamily: 'Kanit, sans-serif',
  fontSize: 17,
  fontWeight: 600,
};

const descriptionSx = {
  color: '#86766c',
  fontFamily: 'Kanit, sans-serif',
  fontSize: 13,
};

function BranchCatalogSkeleton() {
  return (
    <Box
      sx={{ maxWidth: 1240, display: 'grid', gap: 2 }}
      aria-label="กำลังโหลดรายการสาขาและแฟรนไชส์"
    >
      <Card variant="outlined" sx={cardSx}>
        <CardContent
          sx={{
            p: { xs: 2, sm: 2.5 },
            '&:last-child': { pb: { xs: 2, sm: 2.5 } },
          }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            sx={{
              alignItems: { sm: 'center' },
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Box>
              <Typography component="h2" sx={headingSx}>
                ข้อมูลกลาง
              </Typography>
              <Typography sx={descriptionSx}>
                ตรวจสอบเมนู วัตถุดิบ และอุปกรณ์ชุดกลางที่ทุกสาขา
                และแฟรนไชส์ใช้ร่วมกัน
              </Typography>
            </Box>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Skeleton
                variant="rounded"
                width={88}
                height={13}
                sx={skeletonSx}
              />
              <Skeleton
                variant="rounded"
                width={112}
                height={38}
                sx={{ ...skeletonSx, borderRadius: '12px' }}
              />
            </Stack>
          </Stack>
        </CardContent>
      </Card>
      <Card variant="outlined" sx={cardSx}>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <Box sx={{ p: 2 }}>
            <Typography component="h2" sx={headingSx}>
              รายการที่ใช้รายสาขา
            </Typography>
            <Typography sx={descriptionSx}>
              ดูรายการของสาขาที่เลือกและเปิดหรือปิดการใช้งานได้ทันที
              โดยไม่เปลี่ยนยอดสต๊อกจริง
            </Typography>
            <Skeleton
              variant="rounded"
              width="100%"
              height={40}
              sx={{ ...skeletonSx, mt: 2, maxWidth: 440, borderRadius: '12px' }}
            />
          </Box>
          <Box
            sx={{
              px: 2,
              py: 1,
              bgcolor: '#faf8f6',
              borderBlock: '1px solid #eee3dc',
            }}
          >
            <Skeleton
              variant="rounded"
              width={56}
              height={13}
              sx={skeletonSx}
            />
          </Box>
          <Box sx={{ minHeight: 480 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '76px minmax(0,1fr) 170px 130px 94px',
                gap: 1,
                px: 2,
                py: 1,
                bgcolor: '#faf8f6',
                borderBottom: '1px solid #eee3dc',
              }}
            >
              {[28, 70, 54, 46, 42].map((width, index) => (
                <Skeleton
                  key={index}
                  variant="rounded"
                  width={width}
                  height={12}
                  sx={skeletonSx}
                />
              ))}
            </Box>
            {Array.from({ length: 6 }, (_, index) => (
              <Box
                key={index}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '76px minmax(0,1fr) 170px 130px 94px',
                  gap: 1,
                  alignItems: 'center',
                  px: 2,
                  py: 1.25,
                  minHeight: 70,
                  borderBottom: '1px solid #f0e7e1',
                }}
              >
                <Skeleton
                  variant="rounded"
                  width={52}
                  height={52}
                  sx={{ ...skeletonSx, borderRadius: '10px' }}
                />
                <Box>
                  <Skeleton
                    variant="rounded"
                    width={`${48 + (index % 3) * 12}%`}
                    height={15}
                    sx={skeletonSx}
                  />
                  <Skeleton
                    variant="rounded"
                    width="30%"
                    height={11}
                    sx={{ ...skeletonSx, mt: 0.75 }}
                  />
                </Box>
                <Skeleton
                  variant="rounded"
                  width={76}
                  height={13}
                  sx={skeletonSx}
                />
                <Skeleton
                  variant="rounded"
                  width={72}
                  height={24}
                  sx={{ ...skeletonSx, borderRadius: '12px' }}
                />
                <Skeleton
                  variant="rounded"
                  width={38}
                  height={22}
                  sx={{ ...skeletonSx, borderRadius: '12px' }}
                />
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

export function AdminCentralCatalogSkeleton({
  section,
}: {
  section: CentralCatalogSkeletonSection;
}) {
  return section === 'branches' || section === 'sync' ? (
    <BranchCatalogSkeleton />
  ) : (
    <CatalogListSkeleton section={section} />
  );
}
