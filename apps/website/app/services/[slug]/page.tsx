import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ServiceDetailContent } from '../../../src/components/ServiceDetailContent';
import { WebsiteFooter } from '../../../src/components/WebsiteFooterRedesign';
import { WebsiteNav } from '../../../src/components/WebsiteNavRedesign';
import {
  getServiceDetail,
  serviceDetails,
} from '../../../src/components/serviceDetailData';
import { pageMetadata } from '../../pageMetadata';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return serviceDetails.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = getServiceDetail(slug);

  if (!service) return {};

  return pageMetadata({
    title: service.navigationTitle,
    description: service.summary,
    pathname: `/services/${service.slug}`,
    image: service.image,
  });
}

export default async function ServiceDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const service = getServiceDetail(slug);

  if (!service) notFound();

  return (
    <main>
      <WebsiteNav />
      <ServiceDetailContent service={service} />
      <WebsiteFooter />
    </main>
  );
}
