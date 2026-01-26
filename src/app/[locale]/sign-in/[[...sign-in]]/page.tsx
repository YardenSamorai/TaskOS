import { SignIn } from "@clerk/nextjs";

interface SignInPageProps {
  params: Promise<{ locale: string }>;
}

const SignInPage = async ({ params }: SignInPageProps) => {
  const { locale } = await params;
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 -left-40 w-96 h-96 bg-violet-500/15 rounded-full blur-[120px]" />
      </div>
      
      <div className="relative z-10">
        <SignIn 
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-2xl",
              headerTitle: "text-white",
              headerSubtitle: "text-slate-400",
              socialButtonsBlockButton: "bg-white/5 border-white/10 text-white hover:bg-white/10",
              socialButtonsBlockButtonText: "text-white font-medium",
              dividerLine: "bg-white/10",
              dividerText: "text-slate-500",
              formFieldLabel: "text-slate-300",
              formFieldInput: "bg-white/5 border-white/10 text-white placeholder:text-slate-500",
              formButtonPrimary: "bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500",
              footerActionLink: "text-blue-400 hover:text-blue-300",
              identityPreviewText: "text-white",
              identityPreviewEditButton: "text-blue-400",
            },
          }}
          path={`/${locale}/sign-in`}
          routing="path"
          signUpUrl={`/${locale}/sign-up`}
          afterSignInUrl={`/${locale}/app/workspaces`}
        />
      </div>
    </div>
  );
};

export default SignInPage;
