import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";

interface AppLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

const AppLayout = async ({ children, params }: AppLayoutProps) => {
  const { locale } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/sign-in`);
  }

  return <AppShell locale={locale}>{children}</AppShell>;
};

export default AppLayout;
