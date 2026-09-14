import { describe, expect, it, vi } from 'vitest';

const downloadSecuredPDF = vi.hoisted(() => vi.fn());

vi.mock('../client', () => ({
  downloadSecuredPDF,
  secured: vi.fn(),
}));

import { downloadInspectionPDF, downloadMaintenancePDF } from '../operations';

describe('inspection PDF download', () => {
  it('uses a descriptive, filesystem-safe file name with work and branch details', async () => {
    downloadSecuredPDF.mockResolvedValueOnce(undefined);

    await downloadInspectionPDF(17, 'พิษณุโลก / กลาง', 'SBC-PLK-001');

    expect(downloadSecuredPDF).toHaveBeenCalledWith(
      '/inspections/17/pdf',
      'ใบงานตรวจช่าง_งานที่-17_สาขา-พิษณุโลก-กลาง_SBC-PLK-001.pdf',
    );
  });

  it('keeps the work number when branch information is unavailable', async () => {
    downloadSecuredPDF.mockResolvedValueOnce(undefined);

    await downloadInspectionPDF(18);

    expect(downloadSecuredPDF).toHaveBeenCalledWith(
      '/inspections/18/pdf',
      'ใบงานตรวจช่าง_งานที่-18.pdf',
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
