import type { Metadata } from 'next';

type PageMetadataInput = {
  title: string;
  description: string;
  pathname: string;
  image?: string;
};

export function pageMetadata({
  title,
  description,
  pathname,
  image,
}: PageMetadataInput): Metadata {
  const socialTitle = `${title} - Super Black Coffee`;

  return {
    title,
    description,
    alternates: { canonical: pathname },
    openGraph: {
      type: 'website',
      locale: 'th_TH',
      siteName: 'Super Black Coffee',
      title: socialTitle,
      description,
      url: pathname,
      ...(image ? { images: [{ url: image, alt: socialTitle }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: socialTitle,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}
