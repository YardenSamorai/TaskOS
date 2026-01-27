import { SignIn } from "@clerk/nextjs";
import { Zap, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface SignInPageProps {
  params: Promise<{ locale: string }>;
}

const SignInPage = async ({ params }: SignInPageProps) => {
  const { locale } = await params;
  
  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-zinc-950 relative overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-600/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-violet-600/20 rounded-full blur-[100px]" />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}
        />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <Link href={`/${locale}`} className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">
              Task<span className="text-indigo-400">OS</span>
            </span>
          </Link>
          
          {/* Main content */}
          <div className="max-w-md">
            <h1 className="text-4xl font-bold text-white mb-6 leading-tight">
              Manage your projects with clarity and focus
            </h1>
            <p className="text-zinc-400 text-lg mb-10 leading-relaxed">
              Join thousands of teams who use TaskOS to ship faster, stay organized, and achieve their goals.
            </p>
            
            {/* Features */}
            <div className="space-y-4">
              {[
                "Unlimited workspaces & tasks",
                "Kanban boards & calendar views", 
                "Process tracking & team collaboration",
                "Real-time updates & notifications"
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <span className="text-zinc-300 text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Testimonial */}
          <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6">
            <p className="text-zinc-300 italic mb-4">
              &ldquo;TaskOS transformed how our team works. We&apos;ve increased productivity by 40% since switching.&rdquo;
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-pink-500" />
              <div>
                <p className="text-white font-medium text-sm">Sarah Chen</p>
                <p className="text-zinc-500 text-xs">Product Lead at Vercel</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right Side - Sign In Form */}
      <div className="w-full lg:w-1/2 bg-zinc-50 flex items-center justify-center p-6 sm:p-12 min-h-screen">
        <div className="w-full max-w-md">
          {/* Mobile header */}
          <div className="lg:hidden mb-10">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Zap className="w-6 h-6 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 text-center">
              Task<span className="text-indigo-600">OS</span>
            </h1>
            <p className="text-zinc-500 text-center text-sm mt-1">Project Management Made Simple</p>
          </div>
          
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-zinc-900 mb-2">Welcome back</h2>
            <p className="text-zinc-500">Sign in to your account to continue</p>
          </div>
          
          <SignIn 
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "bg-transparent shadow-none p-0 w-full",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                socialButtonsBlockButton: "bg-zinc-50 border border-zinc-200 text-zinc-700 hover:bg-zinc-100 hover:border-zinc-300 transition-all rounded-xl h-12",
                socialButtonsBlockButtonText: "text-zinc-700 font-medium",
                socialButtonsBlockButtonArrow: "text-zinc-400",
                dividerLine: "bg-zinc-200",
                dividerText: "text-zinc-400 text-sm",
                formFieldLabel: "text-zinc-700 font-medium text-sm",
                formFieldInput: "bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl h-12 transition-all",
                formFieldInputShowPasswordButton: "text-zinc-400 hover:text-zinc-600",
                formButtonPrimary: "bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl h-12 text-sm font-medium shadow-lg shadow-zinc-900/10 transition-all",
                footerAction: "pt-6",
                footerActionText: "text-zinc-500 text-sm",
                footerActionLink: "text-indigo-600 hover:text-indigo-700 font-medium",
                identityPreview: "bg-zinc-50 border border-zinc-200 rounded-xl",
                identityPreviewText: "text-zinc-700",
                identityPreviewEditButton: "text-indigo-600 hover:text-indigo-700",
                formFieldAction: "text-indigo-600 hover:text-indigo-700 text-sm font-medium",
                alert: "bg-red-50 border border-red-200 text-red-700 rounded-xl",
                alertText: "text-red-700 text-sm",
              },
              layout: {
                socialButtonsPlacement: "top",
                showOptionalFields: false,
              }
            }}
            path={`/${locale}/sign-in`}
            routing="path"
            signUpUrl={`/${locale}/sign-up`}
            afterSignInUrl={`/${locale}/app/workspaces`}
          />
          
          {/* Footer */}
          <p className="text-center text-zinc-400 text-xs mt-8">
            By signing in, you agree to our{" "}
            <a href="#" className="text-zinc-600 hover:text-zinc-900">Terms of Service</a>
            {" "}and{" "}
            <a href="#" className="text-zinc-600 hover:text-zinc-900">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;
