"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Zap, Sparkles, Users, Kanban, Calendar, Loader2, Mail, Lock, Eye, EyeOff, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerUser, loginWithGoogle } from "@/lib/actions/auth";
import { toast } from "sonner";

export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const form = new FormData();
    form.append("name", formData.name);
    form.append("email", formData.email);
    form.append("password", formData.password);

    const result = await registerUser(form);

    if (result.success) {
      toast.success("Account created! Please sign in.");
      // Redirect to sign-in with callbackUrl preserved
      const signInUrl = callbackUrl 
        ? `/en/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`
        : "/en/sign-in";
      router.push(signInUrl);
    } else {
      toast.error(result.error || "Failed to create account");
    }

    setIsLoading(false);
  };

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true);
    // Pass callbackUrl to Google sign-in
    await loginWithGoogle(callbackUrl || undefined);
  };

  const passwordRequirements = [
    { label: "At least 8 characters", met: formData.password.length >= 8 },
    { label: "One uppercase letter", met: /[A-Z]/.test(formData.password) },
    { label: "One lowercase letter", met: /[a-z]/.test(formData.password) },
    { label: "One number", met: /[0-9]/.test(formData.password) },
  ];

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
          <Link href="/en" className="flex items-center gap-3">
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

          {/* Google Sign Up */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 rounded-xl border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 font-medium mb-6"
            onClick={handleGoogleSignUp}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            Continue with Google
          </Button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-zinc-50 px-4 text-zinc-400">or continue with email</span>
            </div>
          </div>

          {/* Sign Up Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-zinc-700 font-medium">
                Full name
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-12 pl-10 rounded-xl border-zinc-200 bg-white text-zinc-900 focus:border-indigo-500 focus:ring-indigo-500/20 [&:-webkit-autofill]:bg-white [&:-webkit-autofill]:text-zinc-900 [&:-webkit-autofill]:[-webkit-text-fill-color:theme(colors.zinc.900)] [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_white]"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-700 font-medium">
                Email address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="h-12 pl-10 rounded-xl border-zinc-200 bg-white text-zinc-900 focus:border-indigo-500 focus:ring-indigo-500/20 [&:-webkit-autofill]:bg-white [&:-webkit-autofill]:text-zinc-900 [&:-webkit-autofill]:[-webkit-text-fill-color:theme(colors.zinc.900)] [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_white]"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-700 font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="h-12 pl-10 pr-10 rounded-xl border-zinc-200 bg-white text-zinc-900 focus:border-indigo-500 focus:ring-indigo-500/20 [&:-webkit-autofill]:bg-white [&:-webkit-autofill]:text-zinc-900 [&:-webkit-autofill]:[-webkit-text-fill-color:theme(colors.zinc.900)] [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_white]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              
              {/* Password requirements */}
              {formData.password && (
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {passwordRequirements.map((req, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className={`w-1.5 h-1.5 rounded-full ${req.met ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                      <span className={req.met ? 'text-emerald-600' : 'text-zinc-400'}>{req.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium shadow-lg shadow-indigo-500/25"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create account"
              )}
            </Button>
          </form>

          <p className="text-center text-zinc-500 text-sm mt-6">
            Already have an account?{" "}
            <Link 
              href={callbackUrl ? `/en/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/en/sign-in"} 
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Sign in
            </Link>
          </p>

          <p className="text-center text-zinc-400 text-xs mt-8">
            By creating an account, you agree to our{" "}
            <a href="/en/terms" className="text-zinc-600 hover:text-zinc-900">Terms of Service</a>
            {" "}and{" "}
            <a href="/en/privacy" className="text-zinc-600 hover:text-zinc-900">Privacy Policy</a>
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
}
