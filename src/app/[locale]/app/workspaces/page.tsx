"use client";

import { useParams } from "next/navigation";
import { WorkspacesList } from "@/components/workspaces/workspaces-list";
import { WorkspacesHeader } from "@/components/workspaces/workspaces-header";

const WorkspacesPage = () => {
  const params = useParams();
  const locale = params.locale as string;

  return (
    <div className="max-w-6xl mx-auto">
      <WorkspacesHeader locale={locale} />
      <WorkspacesList locale={locale} />
    </div>
  );
};

export default WorkspacesPage;
