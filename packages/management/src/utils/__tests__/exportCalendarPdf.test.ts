import { afterEach, describe, expect, it, vi } from 'vitest';
import { exportDailyReportAsPdf } from '../exportCalendarPdf';

describe('exportDailyReportAsPdf', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens a printable daily report with readable employee entries', () => {
    const print = vi.fn();
    const focus = vi.fn();
    const popup = {
      document: {
        open: vi.fn(),
        write: vi.fn(),
        close: vi.fn(),
      },
      focus,
      print,
    };
    vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window);
    vi.spyOn(window, 'setTimeout').mockImplementation((callback) => {
      (callback as () => void)();
      return 1 as unknown as number;
    });

    expect(
      exportDailyReportAsPdf({
        title: 'รายงาน <ลงเวลา>',
        period: 'กันยายน 2569',
        branchName: 'อยุธยา',
        days: [
          {
            date: 'วันจันทร์ที่ 8 กันยายน 2569',
            holidayName: 'วันหยุดทดสอบ',
            entries: [
              {
                name: 'อรทัย ศรีสุข',
                detail: 'เข้า 09:00 · ออก 17:00',
                tone: 'danger',
              },
            ],
          },
        ],
      }),
    ).toBe(true);

    expect(popup.document.write).toHaveBeenCalledWith(
      expect.stringContaining('รายงาน &lt;ลงเวลา&gt;'),
    );
    expect(popup.document.write).toHaveBeenCalledWith(
      expect.stringContaining('วันจันทร์ที่ 8 กันยายน 2569'),
    );
    expect(popup.document.write).toHaveBeenCalledWith(
      expect.stringContaining('อรทัย ศรีสุข'),
    );
    expect(popup.document.write).toHaveBeenCalledWith(
      expect.stringContaining('report-entry--danger'),
    );
    expect(focus).toHaveBeenCalledOnce();
    expect(print).toHaveBeenCalledOnce();
  });

  it('returns false when the browser blocks the print window', () => {
    vi.spyOn(window, 'open').mockReturnValue(null);

    expect(
      exportDailyReportAsPdf({
        title: 'รายงานลงเวลาพนักงาน',
        period: 'กันยายน 2569',
        days: [],
      }),
    ).toBe(false);
  });
});
