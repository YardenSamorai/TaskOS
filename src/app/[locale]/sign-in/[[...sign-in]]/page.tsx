"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Zap, CheckCircle2, Loader2, Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showGooglePrompt, setShowGooglePrompt] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setShowGooglePrompt(false);

    try {
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        // Handle specific errors
        if (result.error.includes("GOOGLE_ACCOUNT")) {
          setShowGooglePrompt(true);
        } else if (result.error.includes("No account")) {
          toast.error("No account found with this email");
        } else if (result.error.includes("Invalid password")) {
          toast.error("Invalid password");
        } else {
          toast.error(result.error || "Invalid email or password");
        }
        setIsLoading(false);
        return;
      }
      
      // Success - show toast and redirect
      toast.success("Welcome back!");
      const url = callbackUrl || "/en/app/workspaces";
      setRedirectUrl(url);
      setLoginSuccess(true);
      
      // Use direct location assignment for reliable redirect
      window.location.href = url;
      
    } catch (error) {
      console.error("Sign in error:", error);
      toast.error("Failed to sign in");
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    // Use client-side signIn for Google
    await signIn("google", { 
      callbackUrl: callbackUrl || "/en/app/workspaces" 
    });
  };

  // Show success screen if login worked but redirect didn't
  if (loginSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="text-center p-8">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 mb-2">Login Successful!</h2>
          <p className="text-zinc-500 mb-6">Redirecting you to the app...</p>
          <div className="space-y-3">
            <Button
              onClick={() => window.location.href = redirectUrl}
              className="w-full"
            >
              Click here if not redirected
            </Button>
            <Link
              href={redirectUrl || "/en/app/workspaces"}
              className="block text-sm text-indigo-600 hover:underline"
            >
              Or click this link: {redirectUrl || "/en/app/workspaces"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
          <Link href="/en" className="flex items-center gap-3">
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

          {/* Google Sign In */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 rounded-xl border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 font-medium mb-6"
            onClick={handleGoogleSignIn}
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

          {/* Sign In Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-zinc-700 font-medium">
                  Password
                </Label>
                <Link
                  href="/en/forgot-password"
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Forgot password?
                </Link>
              </div>
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
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-medium shadow-lg shadow-zinc-900/10"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          {/* Google Account Prompt */}
          {showGooglePrompt && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-blue-800 font-medium mb-2">
                    This account uses Google Sign-In
                  </p>
                  <p className="text-sm text-blue-700 mb-3">
                    You signed up with Google. Please use the Google button to sign in, or you can set a password in your account settings after signing in.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-10 rounded-lg border-blue-300 bg-white hover:bg-blue-50 text-blue-700 font-medium"
                    onClick={handleGoogleSignIn}
                    disabled={isGoogleLoading}
                  >
                    {isGoogleLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                    )}
                    Sign in with Google
                  </Button>
                </div>
              </div>
            </div>
          )}

          <p className="text-center text-zinc-500 text-sm mt-6">
            Don&apos;t have an account?{" "}
            <Link 
              href={callbackUrl ? `/en/sign-up?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/en/sign-up"} 
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Sign up
            </Link>
          </p>

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
}
