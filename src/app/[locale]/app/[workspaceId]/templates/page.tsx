import { Suspense } from "react";
import { TemplatesView } from "@/components/templates/templates-view";

interface TemplatesPageProps {
  params: Promise<{ 
    locale: string; 
    workspaceId: string;
  }>;
}

const TemplatesPage = async ({ params }: TemplatesPageProps) => {
  const { locale, workspaceId } = await params;
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TemplatesView workspaceId={workspaceId} locale={locale} />
    </Suspense>
  );
};

export default TemplatesPage;
