import { Card, CardContent, Stack, Typography } from '@mui/material';
import { DashboardMain } from '@stackbuild/ui';
import { AdminPageIntro } from '../../components/AdminPageIntro';

const content: Record<string, [string, string][]> = {
  คำสั่งซื้อ: [
    ['ออเดอร์กำลังดำเนินการ', '8 รายการต้องการการจัดการ'],
    ['ออเดอร์วันนี้', '86 คำสั่งซื้อ'],
  ],
  เมนูและสินค้า: [
    ['เมนูที่ขายดีที่สุด', 'Iced Americano'],
    ['สต็อกวัตถุดิบ', 'กาแฟคงเหลือเพียงพอ'],
  ],
};

export function AdminDashboardPage({ title }: { title: string }) {
  return (
    <DashboardMain>
      <Stack spacing={2}>
        <AdminPageIntro title={title} description={`ภาพรวมข้อมูล${title}`} />
        {(content[title] ?? []).map(([heading, detail]) => (
          <Card key={heading}>
            <CardContent>
              <Typography variant="h6">{heading}</Typography>
              <Typography color="text.secondary">{detail}</Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </DashboardMain>
  );
}
