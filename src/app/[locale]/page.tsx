"use client";

import { useTranslations } from "next-intl";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Kanban,
  Calendar,
  Users,
  FileText,
  Activity,
  Sparkles,
  Zap,
  Shield,
  Globe,
  ChevronRight,
  Play,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const LandingPage = () => {
  const t = useTranslations("landing");
  const { locale } = useParams();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute top-1/3 -left-40 w-96 h-96 bg-violet-500/15 rounded-full blur-[120px] animate-pulse delay-1000" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-cyan-500/10 rounded-full blur-[100px] animate-pulse delay-500" />
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 border-b border-white/5 backdrop-blur-xl bg-slate-950/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <Link href={`/${locale}`} className="flex items-center gap-3 group">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-shadow">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 opacity-0 group-hover:opacity-20 blur transition-opacity" />
              </div>
              <span className="text-xl font-bold tracking-tight">
                Task<span className="text-blue-400">OS</span>
              </span>
            </Link>

            {/* Nav items */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-slate-400 hover:text-white transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-sm text-slate-400 hover:text-white transition-colors">
                Pricing
              </a>
              <a href="#about" className="text-sm text-slate-400 hover:text-white transition-colors">
                About
              </a>
            </div>

            {/* Auth buttons */}
            <div className="flex items-center gap-3">
              <SignedOut>
                <Link href={`/${locale}/sign-in`}>
                  <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5">
                    {t("signIn")}
                  </Button>
                </Link>
                <Link href={`/${locale}/sign-up`}>
                  <Button className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white border-0 shadow-lg shadow-blue-500/25">
                    {t("getStarted")}
                    <ArrowRight className="w-4 h-4 ms-2" />
                  </Button>
                </Link>
              </SignedOut>
              <SignedIn>
                <Link href={`/${locale}/app/workspaces`}>
                  <Button className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white border-0 shadow-lg shadow-blue-500/25">
                    Go to App
                    <ArrowRight className="w-4 h-4 ms-2" />
                  </Button>
                </Link>
              </SignedIn>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-32 md:pt-32 md:pb-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-slate-300 mb-8 backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span>Now with Process Mode & Smart Summary</span>
              <ChevronRight className="w-4 h-4" />
            </div>

            {/* Heading */}
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
              <span className="bg-gradient-to-r from-white via-white to-slate-400 bg-clip-text text-transparent">
                {t("title")}
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                {t("subtitle")}
              </span>
            </h1>

            {/* Description */}
            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              {t("description")}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <SignedOut>
                <Link href={`/${locale}/sign-up`}>
                  <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-lg px-8 py-6 border-0 shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 transition-all">
                    {t("getStarted")} — It&apos;s Free
                    <ArrowRight className="w-5 h-5 ms-2" />
                  </Button>
                </Link>
              </SignedOut>
              <SignedIn>
                <Link href={`/${locale}/app/workspaces`}>
                  <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-lg px-8 py-6 border-0 shadow-xl shadow-blue-500/25">
                    Open Dashboard
                    <ArrowRight className="w-5 h-5 ms-2" />
                  </Button>
                </Link>
              </SignedIn>
              <Button size="lg" className="w-full sm:w-auto bg-transparent border border-white/20 text-white hover:bg-white/10 text-lg px-8 py-6 backdrop-blur-sm">
                <Play className="w-5 h-5 me-2" />
                Watch Demo
              </Button>
            </div>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-6 mt-12 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>SOC2 Ready</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-slate-600" />
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span>99.9% Uptime</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-slate-600" />
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
            </div>
          </div>

          {/* Hero Image/Preview */}
          <div className="mt-20 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent z-10" />
            <div className="relative rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-sm overflow-hidden shadow-2xl shadow-black/50">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-violet-500/5" />
              {/* Mock Dashboard Preview */}
              <div className="p-4 md:p-8">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="grid grid-cols-4 gap-4">
                  {/* Sidebar mock */}
                  <div className="hidden md:block col-span-1 space-y-3">
                    {[85, 72, 90, 78, 95, 82].map((width, i) => (
                      <div key={i} className="h-8 rounded-lg bg-white/5" style={{ width: `${width}%` }} />
                    ))}
                  </div>
                  {/* Main content mock */}
                  <div className="col-span-4 md:col-span-3 space-y-4">
                    <div className="flex gap-4">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="flex-1 h-24 rounded-xl bg-gradient-to-br from-white/10 to-white/5 p-4">
                          <div className="h-3 w-16 rounded bg-white/20 mb-2" />
                          <div className="h-6 w-12 rounded bg-white/30" />
                        </div>
                      ))}
                    </div>
                    {/* Kanban columns mock */}
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mt-4">
                      {['Backlog', 'To Do', 'In Progress', 'Review', 'Done'].map((col, i) => (
                        <div key={col} className="rounded-xl bg-white/5 p-3">
                          <div className="text-xs text-slate-400 mb-3">{col}</div>
                          {[...Array(3 - Math.floor(i / 2))].map((_, j) => (
                            <div key={j} className="h-16 rounded-lg bg-white/10 mb-2 p-2">
                              <div className="h-2 w-full rounded bg-white/20 mb-2" />
                              <div className="h-2 w-2/3 rounded bg-white/10" />
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-32 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              {t("features.title")}
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Built for teams who want more than just a task list. TaskOS brings enterprise-grade features to everyone.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Users, title: t("features.workspaces.title"), desc: t("features.workspaces.description"), color: "blue" },
              { icon: Kanban, title: t("features.kanban.title"), desc: t("features.kanban.description"), color: "violet" },
              { icon: CheckCircle2, title: t("features.process.title"), desc: t("features.process.description"), color: "emerald" },
              { icon: Calendar, title: t("features.calendar.title"), desc: t("features.calendar.description"), color: "orange" },
              { icon: FileText, title: t("features.files.title"), desc: t("features.files.description"), color: "pink" },
              { icon: Activity, title: t("features.activity.title"), desc: t("features.activity.description"), color: "cyan" },
            ].map((feature, i) => (
              <div 
                key={i}
                className="group relative rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:bg-white/[0.04] transition-all hover:border-white/10"
              >
                <div className={`w-12 h-12 rounded-xl bg-${feature.color}-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className={`w-6 h-6 text-${feature.color}-400`} />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Mode Highlight */}
      <section className="relative z-10 py-32 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-sm mb-6">
                <Sparkles className="w-4 h-4" />
                Unique Feature
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Process Mode
              </h2>
              <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                Break down complex tasks into stages, steps, and checklists. Track decisions, attach files, and see the complete picture of any workflow.
              </p>
              <ul className="space-y-4">
                {[
                  "Visual workflow stages",
                  "Checklist items with progress tracking",
                  "File attachments per stage",
                  "Decision documentation",
                  "Complete audit trail"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur-sm">
                {/* Process mode mock */}
                <div className="space-y-4">
                  {['Research', 'Design', 'Development', 'Review'].map((stage, i) => (
                    <div key={stage} className={`rounded-xl p-4 ${i < 2 ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-white/5 border border-white/5'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-medium ${i < 2 ? 'text-emerald-400' : 'text-white'}`}>{stage}</span>
                        {i < 2 && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                      </div>
                      <div className="flex gap-2">
                        {[...Array(3)].map((_, j) => (
                          <div key={j} className={`h-2 flex-1 rounded ${j <= i ? 'bg-emerald-400' : 'bg-white/10'}`} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative z-10 py-32 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-sm mb-6">
              <Sparkles className="w-4 h-4" />
              Simple Pricing
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Choose Your Plan
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Start free and scale as you grow. No hidden fees, cancel anytime.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Free Plan */}
            <div className="relative rounded-2xl border border-white/10 bg-white/[0.02] p-8 hover:border-white/20 transition-all">
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-2">Free</h3>
                <p className="text-slate-400 text-sm">Perfect for personal use</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-slate-400">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  "Up to 3 workspaces",
                  "Unlimited tasks",
                  "Basic Kanban board",
                  "Calendar view",
                  "5 file uploads per task",
                  "7-day activity history",
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href={`/${locale}/sign-up`} className="block">
                <Button className="w-full bg-white/10 hover:bg-white/20 text-white border-0">
                  Get Started Free
                </Button>
              </Link>
            </div>

            {/* Pro Plan - Most Popular */}
            <div className="relative rounded-2xl border-2 border-blue-500/50 bg-gradient-to-b from-blue-500/10 to-transparent p-8 scale-105 shadow-xl shadow-blue-500/10">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="px-4 py-1 rounded-full bg-gradient-to-r from-blue-600 to-violet-600 text-sm font-medium">
                  Most Popular
                </span>
              </div>
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-2">Pro</h3>
                <p className="text-slate-400 text-sm">For growing teams</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold">$12</span>
                <span className="text-slate-400">/user/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  "Unlimited workspaces",
                  "Unlimited tasks",
                  "Process Mode",
                  "AI Task Enhancement",
                  "Unlimited file uploads",
                  "30-day activity history",
                  "Advanced filters & search",
                  "Priority support",
                  "Team collaboration",
                  "Custom tags & labels",
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href={`/${locale}/sign-up`} className="block">
                <Button className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white border-0 shadow-lg shadow-blue-500/25">
                  Start 14-Day Trial
                  <ArrowRight className="w-4 h-4 ms-2" />
                </Button>
              </Link>
            </div>

            {/* Enterprise Plan */}
            <div className="relative rounded-2xl border border-white/10 bg-white/[0.02] p-8 hover:border-white/20 transition-all">
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-2">Enterprise</h3>
                <p className="text-slate-400 text-sm">For large organizations</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold">Custom</span>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  "Everything in Pro",
                  "SSO / SAML authentication",
                  "Advanced security controls",
                  "Unlimited activity history",
                  "Custom integrations",
                  "Dedicated account manager",
                  "SLA guarantee",
                  "On-premise deployment",
                  "Custom training",
                  "API access",
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-violet-400 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button className="w-full bg-white/10 hover:bg-white/20 text-white border-0">
                Contact Sales
              </Button>
            </div>
          </div>

          {/* Money back guarantee */}
          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-2 text-slate-400 text-sm">
              <Shield className="w-4 h-4" />
              30-day money-back guarantee · No questions asked
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-32 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            {t("cta.title")}
          </h2>
          <p className="text-slate-400 text-lg mb-10 max-w-2xl mx-auto">
            {t("cta.description")}
          </p>
          <SignedOut>
            <Link href={`/${locale}/sign-up`}>
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-lg px-10 py-6 border-0 shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 transition-all">
                {t("cta.button")}
                <ArrowRight className="w-5 h-5 ms-2" />
              </Button>
            </Link>
          </SignedOut>
          <SignedIn>
            <Link href={`/${locale}/app/workspaces`}>
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-lg px-10 py-6 border-0 shadow-xl shadow-blue-500/25">
                Open Your Dashboard
                <ArrowRight className="w-5 h-5 ms-2" />
              </Button>
            </Link>
          </SignedIn>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold">TaskOS</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-500">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div>
            <p className="text-sm text-slate-500">
              © {new Date().getFullYear()} TaskOS. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
