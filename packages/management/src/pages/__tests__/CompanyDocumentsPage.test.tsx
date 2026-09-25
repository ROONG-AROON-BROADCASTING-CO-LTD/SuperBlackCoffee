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
  deleteCompanyDocument,
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
    expect(screen.getByText(/company-rules\.pdf/)).toBeTruthy();
    expect(screen.getByRole('img', { name: 'PDF file' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'ดาวน์โหลด' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'เพิ่มเอกสาร' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'ลบเอกสาร' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'ดาวน์โหลด' }));
    await waitFor(() => expect(downloadCompanyDocument).toHaveBeenCalled());
  });

  it('filters documents by text and category without hiding admin actions', async () => {
    vi.mocked(listCompanyDocuments).mockResolvedValueOnce([
      {
        id: 1,
        title: 'ใบลา',
        category: 'leave_form',
        fileName: 'leave-form.docx',
        contentType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        sizeBytes: 2048,
        createdAt: '2026-09-16T00:00:00Z',
      },
      {
        id: 2,
        title: 'ข้อบังคับบริษัท',
        category: 'company_policy',
        fileName: 'company-policy.pdf',
        contentType: 'application/pdf',
        sizeBytes: 4096,
        createdAt: '2026-09-17T00:00:00Z',
      },
    ]);

    render(<CompanyDocumentsPage />);

    expect(await screen.findByText('2 ไฟล์')).toBeTruthy();
    fireEvent.change(
      screen.getByPlaceholderText('ค้นหาชื่อเอกสาร ชื่อไฟล์ หรือประเภทเอกสาร'),
      {
        target: { value: 'ใบลา' },
      },
    );
    expect(screen.getByText('ใบลา')).toBeTruthy();
    expect(screen.queryByText('ข้อบังคับบริษัท')).toBeNull();

    fireEvent.change(
      screen.getByPlaceholderText('ค้นหาชื่อเอกสาร ชื่อไฟล์ หรือประเภทเอกสาร'),
      {
        target: { value: '' },
      },
    );
    fireEvent.click(screen.getByRole('button', { name: 'กฎและระเบียบบริษัท' }));
    expect(screen.getByText('ข้อบังคับบริษัท')).toBeTruthy();
    expect(screen.queryByText('ใบลา')).toBeNull();
    expect(screen.getByRole('button', { name: 'เพิ่มเอกสาร' })).toBeTruthy();
  });

  it('uses the matching shared asset for Word and Excel files', async () => {
    vi.mocked(listCompanyDocuments).mockResolvedValueOnce([
      {
        id: 1,
        title: 'แบบฟอร์ม Word',
        category: 'other',
        fileName: 'template.docx',
        contentType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        sizeBytes: 1024,
        createdAt: '2026-09-16T00:00:00Z',
      },
      {
        id: 2,
        title: 'รายงาน Excel',
        category: 'other',
        fileName: 'report.xlsx',
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        sizeBytes: 1024,
        createdAt: '2026-09-16T00:00:00Z',
      },
    ]);

    render(<CompanyDocumentsPage readOnly />);

    expect(await screen.findByRole('img', { name: 'DOCX file' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'XLSX file' })).toBeTruthy();
  });

  it('uses the shared inline confirmation before deleting a document', async () => {
    vi.mocked(listCompanyDocuments).mockResolvedValueOnce([
      {
        id: 7,
        title: 'ใบลา',
        category: 'leave_form',
        fileName: 'leave-form.docx',
        contentType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        sizeBytes: 1024,
        createdAt: '2026-09-16T00:00:00Z',
      },
    ]);
    vi.mocked(deleteCompanyDocument).mockResolvedValueOnce();

    render(<CompanyDocumentsPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'ลบ ใบลา' }));
    expect(screen.getByText('ยืนยันการลบเอกสาร?')).toBeTruthy();
    expect(screen.getByText(/จะถูกลบออกจากเอกสารส่วนกลาง/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'ยกเลิก' }));
    expect(screen.queryByText('ยืนยันการลบเอกสาร?')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'ลบ ใบลา' }));
    fireEvent.click(screen.getByRole('button', { name: 'ยืนยันลบ' }));
    await waitFor(() => expect(deleteCompanyDocument).toHaveBeenCalledWith(7));
  });
});
