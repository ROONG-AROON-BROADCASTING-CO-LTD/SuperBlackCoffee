import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ImgHTMLAttributes } from 'react';

vi.mock('next/image', () => ({
  default: ({
    fill: _fill,
    priority: _priority,
    unoptimized: _unoptimized,
    ...props
  }: ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    priority?: boolean;
    unoptimized?: boolean;
  }) => <img {...props} />,
}));
vi.mock('./WebsiteLanguageProvider', () => ({
  useWebsiteLanguage: () => ({
    text: (thai: string) => thai,
    isEnglish: false,
  }),
}));
vi.mock('./GoogleAnalytics', () => ({ trackEvent: vi.fn() }));
import { ContactContent, FranchiseContent } from './BrandPagesRedesign';
import { trackEvent } from './GoogleAnalytics';

function fillContact() {
  fireEvent.change(screen.getByLabelText(/^ชื่อ/), {
    target: { value: 'ผู้สนใจ' },
  });
  fireEvent.change(screen.getByLabelText(/^เบอร์โทรศัพท์/), {
    target: { value: '0812345678' },
  });
  fireEvent.change(screen.getByLabelText(/^อีเมล/), {
    target: { value: 'customer@example.test' },
  });
  fireEvent.change(screen.getByLabelText(/^สนใจเรื่อง/), {
    target: { value: 'general' },
  });
  fireEvent.change(screen.getByLabelText(/^ข้อความ/), {
    target: { value: 'สอบถามบริการ' },
  });
}

describe('website contact submissions', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('submits the general enquiry using the API topic contract and clears only after success', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response('{}', { status: 201 }));
    vi.stubGlobal('fetch', fetch);
    render(<ContactContent />);
    expect(screen.getByRole('option', { name: 'เรื่องอื่น ๆ' })).toHaveValue(
      'general',
    );
    fillContact();
    fireEvent.click(screen.getByRole('button', { name: 'ส่งข้อความ' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'ส่งข้อความแล้ว',
    );
    const [url, init] = fetch.mock.calls[0];
    expect(url).toMatch(/\/website\/leads$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({
      name: 'ผู้สนใจ',
      phone: '0812345678',
      email: 'customer@example.test',
      topic: 'general',
      message: 'สอบถามบริการ',
    });
    expect(screen.getByLabelText(/^ชื่อ/)).toHaveValue('');
    expect(trackEvent).toHaveBeenCalledExactlyOnceWith('generate_lead', {
      form_name: 'contact',
    });
  });

  it.each([400, 429, 500])(
    'preserves the enquiry and permits retry when API returns %i',
    async (status) => {
      const fetch = vi.fn().mockResolvedValue(new Response('{}', { status }));
      vi.stubGlobal('fetch', fetch);
      render(<ContactContent />);
      fillContact();
      fireEvent.click(screen.getByRole('button', { name: 'ส่งข้อความ' }));
      await screen.findByRole('alert');
      expect(screen.getByLabelText(/^ชื่อ/)).toHaveValue('ผู้สนใจ');
      expect(screen.getByLabelText(/^ข้อความ/)).toHaveValue('สอบถามบริการ');
      expect(screen.getByRole('button', { name: 'ส่งข้อความ' })).toBeEnabled();
      expect(trackEvent).not.toHaveBeenCalled();
    },
  );

  it('disables duplicate submission while the request is pending', async () => {
    let resolve!: (response: Response) => void;
    const fetch = vi.fn(
      () =>
        new Promise<Response>((done) => {
          resolve = done;
        }),
    );
    vi.stubGlobal('fetch', fetch);
    render(<ContactContent />);
    fillContact();
    fireEvent.click(screen.getByRole('button', { name: 'ส่งข้อความ' }));
    const sending = screen.getByRole('button', { name: 'กำลังส่ง...' });
    expect(sending).toBeDisabled();
    fireEvent.click(sending);
    expect(fetch).toHaveBeenCalledTimes(1);
    resolve(new Response('{}', { status: 201 }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('ส่งข้อความแล้ว'),
    );
  });
});

describe('website franchise enquiries', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('submits the selected plan and location with the franchise topic', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response('{}', { status: 201 }));
    vi.stubGlobal('fetch', fetch);
    render(<FranchiseContent />);
    fireEvent.change(screen.getByLabelText(/^ชื่อ/), {
      target: { value: 'ผู้สนใจแฟรนไชส์' },
    });
    fireEvent.change(screen.getByLabelText(/^เบอร์โทรศัพท์/), {
      target: { value: '0812345678' },
    });
    fireEvent.change(screen.getByLabelText('จังหวัด / ทำเลที่สนใจ'), {
      target: { value: 'เชียงใหม่' },
    });
    fireEvent.change(screen.getByLabelText('รูปแบบที่สนใจ'), {
      target: { value: 'M' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'ส่งข้อมูลให้ทีมแฟรนไชส์' }),
    );
    await screen.findByRole('status');
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({
      name: 'ผู้สนใจแฟรนไชส์',
      phone: '0812345678',
      province: 'เชียงใหม่',
      plan: 'M',
      topic: 'franchise',
    });
    expect(screen.getByLabelText(/^ชื่อ/)).toHaveValue('');
    expect(trackEvent).toHaveBeenCalledExactlyOnceWith('generate_lead', {
      form_name: 'franchise',
    });
  });

  it('keeps selected plan and contact details when the network fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    render(<FranchiseContent />);
    fireEvent.change(screen.getByLabelText(/^ชื่อ/), {
      target: { value: 'ผู้สนใจแฟรนไชส์' },
    });
    fireEvent.change(screen.getByLabelText(/^เบอร์โทรศัพท์/), {
      target: { value: '0812345678' },
    });
    fireEvent.change(screen.getByLabelText('รูปแบบที่สนใจ'), {
      target: { value: 'L' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'ส่งข้อมูลให้ทีมแฟรนไชส์' }),
    );
    await screen.findByRole('alert');
    expect(screen.getByLabelText(/^ชื่อ/)).toHaveValue('ผู้สนใจแฟรนไชส์');
    expect(screen.getByLabelText('รูปแบบที่สนใจ')).toHaveValue('L');
    expect(
      screen.getByRole('button', { name: 'ส่งข้อมูลให้ทีมแฟรนไชส์' }),
    ).toBeEnabled();
    expect(trackEvent).not.toHaveBeenCalled();
  });
});
