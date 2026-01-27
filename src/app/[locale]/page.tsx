"use client";

import { useTranslations } from "next-intl";
import { SignedIn, SignedOut } from "@/components/auth/auth-status";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
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
  Clock,
  Target,
  Brain,
  MessageSquare,
  Bell,
  Layers,
  Timer,
  TrendingUp,
  Check,
  X,
  Menu,
  ChevronDown,
  Quote,
  BarChart3,
  Rocket,
  Lock,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Animated counter component
const AnimatedNumber = ({ value, duration = 2000 }: { value: number; duration?: number }) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let start = 0;
    const end = value;
    const incrementTime = duration / end;
    
    const timer = setInterval(() => {
      start += 1;
      setCount(start);
      if (start >= end) clearInterval(timer);
    }, incrementTime);
    
    return () => clearInterval(timer);
  }, [value, duration]);
  
  return <span>{count.toLocaleString()}</span>;
};

// Feature card with hover effect
const FeatureCard = ({ 
  icon: Icon, 
  title, 
  description, 
  gradient,
  delay = 0 
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string;
  gradient: string;
  delay?: number;
}) => (
  <div 
    className="group relative rounded-3xl border border-white/10 bg-white/[0.02] p-8 hover:bg-white/[0.05] transition-all duration-500 hover:scale-[1.02] hover:border-white/20"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="absolute inset-0 rounded-3xl bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-500" style={{ backgroundImage: gradient }} />
    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
      <Icon className="w-7 h-7 text-white" />
    </div>
    <h3 className="text-xl font-bold mb-3 group-hover:text-white transition-colors">{title}</h3>
    <p className="text-slate-400 leading-relaxed">{description}</p>
  </div>
);

// Testimonial card
const TestimonialCard = ({ 
  quote, 
  author, 
  role, 
  company,
  avatar,
  rating = 5 
}: { 
  quote: string; 
  author: string; 
  role: string;
  company: string;
  avatar: string;
  rating?: number;
}) => (
  <div className="relative rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent p-8 hover:border-white/20 transition-all duration-300">
    <Quote className="w-10 h-10 text-blue-500/30 mb-4" />
    <div className="flex gap-1 mb-4">
      {[...Array(rating)].map((_, i) => (
        <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
      ))}
    </div>
    <p className="text-lg text-slate-300 mb-6 leading-relaxed italic">&ldquo;{quote}&rdquo;</p>
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold text-lg">
        {avatar}
      </div>
      <div>
        <p className="font-semibold text-white">{author}</p>
        <p className="text-sm text-slate-400">{role} at {company}</p>
      </div>
    </div>
  </div>
);

// Pricing feature item
const PricingFeature = ({ included, children }: { included: boolean; children: React.ReactNode }) => (
  <li className="flex items-center gap-3 text-sm">
    {included ? (
      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
    ) : (
      <X className="w-5 h-5 text-slate-600 flex-shrink-0" />
    )}
    <span className={included ? "text-slate-300" : "text-slate-500"}>{children}</span>
  </li>
);

// FAQ Item
const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="border-b border-white/10 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-6 flex items-center justify-between text-left hover:text-blue-400 transition-colors"
      >
        <span className="font-semibold text-lg">{question}</span>
        <ChevronDown className={cn("w-5 h-5 transition-transform duration-300", isOpen && "rotate-180")} />
      </button>
      <div className={cn(
        "overflow-hidden transition-all duration-300",
        isOpen ? "max-h-96 pb-6" : "max-h-0"
      )}>
        <p className="text-slate-400 leading-relaxed">{answer}</p>
      </div>
    </div>
  );
};

const LandingPage = () => {
  const t = useTranslations("landing");
  const { locale } = useParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Gradient orbs */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-violet-600/15 rounded-full blur-[150px] animate-pulse delay-1000" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[120px] animate-pulse delay-500" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-[100px] animate-pulse delay-700" />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}
        />
        
        {/* Noise texture */}
        <div className="absolute inset-0 opacity-[0.02] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')]" />
      </div>

      {/* Navigation */}
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled ? "bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5" : "bg-transparent"
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href={`/${locale}`} className="flex items-center gap-3 group">
              <div className="relative">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 via-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-all group-hover:scale-105">
                  <Zap className="w-6 h-6 text-white" />
                </div>
              </div>
              <span className="text-2xl font-bold tracking-tight">
                Task<span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">OS</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-slate-400 hover:text-white transition-colors font-medium">
                Features
              </a>
              <a href="#how-it-works" className="text-sm text-slate-400 hover:text-white transition-colors font-medium">
                How it Works
              </a>
              <a href="#pricing" className="text-sm text-slate-400 hover:text-white transition-colors font-medium">
                Pricing
              </a>
              <a href="#testimonials" className="text-sm text-slate-400 hover:text-white transition-colors font-medium">
                Testimonials
              </a>
            </div>

            {/* Auth buttons */}
            <div className="hidden md:flex items-center gap-4">
              <SignedOut>
                <Link href={`/${locale}/sign-in`}>
                  <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5 font-medium">
                    {t("signIn")}
                  </Button>
                </Link>
                <Link href={`/${locale}/sign-up`}>
                  <Button className="bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 hover:from-blue-500 hover:via-violet-500 hover:to-purple-500 text-white border-0 shadow-lg shadow-violet-500/25 font-medium px-6">
                    {t("getStarted")}
                    <ArrowRight className="w-4 h-4 ms-2" />
                  </Button>
                </Link>
              </SignedOut>
              <SignedIn>
                <Link href={`/${locale}/app/workspaces`}>
                  <Button className="bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 hover:from-blue-500 hover:via-violet-500 hover:to-purple-500 text-white border-0 shadow-lg shadow-violet-500/25 font-medium px-6">
                    Go to App
                    <ArrowRight className="w-4 h-4 ms-2" />
                  </Button>
                </Link>
              </SignedIn>
            </div>

            {/* Mobile menu button */}
            <button 
              className="md:hidden p-2 rounded-lg hover:bg-white/5 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0a0a0f]/95 backdrop-blur-xl border-t border-white/5">
            <div className="px-4 py-6 space-y-4">
              <a href="#features" className="block py-2 text-slate-300 hover:text-white">Features</a>
              <a href="#how-it-works" className="block py-2 text-slate-300 hover:text-white">How it Works</a>
              <a href="#pricing" className="block py-2 text-slate-300 hover:text-white">Pricing</a>
              <a href="#testimonials" className="block py-2 text-slate-300 hover:text-white">Testimonials</a>
              <div className="pt-4 border-t border-white/10 space-y-3">
                <SignedOut>
                  <Link href={`/${locale}/sign-in`} className="block">
                    <Button variant="outline" className="w-full border-white/20">Sign In</Button>
                  </Link>
                  <Link href={`/${locale}/sign-up`} className="block">
                    <Button className="w-full bg-gradient-to-r from-blue-600 to-violet-600">Get Started Free</Button>
                  </Link>
                </SignedOut>
                <SignedIn>
                  <Link href={`/${locale}/app/workspaces`} className="block">
                    <Button className="w-full bg-gradient-to-r from-blue-600 to-violet-600">Go to App</Button>
                  </Link>
                </SignedIn>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-32 pb-20 md:pt-44 md:pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-5xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-violet-500/10 border border-blue-500/20 text-sm mb-8 backdrop-blur-sm animate-fade-in">
              <div className="flex items-center gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <span className="text-slate-300">Introducing <span className="text-blue-400 font-semibold">My Day</span> — Your AI-Powered Daily Productivity Hub</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>

            {/* Heading */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 leading-[1.1]">
              <span className="block text-white">
                Ship Projects
              </span>
              <span className="block bg-gradient-to-r from-blue-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                10x Faster
              </span>
            </h1>

            {/* Description */}
            <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto mb-12 leading-relaxed">
              The all-in-one workspace for teams who want to <span className="text-white font-medium">actually get things done</span>. 
              Kanban boards, real-time collaboration, AI assistance, and a revolutionary <span className="text-blue-400 font-medium">Process Mode</span> to track every stage of your work.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <SignedOut>
                <Link href={`/${locale}/sign-up`}>
                  <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 hover:from-blue-500 hover:via-violet-500 hover:to-purple-500 text-white text-lg px-10 h-14 border-0 shadow-2xl shadow-violet-500/30 hover:shadow-violet-500/50 transition-all hover:scale-105">
                    Start Free Trial
                    <ArrowRight className="w-5 h-5 ms-2" />
                  </Button>
                </Link>
              </SignedOut>
              <SignedIn>
                <Link href={`/${locale}/app/workspaces`}>
                  <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 text-white text-lg px-10 h-14 border-0 shadow-2xl shadow-violet-500/30">
                    Open Dashboard
                    <ArrowRight className="w-5 h-5 ms-2" />
                  </Button>
                </Link>
              </SignedIn>
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-white/20 text-white hover:bg-white/10 text-lg px-8 h-14 backdrop-blur-sm">
                <Play className="w-5 h-5 me-2 fill-current" />
                Watch Demo
              </Button>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-500" />
                <span>Enterprise-grade security</span>
              </div>
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-violet-500" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>

          {/* Hero Image/Preview */}
          <div className="mt-20 relative max-w-6xl mx-auto">
            {/* Glow effect behind */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-violet-500/20 to-purple-500/20 blur-3xl scale-110" />
            
            {/* Main preview */}
            <div className="relative rounded-2xl md:rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950/90 backdrop-blur-xl overflow-hidden shadow-2xl">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-white/5 text-xs text-slate-400">
                    <Lock className="w-3 h-3" />
                    app.taskos.io/workspace/dashboard
                  </div>
                </div>
              </div>
              
              {/* Dashboard preview */}
              <div className="p-4 md:p-6">
                <div className="grid grid-cols-12 gap-4">
                  {/* Sidebar mock */}
                  <div className="hidden lg:block col-span-2 space-y-3">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <div className="w-6 h-6 rounded bg-blue-500/30" />
                      <div className="h-3 w-16 rounded bg-blue-500/30" />
                    </div>
                    {[75, 65, 80, 60, 70].map((width, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5">
                        <div className="w-6 h-6 rounded bg-white/10" />
                        <div className="h-3 rounded bg-white/10" style={{ width: `${width}%` }} />
                      </div>
                    ))}
                  </div>
                  
                  {/* Main content */}
                  <div className="col-span-12 lg:col-span-10 space-y-4">
                    {/* Stats row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: "Total Tasks", value: "127", color: "from-blue-500 to-cyan-500", icon: Layers },
                        { label: "Completed", value: "89", color: "from-emerald-500 to-green-500", icon: CheckCircle2 },
                        { label: "In Progress", value: "24", color: "from-orange-500 to-amber-500", icon: Clock },
                        { label: "Team Members", value: "12", color: "from-violet-500 to-purple-500", icon: Users },
                      ].map((stat, i) => (
                        <div key={i} className="p-4 rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                              <stat.icon className="w-4 h-4 text-white" />
                            </div>
                          </div>
                          <div className="text-2xl font-bold text-white">{stat.value}</div>
                          <div className="text-xs text-slate-400">{stat.label}</div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Kanban preview */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {[
                        { name: "Backlog", color: "slate", count: 4 },
                        { name: "To Do", color: "blue", count: 3 },
                        { name: "In Progress", color: "orange", count: 2 },
                        { name: "Review", color: "purple", count: 2 },
                        { name: "Done", color: "emerald", count: 5 },
                      ].map((col, i) => (
                        <div key={col.name} className="rounded-xl bg-white/[0.03] p-3 border border-white/5">
                          <div className="flex items-center gap-2 mb-3">
                            <div className={`w-2 h-2 rounded-full bg-${col.color}-500`} />
                            <span className="text-xs font-medium text-slate-300">{col.name}</span>
                            <span className="text-xs text-slate-500 ml-auto">{col.count}</span>
                          </div>
                          {[...Array(Math.min(col.count, 3))].map((_, j) => (
                            <div key={j} className="mb-2 p-3 rounded-lg bg-white/[0.05] border border-white/5 hover:border-white/10 transition-colors">
                              <div className="h-2.5 w-full rounded bg-white/20 mb-2" />
                              <div className="h-2 w-2/3 rounded bg-white/10" />
                              <div className="flex items-center gap-2 mt-3">
                                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-violet-500" />
                                <div className={`px-2 py-0.5 rounded text-[10px] bg-${col.color}-500/20 text-${col.color}-400`}>
                                  {["High", "Medium", "Low"][j % 3]}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Fade at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0a0f] to-transparent" />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {[
              { value: 10000, suffix: "+", label: "Active Users" },
              { value: 50000, suffix: "+", label: "Tasks Completed" },
              { value: 99.9, suffix: "%", label: "Uptime" },
              { value: 4.9, suffix: "/5", label: "User Rating" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent mb-2">
                  {stat.value < 100 ? stat.value : <AnimatedNumber value={stat.value} />}{stat.suffix}
                </div>
                <div className="text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-sm text-blue-400 mb-6">
              <Sparkles className="w-4 h-4" />
              Powerful Features
            </div>
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              Everything you need to
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                work smarter
              </span>
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              A complete toolkit designed for modern teams. From ideation to execution, TaskOS has you covered.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={Kanban}
              title="Kanban Boards"
              description="Visualize your workflow with drag-and-drop boards. Customize columns, add swimlanes, and track progress at a glance."
              gradient="from-blue-500 to-cyan-500"
              delay={0}
            />
            <FeatureCard
              icon={Target}
              title="Process Mode"
              description="Break complex tasks into stages with checklists, decisions, and file attachments. Perfect for workflows that need structure."
              gradient="from-emerald-500 to-green-500"
              delay={100}
            />
            <FeatureCard
              icon={Brain}
              title="AI Assistant"
              description="Get smart task suggestions, auto-prioritization, and intelligent summaries. Let AI handle the busywork."
              gradient="from-violet-500 to-purple-500"
              delay={200}
            />
            <FeatureCard
              icon={MessageSquare}
              title="Real-time Comments"
              description="Collaborate in real-time with instant comments and @mentions. Never miss important updates from your team."
              gradient="from-orange-500 to-red-500"
              delay={300}
            />
            <FeatureCard
              icon={Timer}
              title="Pomodoro Timer"
              description="Built-in focus timer with energy tracking and break reminders. Maximize your productivity with science-backed techniques."
              gradient="from-pink-500 to-rose-500"
              delay={400}
            />
            <FeatureCard
              icon={Calendar}
              title="Smart Calendar"
              description="View all your deadlines in one place. Switch between grid and agenda views. Never miss a due date."
              gradient="from-cyan-500 to-blue-500"
              delay={500}
            />
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="relative z-10 py-32 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400 mb-6">
              <Rocket className="w-4 h-4" />
              Getting Started
            </div>
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              Up and running in
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent"> minutes</span>
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              No complex setup. No learning curve. Just results.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Create a Workspace",
                description: "Sign up and create your first workspace in seconds. Invite your team with a simple link.",
                icon: Users,
                color: "blue"
              },
              {
                step: "02",
                title: "Add Your Tasks",
                description: "Create tasks, set priorities, assign team members, and add due dates. Use AI to enhance your task descriptions.",
                icon: Layers,
                color: "violet"
              },
              {
                step: "03",
                title: "Track & Deliver",
                description: "Move tasks through your workflow, collaborate in real-time, and celebrate when you ship.",
                icon: TrendingUp,
                color: "emerald"
              },
            ].map((item, i) => (
              <div key={i} className="relative group">
                {/* Connector line */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-16 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-white/20 to-transparent" />
                )}
                
                <div className="relative p-8 rounded-3xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-all">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-${item.color}-500/10 border border-${item.color}-500/20 mb-6 group-hover:scale-110 transition-transform`}>
                    <item.icon className={`w-8 h-8 text-${item.color}-400`} />
                  </div>
                  <div className="text-sm font-bold text-slate-500 mb-2">STEP {item.step}</div>
                  <h3 className="text-2xl font-bold mb-3">{item.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Mode Highlight */}
      <section className="relative z-10 py-32 border-t border-white/5 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400 mb-6">
                <Sparkles className="w-4 h-4" />
                Unique to TaskOS
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                  Process Mode
                </span>
                <br />
                for Complex Workflows
              </h2>
              <p className="text-xl text-slate-400 mb-8 leading-relaxed">
                Not all tasks are created equal. Some need structure, documentation, and clear milestones. 
                Process Mode transforms how you handle complex projects.
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  { text: "Break tasks into visual stages", icon: Layers },
                  { text: "Add checklists to each stage", icon: CheckCircle2 },
                  { text: "Attach files and documents", icon: FileText },
                  { text: "Document decisions and notes", icon: MessageSquare },
                  { text: "Track time spent per stage", icon: Clock },
                  { text: "Complete audit trail", icon: Activity },
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-4 text-slate-300">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-emerald-400" />
                    </div>
                    {item.text}
                  </li>
                ))}
              </ul>
              <Link href={`/${locale}/sign-up`}>
                <Button size="lg" className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-lg px-8 h-12 border-0 shadow-xl shadow-emerald-500/25">
                  Try Process Mode Free
                  <ArrowRight className="w-5 h-5 ms-2" />
                </Button>
              </Link>
            </div>
            
            {/* Process mode visualization */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 blur-3xl scale-110" />
              <div className="relative rounded-3xl border border-white/10 bg-slate-900/80 p-6 backdrop-blur-xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Website Redesign</h4>
                    <p className="text-xs text-slate-400">4 stages • 2 completed</p>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="h-2 rounded-full bg-white/10 mb-8 overflow-hidden">
                  <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500" />
                </div>
                
                {/* Stages */}
                <div className="space-y-4">
                  {[
                    { name: "Research", status: "completed", items: 5, completed: 5 },
                    { name: "Design", status: "completed", items: 8, completed: 8 },
                    { name: "Development", status: "in-progress", items: 12, completed: 6 },
                    { name: "Launch", status: "pending", items: 4, completed: 0 },
                  ].map((stage, i) => (
                    <div 
                      key={stage.name} 
                      className={cn(
                        "rounded-xl p-4 border transition-all",
                        stage.status === "completed" && "bg-emerald-500/10 border-emerald-500/30",
                        stage.status === "in-progress" && "bg-blue-500/10 border-blue-500/30",
                        stage.status === "pending" && "bg-white/5 border-white/10"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                            stage.status === "completed" && "bg-emerald-500 text-white",
                            stage.status === "in-progress" && "bg-blue-500 text-white",
                            stage.status === "pending" && "bg-white/20 text-slate-400"
                          )}>
                            {stage.status === "completed" ? <Check className="w-4 h-4" /> : i + 1}
                          </div>
                          <span className={cn(
                            "font-medium",
                            stage.status === "completed" && "text-emerald-400",
                            stage.status === "in-progress" && "text-blue-400",
                            stage.status === "pending" && "text-slate-400"
                          )}>
                            {stage.name}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400">{stage.completed}/{stage.items}</span>
                      </div>
                      <div className="flex gap-1">
                        {[...Array(stage.items)].map((_, j) => (
                          <div 
                            key={j} 
                            className={cn(
                              "h-1.5 flex-1 rounded-full",
                              j < stage.completed 
                                ? stage.status === "completed" ? "bg-emerald-500" : "bg-blue-500"
                                : "bg-white/10"
                            )} 
                          />
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

      {/* My Day Feature Highlight */}
      <section className="relative z-10 py-32 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* My Day visualization */}
            <div className="relative order-2 lg:order-1">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500/20 to-pink-500/20 blur-3xl scale-110" />
              <div className="relative rounded-3xl border border-white/10 bg-slate-900/80 p-6 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h4 className="font-semibold text-white text-lg">Good morning, Sarah! ☀️</h4>
                    <p className="text-sm text-slate-400">Let&apos;s make today productive</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">3/8</div>
                    <div className="text-xs text-slate-400">tasks done</div>
                  </div>
                </div>

                {/* Pomodoro Timer */}
                <div className="rounded-2xl bg-gradient-to-br from-violet-500/20 to-pink-500/20 p-6 mb-6 border border-violet-500/20">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-white mb-2 font-mono">25:00</div>
                    <div className="text-sm text-violet-300 mb-4">Focus Session</div>
                    <div className="flex items-center justify-center gap-2">
                      <Button size="sm" className="bg-violet-500 hover:bg-violet-400 rounded-full w-10 h-10 p-0">
                        <Play className="w-4 h-4 fill-current" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Energy Level */}
                <div className="flex items-center gap-2 mb-6">
                  <span className="text-sm text-slate-400">Energy:</span>
                  {["😴", "😐", "😊", "🔥", "⚡"].map((emoji, i) => (
                    <button key={i} className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                      i === 3 ? "bg-orange-500/20 scale-110" : "bg-white/5 hover:bg-white/10"
                    )}>
                      {emoji}
                    </button>
                  ))}
                </div>

                {/* Quick todos */}
                <div className="space-y-2">
                  {[
                    { text: "Review PRs", done: true },
                    { text: "Team standup", done: true },
                    { text: "Finish dashboard design", done: false },
                  ].map((todo, i) => (
                    <div key={i} className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border",
                      todo.done ? "bg-emerald-500/10 border-emerald-500/20" : "bg-white/5 border-white/10"
                    )}>
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                        todo.done ? "bg-emerald-500 border-emerald-500" : "border-slate-400"
                      )}>
                        {todo.done && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className={cn(
                        "flex-1",
                        todo.done && "line-through text-slate-400"
                      )}>{todo.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-sm text-violet-400 mb-6">
                <Sparkles className="w-4 h-4" />
                New Feature
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
                  My Day
                </span>
                <br />
                Your Personal Command Center
              </h2>
              <p className="text-xl text-slate-400 mb-8 leading-relaxed">
                Start each day with a clear focus. My Day combines your personal todos, 
                assigned tasks, Pomodoro timer, and energy tracking in one beautiful view.
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  { text: "Built-in Pomodoro timer with sound alerts", icon: Timer },
                  { text: "Energy level tracking for optimal scheduling", icon: Zap },
                  { text: "Daily goals with progress tracking", icon: Target },
                  { text: "Quick personal todos", icon: CheckCircle2 },
                  { text: "Overview of all assigned tasks", icon: Layers },
                  { text: "Confetti celebrations when you complete tasks! 🎉", icon: Sparkles },
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-4 text-slate-300">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-violet-400" />
                    </div>
                    {item.text}
                  </li>
                ))}
              </ul>
              <Link href={`/${locale}/sign-up`}>
                <Button size="lg" className="bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white text-lg px-8 h-12 border-0 shadow-xl shadow-violet-500/25">
                  Try My Day Free
                  <ArrowRight className="w-5 h-5 ms-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="relative z-10 py-32 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-sm text-yellow-400 mb-6">
              <Star className="w-4 h-4 fill-current" />
              Loved by Teams
            </div>
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              What our users
              <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent"> say</span>
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Join thousands of happy teams who transformed their productivity with TaskOS
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <TestimonialCard
              quote="TaskOS changed how our team works. The Process Mode is a game-changer for our complex projects. We've cut our delivery time by 40%."
              author="Sarah Chen"
              role="Product Manager"
              company="TechCorp"
              avatar="SC"
            />
            <TestimonialCard
              quote="Finally, a project management tool that doesn't feel like a spreadsheet. The real-time collaboration features are incredible."
              author="Marcus Johnson"
              role="Engineering Lead"
              company="StartupXYZ"
              avatar="MJ"
            />
            <TestimonialCard
              quote="The My Day feature with Pomodoro timer has boosted my personal productivity by 3x. I actually finish my daily tasks now!"
              author="Emily Rodriguez"
              role="Designer"
              company="DesignStudio"
              avatar="ER"
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative z-10 py-32 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-sm text-blue-400 mb-6">
              <Zap className="w-4 h-4" />
              Simple Pricing
            </div>
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              Start free,
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent"> scale as you grow</span>
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              No hidden fees. No surprises. Cancel anytime.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Free Plan */}
            <div className="relative rounded-3xl border border-white/10 bg-white/[0.02] p-8 hover:border-white/20 transition-all">
              <div className="mb-8">
                <h3 className="text-2xl font-bold mb-2">Free</h3>
                <p className="text-slate-400">Perfect for getting started</p>
              </div>
              <div className="mb-8">
                <span className="text-5xl font-bold">$0</span>
                <span className="text-slate-400 ms-2">/month</span>
              </div>
              <ul className="space-y-4 mb-8">
                <PricingFeature included>Up to 3 workspaces</PricingFeature>
                <PricingFeature included>Unlimited tasks</PricingFeature>
                <PricingFeature included>Kanban board</PricingFeature>
                <PricingFeature included>Calendar view</PricingFeature>
                <PricingFeature included>5 file uploads/task</PricingFeature>
                <PricingFeature included={false}>Process Mode</PricingFeature>
                <PricingFeature included={false}>AI features</PricingFeature>
                <PricingFeature included={false}>Priority support</PricingFeature>
              </ul>
              <Link href={`/${locale}/sign-up`} className="block">
                <Button className="w-full h-12 bg-white/10 hover:bg-white/20 text-white border-0 text-base">
                  Get Started Free
                </Button>
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="relative rounded-3xl border-2 border-blue-500/50 bg-gradient-to-b from-blue-500/10 to-transparent p-8 lg:scale-110 shadow-2xl shadow-blue-500/20">
              <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                <span className="px-6 py-2 rounded-full bg-gradient-to-r from-blue-600 to-violet-600 text-sm font-bold shadow-lg">
                  Most Popular
                </span>
              </div>
              <div className="mb-8 pt-4">
                <h3 className="text-2xl font-bold mb-2">Pro</h3>
                <p className="text-slate-400">For growing teams</p>
              </div>
              <div className="mb-8">
                <span className="text-5xl font-bold">$12</span>
                <span className="text-slate-400 ms-2">/user/mo</span>
              </div>
              <ul className="space-y-4 mb-8">
                <PricingFeature included>Unlimited workspaces</PricingFeature>
                <PricingFeature included>Unlimited tasks</PricingFeature>
                <PricingFeature included>Process Mode</PricingFeature>
                <PricingFeature included>AI Task Enhancement</PricingFeature>
                <PricingFeature included>Unlimited file uploads</PricingFeature>
                <PricingFeature included>My Day & Pomodoro</PricingFeature>
                <PricingFeature included>Advanced filters</PricingFeature>
                <PricingFeature included>Priority support</PricingFeature>
              </ul>
              <Link href={`/${locale}/sign-up`} className="block">
                <Button className="w-full h-12 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white border-0 shadow-lg shadow-blue-500/25 text-base">
                  Start 14-Day Trial
                  <ArrowRight className="w-4 h-4 ms-2" />
                </Button>
              </Link>
            </div>

            {/* Enterprise Plan */}
            <div className="relative rounded-3xl border border-white/10 bg-white/[0.02] p-8 hover:border-white/20 transition-all">
              <div className="mb-8">
                <h3 className="text-2xl font-bold mb-2">Enterprise</h3>
                <p className="text-slate-400">For large organizations</p>
              </div>
              <div className="mb-8">
                <span className="text-5xl font-bold">Custom</span>
              </div>
              <ul className="space-y-4 mb-8">
                <PricingFeature included>Everything in Pro</PricingFeature>
                <PricingFeature included>SSO / SAML</PricingFeature>
                <PricingFeature included>Advanced security</PricingFeature>
                <PricingFeature included>Custom integrations</PricingFeature>
                <PricingFeature included>Dedicated manager</PricingFeature>
                <PricingFeature included>SLA guarantee</PricingFeature>
                <PricingFeature included>On-premise option</PricingFeature>
                <PricingFeature included>API access</PricingFeature>
              </ul>
              <Button className="w-full h-12 bg-white/10 hover:bg-white/20 text-white border-0 text-base">
                Contact Sales
              </Button>
            </div>
          </div>

          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-3 text-slate-400">
              <Shield className="w-5 h-5 text-emerald-500" />
              <span>30-day money-back guarantee · No questions asked</span>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="relative z-10 py-32 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-slate-400">
              Everything you need to know about TaskOS
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8">
            <FAQItem 
              question="Is there really a free plan?"
              answer="Yes! Our free plan includes up to 3 workspaces with unlimited tasks, Kanban boards, and calendar view. No credit card required to get started."
            />
            <FAQItem 
              question="What is Process Mode?"
              answer="Process Mode is our unique feature for complex workflows. It lets you break tasks into stages with checklists, file attachments, and decision tracking. Perfect for projects that need structure and documentation."
            />
            <FAQItem 
              question="Can I invite my team?"
              answer="Absolutely! You can invite unlimited team members to your workspace. Just send them an invite link and they can join instantly. Collaboration is at the heart of TaskOS."
            />
            <FAQItem 
              question="Is my data secure?"
              answer="Security is our top priority. We use enterprise-grade encryption, regular backups, and SOC2-compliant infrastructure. Your data is safe with us."
            />
            <FAQItem 
              question="Can I cancel anytime?"
              answer="Yes, you can cancel your subscription at any time with no questions asked. We also offer a 30-day money-back guarantee for all paid plans."
            />
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative z-10 py-32 border-t border-white/5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-violet-600/10 to-purple-600/10" />
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-blue-500/20 to-violet-500/20 rounded-full blur-[150px]" />
        </div>
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Ready to transform
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
              how you work?
            </span>
          </h2>
          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
            Join thousands of teams who are shipping faster, collaborating better, and actually enjoying project management.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <SignedOut>
              <Link href={`/${locale}/sign-up`}>
                <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 hover:from-blue-500 hover:via-violet-500 hover:to-purple-500 text-white text-lg px-12 h-14 border-0 shadow-2xl shadow-violet-500/30 hover:shadow-violet-500/50 transition-all hover:scale-105">
                  Start Your Free Trial
                  <ArrowRight className="w-5 h-5 ms-2" />
                </Button>
              </Link>
            </SignedOut>
            <SignedIn>
              <Link href={`/${locale}/app/workspaces`}>
                <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 text-white text-lg px-12 h-14 border-0 shadow-2xl shadow-violet-500/30">
                  Open Your Dashboard
                  <ArrowRight className="w-5 h-5 ms-2" />
                </Button>
              </Link>
            </SignedIn>
          </div>
          <p className="mt-6 text-sm text-slate-500">
            No credit card required · Free plan available · Setup in 2 minutes
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div className="md:col-span-2">
              <Link href={`/${locale}`} className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-violet-500 to-purple-600 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">TaskOS</span>
              </Link>
              <p className="text-slate-400 max-w-sm mb-6">
                The all-in-one workspace for teams who want to ship faster and work smarter.
              </p>
              <div className="flex items-center gap-4">
                {/* Social links placeholder */}
                {["twitter", "linkedin", "github"].map((social) => (
                  <a key={social} href="#" className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                    <Globe className="w-5 h-5 text-slate-400" />
                  </a>
                ))}
              </div>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-3 text-slate-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Changelog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Roadmap</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-3 text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              © {new Date().getFullYear()} TaskOS. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-slate-500">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
