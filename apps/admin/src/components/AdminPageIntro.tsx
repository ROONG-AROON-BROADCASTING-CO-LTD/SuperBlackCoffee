import { PageIntro } from '@stackbuild/ui';

type AdminPageIntroProps = {
  title: string;
  description: string;
};

export function AdminPageIntro({ title, description }: AdminPageIntroProps) {
  return <PageIntro title={title} description={description} />;
}
