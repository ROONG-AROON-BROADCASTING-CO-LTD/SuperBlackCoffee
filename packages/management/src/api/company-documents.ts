import { secured, securedBlob } from './client';

export type CompanyDocument = {
  id: number;
  title: string;
  category: 'job_application' | 'company_policy' | 'leave_form' | 'other';
  fileName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
};

export const listCompanyDocuments = () =>
  secured<CompanyDocument[]>('/company-documents');

export const createCompanyDocument = (
  input: Pick<CompanyDocument, 'title' | 'category'> & { file: File },
) => {
  const data = new FormData();
  data.set('title', input.title);
  data.set('category', input.category);
  data.set('file', input.file);
  return secured<{ id: number }>('/company-documents', {
    method: 'POST',
    data,
    headers: { 'Content-Type': undefined },
  });
};

export const deleteCompanyDocument = (id: number) =>
  secured<void>(`/company-documents/${id}`, { method: 'DELETE' });

export async function downloadCompanyDocument(document: CompanyDocument) {
  const blob = await securedBlob(`/company-documents/${document.id}/download`);
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.download = document.fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
