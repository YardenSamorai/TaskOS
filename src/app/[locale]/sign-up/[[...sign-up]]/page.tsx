import { SignUp } from "@clerk/nextjs";
import { Zap, Sparkles, Users, Kanban, Calendar } from "lucide-react";
import Link from "next/link";

interface SignUpPageProps {
  params: Promise<{ locale: string }>;
}

const SignUpPage = async ({ params }: SignUpPageProps) => {
  const { locale } = await params;
  
  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-20 right-20 w-72 h-72 bg-white/10 rounded-full blur-[80px]" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-indigo-400/20 rounded-full blur-[100px]" />
        
        {/* Floating cards */}
        <div className="absolute top-32 right-16 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 shadow-2xl transform rotate-3 animate-float">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Kanban className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-medium text-sm">Kanban Board</p>
              <p className="text-white/60 text-xs">12 tasks in progress</p>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-48 right-24 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 shadow-2xl transform -rotate-2 animate-float-delayed">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-medium text-sm">Team Sync</p>
              <p className="text-white/60 text-xs">5 members online</p>
            </div>
          </div>
        </div>
        
        <div className="absolute top-1/2 right-8 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 shadow-2xl transform rotate-1 animate-float">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-medium text-sm">Calendar</p>
              <p className="text-white/60 text-xs">3 events today</p>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <Link href={`/${locale}`} className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">
              TaskOS
            </span>
          </Link>
          
          {/* Main content */}
          <div className="max-w-md">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm mb-6">
              <Sparkles className="w-4 h-4" />
              <span>Start your free trial today</span>
            </div>
            
            <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
              Build something amazing with your team
            </h1>
            <p className="text-white/80 text-lg leading-relaxed">
              Create your free account and experience a new way to manage projects. No credit card required.
            </p>
          </div>
          
          {/* Stats */}
          <div className="flex items-center gap-8">
            <div>
              <p className="text-3xl font-bold text-white">10K+</p>
              <p className="text-white/60 text-sm">Active teams</p>
            </div>
            <div className="w-px h-12 bg-white/20" />
            <div>
              <p className="text-3xl font-bold text-white">50M+</p>
              <p className="text-white/60 text-sm">Tasks completed</p>
            </div>
            <div className="w-px h-12 bg-white/20" />
            <div>
              <p className="text-3xl font-bold text-white">99.9%</p>
              <p className="text-white/60 text-sm">Uptime</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right Side - Sign Up Form */}
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
            <p className="text-zinc-500 text-center text-sm mt-1">Start your free account</p>
          </div>
          
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-zinc-900 mb-2">Create your account</h2>
            <p className="text-zinc-500">Get started with a free account</p>
          </div>
          
          <SignUp 
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
                formButtonPrimary: "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl h-12 text-sm font-medium shadow-lg shadow-indigo-500/25 transition-all",
                footerAction: "pt-6",
                footerActionText: "text-zinc-500 text-sm",
                footerActionLink: "text-indigo-600 hover:text-indigo-700 font-medium",
                identityPreview: "bg-zinc-50 border border-zinc-200 rounded-xl",
                identityPreviewText: "text-zinc-700",
                identityPreviewEditButton: "text-indigo-600 hover:text-indigo-700",
                formFieldAction: "text-indigo-600 hover:text-indigo-700 text-sm font-medium",
                alert: "bg-red-50 border border-red-200 text-red-700 rounded-xl",
                alertText: "text-red-700 text-sm",
                formFieldHintText: "text-zinc-500 text-xs",
              },
              layout: {
                socialButtonsPlacement: "top",
                showOptionalFields: false,
              }
            }}
            path={`/${locale}/sign-up`}
            routing="path"
            signInUrl={`/${locale}/sign-in`}
            afterSignUpUrl={`/${locale}/app/workspaces`}
          />
          
          {/* Footer */}
          <p className="text-center text-zinc-400 text-xs mt-8">
            By creating an account, you agree to our{" "}
            <a href="#" className="text-zinc-600 hover:text-zinc-900">Terms of Service</a>
            {" "}and{" "}
            <a href="#" className="text-zinc-600 hover:text-zinc-900">Privacy Policy</a>
          </p>
        </div>
      </div>
      
      {/* Custom animations */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(3deg); }
          50% { transform: translateY(-10px) rotate(3deg); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px) rotate(-2deg); }
          50% { transform: translateY(-15px) rotate(-2deg); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 7s ease-in-out infinite;
          animation-delay: 1s;
        }
      `}</style>
    </div>
  );
};

export default SignUpPage;
