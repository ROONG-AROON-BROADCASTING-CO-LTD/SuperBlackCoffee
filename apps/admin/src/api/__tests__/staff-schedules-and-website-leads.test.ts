import { afterEach, describe, expect, it, vi } from 'vitest';

const secured = vi.hoisted(() => vi.fn());

vi.mock('../client', () => ({ secured }));

import {
  generateStaffSchedules,
  listStaffSchedules,
  replaceStaffShift,
  updateStaffShift,
} from '../staff-schedules';
import { listWebsiteLeads, updateWebsiteLeadStatus } from '../website-leads';

describe('admin scheduling and website-lead API', () => {
  afterEach(() => vi.clearAllMocks());

  it('keeps scheduling reads and every schedule mutation on protected admin endpoints', async () => {
    secured
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({ created: 3, month: '2026-09' })
      .mockResolvedValueOnce({ id: '14' })
      .mockResolvedValueOnce({ id: '14' });

    await listStaffSchedules('2026-09');
    await generateStaffSchedules('2026-09', 8);
    await updateStaffShift(14, { status: 'day_off', leaveType: 'personal' });
    await replaceStaffShift(14, 29);

    expect(secured).toHaveBeenNthCalledWith(
      1,
      '/staff-schedules?month=2026-09',
    );
    expect(secured).toHaveBeenNthCalledWith(2, '/staff-schedules/generate', {
      method: 'POST',
      data: { month: '2026-09', branchId: 8 },
    });
    expect(secured).toHaveBeenNthCalledWith(3, '/staff-schedules/14', {
      method: 'PATCH',
      data: { status: 'day_off', leaveType: 'personal' },
    });
    expect(secured).toHaveBeenNthCalledWith(4, '/staff-schedules/14/replace', {
      method: 'POST',
      data: { sourceShiftId: 29 },
    });
  });

  it('uses the protected lifecycle route when an admin updates a website lead', async () => {
    secured
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({ id: 31, status: 'contacted' });

    await listWebsiteLeads();
    await updateWebsiteLeadStatus(31, 'contacted');

    expect(secured).toHaveBeenNthCalledWith(1, '/website/leads');
    expect(secured).toHaveBeenNthCalledWith(2, '/website/leads/31/status', {
      method: 'PATCH',
      data: { status: 'contacted' },
    });
  });
});
