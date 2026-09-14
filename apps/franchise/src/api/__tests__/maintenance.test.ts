import { describe, expect, it, vi } from 'vitest';

const secured = vi.hoisted(() => vi.fn());

vi.mock('@stackbuild/management', () => ({ secured }));

import {
  createFranchiseMaintenanceTicket,
  listFranchiseMaintenanceTickets,
} from '../maintenance';

describe('franchise maintenance API', () => {
  it('loads repair tickets from the franchise-scoped endpoint', () => {
    listFranchiseMaintenanceTickets();

    expect(secured).toHaveBeenCalledWith('/franchise/maintenance-tickets');
  });

  it('submits a repair ticket without allowing a client-selected branch', () => {
    const input = {
      title: 'เครื่องชงกาแฟมีน้ำรั่ว',
      description: 'น้ำหยดใต้หัวชง',
      priority: 'urgent' as const,
      dueAt: '2026-09-15',
    };

    createFranchiseMaintenanceTicket(input);

    expect(secured).toHaveBeenCalledWith('/franchise/maintenance-tickets', {
      method: 'POST',
      data: input,
    });
  });
});
