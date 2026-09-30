import { describe, expect, it, vi } from 'vitest';

const downloadSecuredPDF = vi.hoisted(() => vi.fn());
const secured = vi.hoisted(() => vi.fn());

vi.mock('../client', () => ({
  downloadSecuredPDF,
  secured,
}));

import {
  downloadInspectionPDF,
  downloadMaintenancePDF,
  randomizeCafeStandardInspection,
  randomizeIngredientInspection,
  randomizeInspection,
} from '../operations';

describe('inspection assignment API', () => {
  it.each([
    ['technician', randomizeInspection, '/inspections/randomize'],
    [
      'ingredients',
      randomizeIngredientInspection,
      '/inspections/randomize-ingredients',
    ],
    [
      'cafe standard',
      randomizeCafeStandardInspection,
      '/inspections/randomize-cafe-standard',
    ],
  ])(
    'preserves exact branch selection for %s work orders',
    async (_name, create, endpoint) => {
      const assignment = { id: 11, branchCode: 'FRA-SPB-S' };
      secured.mockResolvedValueOnce(assignment);
      const input = {
        inspectorName: 'ออม',
        branchSize: 'S' as const,
        dueAt: '2026-10-01',
        excludeDays: 30,
        branchScope: 'branch' as const,
        branchCode: 'FRA-SPB-S',
      };

      await expect(create(input)).resolves.toBe(assignment);
      expect(secured).toHaveBeenLastCalledWith(endpoint, {
        method: 'POST',
        data: input,
      });
    },
  );

  it('propagates a server rejection instead of reporting a created assignment', async () => {
    secured.mockRejectedValueOnce(new Error('ไม่มีสิทธิ์สร้างใบงาน'));

    await expect(
      randomizeInspection({
        inspectorName: 'ออม',
        branchSize: 'all',
        dueAt: '',
        excludeDays: 30,
        branchScope: 'franchise',
      }),
    ).rejects.toThrow('ไม่มีสิทธิ์สร้างใบงาน');
  });
});

describe('inspection PDF download', () => {
  it('uses a descriptive, filesystem-safe file name with work and branch details', async () => {
    downloadSecuredPDF.mockResolvedValueOnce(undefined);

    await downloadInspectionPDF(17, 'พิษณุโลก / กลาง', 'SBC-PLK-001');

    expect(downloadSecuredPDF).toHaveBeenCalledWith(
      '/inspections/17/pdf',
      'ใบงานตรวจสภาพอุปกรณ์_งานที่-17_สาขา-พิษณุโลก-กลาง_SBC-PLK-001.pdf',
    );
  });

  it('keeps the work number when branch information is unavailable', async () => {
    downloadSecuredPDF.mockResolvedValueOnce(undefined);

    await downloadInspectionPDF(18);

    expect(downloadSecuredPDF).toHaveBeenCalledWith(
      '/inspections/18/pdf',
      'ใบงานตรวจสภาพอุปกรณ์_งานที่-18.pdf',
    );
  });

  it('uses the separate material-inspection name for ingredient work orders', async () => {
    downloadSecuredPDF.mockResolvedValueOnce(undefined);

    await downloadInspectionPDF(19, 'อยุธยา', 'SBC-AYT-001', 'ingredients');

    expect(downloadSecuredPDF).toHaveBeenCalledWith(
      '/inspections/19/pdf',
      'ใบงานตรวจคุณภาพวัตถุดิบ_งานที่-19_สาขา-อยุธยา_SBC-AYT-001.pdf',
    );
  });

  it('uses the coffee shop standard name for service-standard work orders', async () => {
    downloadSecuredPDF.mockResolvedValueOnce(undefined);

    await downloadInspectionPDF(20, 'อยุธยา', 'SBC-AYT-001', 'cafe_standard');

    expect(downloadSecuredPDF).toHaveBeenCalledWith(
      '/inspections/20/pdf',
      'ใบงานตรวจมาตรฐานและบริการร้านกาแฟ_งานที่-20_สาขา-อยุธยา_SBC-AYT-001.pdf',
    );
  });

  it('uses a descriptive file name for a franchise repair work order', async () => {
    downloadSecuredPDF.mockResolvedValueOnce(undefined);

    await downloadMaintenancePDF(9, 'อยุธยา', 'SBC-AYT-001');

    expect(downloadSecuredPDF).toHaveBeenCalledWith(
      '/maintenance-tickets/9/pdf',
      'ใบงานแจ้งซ่อม_งานที่-9_สาขา-อยุธยา_SBC-AYT-001.pdf',
    );
  });
});
