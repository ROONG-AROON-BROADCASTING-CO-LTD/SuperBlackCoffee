import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminCustomerChatPage } from '../AdminCustomerChatPage';
import { listWebsiteLeads, updateWebsiteLeadStatus } from '../../../api';

vi.mock('../../../api', () => ({
  listWebsiteLeads: vi.fn(),
  updateWebsiteLeadStatus: vi.fn(),
}));
const lead = {
  id: 21,
  name: 'Audit customer',
  phone: '0800000000',
  email: 'audit@example.test',
  topic: 'franchise',
  plan: 'M',
  province: 'อยุธยา',
  message: 'สนใจเปิดร้าน',
  status: 'new' as const,
  createdAt: '2026-10-07T10:00:00Z',
};
let client: QueryClient;
function renderPage() {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AdminCustomerChatPage />
    </QueryClientProvider>,
  );
}
async function selectLead() {
  await screen.findByText(lead.name);
  fireEvent.click(screen.getByRole('button', { name: /Audit customer/ }));
}
describe('Admin customer website lead transitions', () => {
  beforeEach(() => {
    vi.mocked(listWebsiteLeads).mockResolvedValue([lead]);
  });
  afterEach(() => {
    cleanup();
    client?.clear();
    vi.clearAllMocks();
  });
  it('shows server errors and retains the lead for retry after a rejected status change', async () => {
    vi.mocked(updateWebsiteLeadStatus).mockRejectedValueOnce(
      new Error('ไม่สามารถปิดลีดได้'),
    );
    renderPage();
    await selectLead();
    fireEvent.click(screen.getByRole('button', { name: 'ปิดลีด' }));
    expect(await screen.findByText('ไม่สามารถปิดลีดได้')).toBeInTheDocument();
    expect(client.getQueryData(['website-leads'])).toEqual([lead]);
    expect(screen.getByRole('button', { name: 'ปิดลีด' })).toBeEnabled();
    expect(updateWebsiteLeadStatus).toHaveBeenCalledExactlyOnceWith(
      21,
      'closed',
    );
  });
  it('reloads the server status after contacting a lead and hides the completed action', async () => {
    vi.mocked(updateWebsiteLeadStatus).mockResolvedValueOnce({
      id: 21,
      status: 'contacted',
    });
    renderPage();
    await selectLead();
    vi.mocked(listWebsiteLeads).mockResolvedValue([
      { ...lead, status: 'contacted' },
    ]);
    fireEvent.click(
      screen.getByRole('button', { name: 'ทำเครื่องหมายว่าติดต่อแล้ว' }),
    );
    await waitFor(() =>
      expect(client.getQueryData(['website-leads'])).toEqual([
        { ...lead, status: 'contacted' },
      ]),
    );
    expect(updateWebsiteLeadStatus).toHaveBeenCalledExactlyOnceWith(
      21,
      'contacted',
    );
    expect(
      screen.queryByRole('button', { name: 'ทำเครื่องหมายว่าติดต่อแล้ว' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText('พิมพ์ข้อความถึงลูกค้า'),
    ).not.toBeInTheDocument();
  });
  it('recovers from a failed website lead load through the retry button', async () => {
    vi.mocked(listWebsiteLeads).mockRejectedValueOnce(new Error('offline'));
    renderPage();
    expect(
      await screen.findByText('โหลดข้อความจากเว็บไซต์ไม่สำเร็จ'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'ลองใหม่' }));
    expect(await screen.findByText(lead.name)).toBeInTheDocument();
    expect(listWebsiteLeads).toHaveBeenCalledTimes(2);
  });
});
