"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function MembersRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;
  const workspaceId = params.workspaceId as string;

  useEffect(() => {
    router.replace(`/${locale}/app/${workspaceId}/settings?tab=members`);
  }, [router, locale, workspaceId]);

  return null;
}
