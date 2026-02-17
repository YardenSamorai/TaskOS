"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Download, Code2, Zap, Settings, CheckCircle2, Copy, Terminal,
  Eye, Sparkles, Key, Github, Store, GitPullRequest, ShieldCheck,
  TestTube, Workflow, ChevronDown, ExternalLink, HelpCircle, Layers
} from "lucide-react";
import { toast } from "sonner";

const MARKETPLACE_URL = "https://marketplace.visualstudio.com/items?itemName=YardenSamorai.taskos";
const VSIX_DOWNLOAD_URL = "/downloads/taskos-0.1.1.vsix";

export default function ExtensionsPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const params = useParams();
  const locale = params.locale as string || "en";

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="container max-w-5xl px-4 sm:px-6 py-6 sm:py-8">

      {/* Hero — Compact */}
      <div className="relative mb-6 p-5 sm:p-7 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnYyaDR2Mmgtdi00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-green-500/80 text-white border-0 text-xs">v0.1.1</Badge>
              <Badge className="bg-white/20 text-white border-0 text-xs">VS Code & Cursor</Badge>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1">TaskOS IDE Extension</h1>
            <p className="text-sm sm:text-base text-white/85 max-w-lg">
              AI-powered — implements tasks, runs tests, reviews code, and opens PRs from your editor.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button size="sm" className="bg-white text-indigo-600 hover:bg-white/90 gap-1.5 font-semibold" asChild>
              <a href={MARKETPLACE_URL} target="_blank" rel="noopener noreferrer">
                <Store className="h-4 w-4" /> Install
              </a>
            </Button>
            <Button size="sm" className="bg-white/20 text-white hover:bg-white/30 border border-white/40 gap-1.5" asChild>
              <a href={VSIX_DOWNLOAD_URL}><Download className="h-4 w-4" /> .vsix</a>
            </Button>
            <Button size="sm" className="bg-white/10 text-white hover:bg-white/20 border border-white/30 gap-1.5" asChild>
              <a href="https://github.com/YardenSamorai/TaskOS" target="_blank" rel="noopener noreferrer">
                <Github className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Setup — 3 Steps Side by Side */}
      <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
        <Zap className="h-5 w-5 text-yellow-500" /> Quick Setup
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        {/* Step 1 */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-600" />
          <CardContent className="p-4 pt-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">1</span>
              <h3 className="font-semibold text-sm">Install Extension</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Search &quot;TaskOS&quot; in Extensions panel or use terminal:</p>
            <div className="flex items-center gap-1.5 bg-zinc-900 text-zinc-100 rounded-md p-2 font-mono text-[11px] mb-2">
              <Terminal className="h-3 w-3 text-zinc-500 shrink-0" />
              <code className="flex-1 overflow-x-auto whitespace-nowrap">code --install-extension YardenSamorai.taskos</code>
              <button className="text-zinc-500 hover:text-white shrink-0" onClick={() => copyToClipboard("code --install-extension YardenSamorai.taskos", "cmd1")}>
                {copied === "cmd1" ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground">Works in VS Code & Cursor. Or <a href={VSIX_DOWNLOAD_URL} className="text-indigo-600 hover:underline">download .vsix</a></p>
          </CardContent>
        </Card>

        {/* Step 2 */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-600" />
          <CardContent className="p-4 pt-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">2</span>
              <h3 className="font-semibold text-sm">Get API Key</h3>
            </div>
            <ol className="text-xs text-muted-foreground space-y-1.5 mb-3">
              <li className="flex gap-1.5"><span className="text-indigo-600 font-bold">1.</span> Open <strong className="text-foreground">Account Settings</strong></li>
              <li className="flex gap-1.5"><span className="text-indigo-600 font-bold">2.</span> Go to <strong className="text-foreground">Security → API Keys</strong></li>
              <li className="flex gap-1.5"><span className="text-indigo-600 font-bold">3.</span> Create & copy key</li>
            </ol>
            <Button variant="outline" size="sm" asChild className="gap-1.5 w-full text-xs">
              <a href={`/${locale}/app/account`}><Key className="h-3 w-3" /> Account Settings</a>
            </Button>
          </CardContent>
        </Card>

        {/* Step 3 */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-600" />
          <CardContent className="p-4 pt-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">3</span>
              <h3 className="font-semibold text-sm">Connect Workspace</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-2">The onboarding wizard opens automatically. Enter your API key and workspace ID:</p>
            <div className="bg-muted rounded-md p-2 text-[11px] font-mono overflow-x-auto mb-2">
              <span className="text-muted-foreground">task-os.app/en/app/</span>
              <span className="text-indigo-600 font-bold">your-workspace-id</span>
              <span className="text-muted-foreground">/dashboard</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-3 w-3" /> API URL is auto-configured
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Features + Pipeline — Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">

        {/* Pipeline */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <Workflow className="h-4 w-4 text-indigo-600" /> AI Agent Pipeline
            </h3>
            <div className="space-y-2">
              {[
                { icon: <Code2 className="h-3.5 w-3.5" />, step: "Plan & Implement", color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" },
                { icon: <TestTube className="h-3.5 w-3.5" />, step: "Run Tests", color: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300" },
                { icon: <ShieldCheck className="h-3.5 w-3.5" />, step: "Self Code Review", color: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300" },
                { icon: <Zap className="h-3.5 w-3.5" />, step: "Autofix Blockers", color: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300" },
                { icon: <GitPullRequest className="h-3.5 w-3.5" />, step: "Open PR", color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-md ${item.color} flex items-center justify-center shrink-0`}>{item.icon}</div>
                  <span className="text-sm font-medium">{item.step}</span>
                  {i < 4 && <span className="text-muted-foreground text-xs ml-auto">→</span>}
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-1.5 bg-muted rounded-md p-2 font-mono text-[11px]">
              <Terminal className="h-3 w-3 text-muted-foreground shrink-0" />
              <code className="overflow-x-auto whitespace-nowrap">Ctrl+Shift+P → &quot;TaskOS: Run Pipeline & Create PR&quot;</code>
              <button className="text-muted-foreground hover:text-foreground shrink-0 ml-auto" onClick={() => copyToClipboard("TaskOS: Run Pipeline & Create PR", "pipe")}>
                {copied === "pipe" ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Key Features */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" /> Key Features
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: <Layers className="h-4 w-4 text-indigo-600" />, title: "Custom Profiles", desc: "Code style & review rules" },
                { icon: <TestTube className="h-4 w-4 text-yellow-600" />, title: "Auto Testing", desc: "Run & verify before shipping" },
                { icon: <ShieldCheck className="h-4 w-4 text-purple-600" />, title: "Code Review", desc: "AI reviews every PR" },
                { icon: <GitPullRequest className="h-4 w-4 text-green-600" />, title: "Rich PRs", desc: "Summaries, tests & findings" },
                { icon: <Eye className="h-4 w-4 text-blue-600" />, title: "Task Sidebar", desc: "View & manage tasks" },
                { icon: <Settings className="h-4 w-4 text-orange-600" />, title: "Configurable", desc: "Profiles, presets & more" },
              ].map((f, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 border">
                  <div className="mt-0.5 shrink-0">{f.icon}</div>
                  <div>
                    <p className="text-xs font-semibold">{f.title}</p>
                    <p className="text-[10px] text-muted-foreground">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FAQ — Collapsible */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
            <HelpCircle className="h-4 w-4" /> FAQ & Troubleshooting
          </h3>
          <div className="space-y-1">
            {[
              { q: "Extension not showing?", a: "Press Ctrl+Shift+P → type \"Reload Window\" and press Enter." },
              { q: "Can't find TaskOS in the Marketplace?", a: "Search for \"YardenSamorai.taskos\" or use the direct link." },
              { q: "\"Network error\" or \"Invalid API key\"?", a: "Make sure API URL is https://www.task-os.app/api/v1 and your key starts with taskos_" },
              { q: "No tasks showing?", a: "Check that your Workspace ID matches the ID in your browser URL when inside a workspace." },
            ].map((faq, i) => (
              <button
                key={i}
                className="w-full text-left rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{faq.q}</span>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </div>
                {openFaq === i && (
                  <p className="text-xs text-muted-foreground mt-2 pr-6">{faq.a}</p>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Coming Soon — Inline */}
      <div className="flex items-center justify-between p-3 rounded-lg border opacity-50">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4" />
          <span className="text-sm font-medium">JetBrains IDEs</span>
          <span className="text-xs text-muted-foreground">IntelliJ, WebStorm, PyCharm</span>
        </div>
        <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
      </div>
    </div>
  );
}
