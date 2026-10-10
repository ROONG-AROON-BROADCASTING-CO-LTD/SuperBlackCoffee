import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Box from '@mui/material/Box';
import { MenuContent } from '../../../../src/components/BrandPagesRedesign';
import { WebsiteFooter } from '../../../../src/components/WebsiteFooterRedesign';
import { WebsiteNav } from '../../../../src/components/WebsiteNavRedesign';

const branchNames: Record<string, string> = {
  ayutthaya: 'อยุธยา',
  phitsanulok: 'พิษณุโลก',
  'pracha-uthit': 'ประชาอุทิศ',
};

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(branchNames).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const name = branchNames[slug];
  return {
    title: name ? `เมนูสาขา${name}` : 'เมนูสาขา',
    description: name
      ? `เมนูเครื่องดื่มของ Super Black Coffee สาขา${name}`
      : 'เมนูเครื่องดื่ม Super Black Coffee',
  };
}

export default async function BranchMenuPage({ params }: PageProps) {
  const { slug } = await params;
  if (!branchNames[slug]) notFound();

  return (
    <Box component="main" sx={{ m: 0, p: 0 }}>
      <WebsiteNav />
      <MenuContent branchSlug={slug} />
      <WebsiteFooter />
    </Box>
  );
}
