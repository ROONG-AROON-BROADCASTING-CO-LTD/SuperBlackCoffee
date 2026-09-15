import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CompanyDocumentsPage } from '../CompanyDocumentsPage';
import {
  downloadCompanyDocument,
  listCompanyDocuments,
} from '../../api/company-documents';

vi.mock('../../api/company-documents', () => ({
  createCompanyDocument: vi.fn(),
  deleteCompanyDocument: vi.fn(),
  downloadCompanyDocument: vi.fn(),
  listCompanyDocuments: vi.fn(),
}));

describe('CompanyDocumentsPage', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders the document-card skeleton while loading', () => {
    vi.mocked(listCompanyDocuments).mockReturnValueOnce(new Promise(() => {}));

    render(<CompanyDocumentsPage />);

    expect(screen.getByLabelText('กำลังโหลดเอกสารส่วนกลาง')).toBeTruthy();
  });

  it('opens the full document upload drawer for admins', async () => {
    vi.mocked(listCompanyDocuments).mockResolvedValueOnce([]);

    render(<CompanyDocumentsPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'เพิ่มเอกสาร' }));

    expect(
      screen.getByText('อัปโหลดเอกสารเพื่อให้ทีมงานและแฟรนไชส์ดาวน์โหลดได้'),
    ).toBeTruthy();
    expect(screen.getByText('เลือกไฟล์เอกสาร')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'บันทึกเอกสาร' })).toBeTruthy();
  });

  it('shows central documents as cards and limits franchise users to download', async () => {
    vi.mocked(listCompanyDocuments).mockResolvedValueOnce([
      {
        id: 1,
        title: 'กฎระเบียบบริษัท',
        category: 'company_policy',
        fileName: 'company-rules.pdf',
        contentType: 'application/pdf',
        sizeBytes: 1024,
        createdAt: '2026-09-16T00:00:00Z',
      },
    ]);

    render(<CompanyDocumentsPage readOnly />);

    expect(await screen.findByText('กฎระเบียบบริษัท')).toBeTruthy();
    expect(screen.getByText('company-rules.pdf')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'ดาวน์โหลด' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'เพิ่มเอกสาร' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'ลบ' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'ดาวน์โหลด' }));
    await waitFor(() => expect(downloadCompanyDocument).toHaveBeenCalled());
  });
});
