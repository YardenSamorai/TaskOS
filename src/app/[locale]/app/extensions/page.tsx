"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Download, Code2, Zap, CheckCircle2, Copy, Terminal,
  Eye, Sparkles, Key, Github, Store, GitPullRequest, ShieldCheck,
  TestTube, Workflow, ChevronDown, ExternalLink, HelpCircle, Layers,
  Puzzle, Settings, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MARKETPLACE_URL = "https://marketplace.visualstudio.com/items?itemName=YardenSamorai.taskos";
const VSIX_DOWNLOAD_URL = "/downloads/taskos-0.1.1.vsix";

export default function ExtensionsPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const params = useParams();
  const locale = (params.locale as string) || "en";

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Header - matches dashboard style */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
              v0.1.1
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              VS Code & Cursor
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
            IDE Extension
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            AI-powered agent that implements tasks, runs tests, reviews code, and opens PRs.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" className="gap-1.5" asChild>
            <a href={MARKETPLACE_URL} target="_blank" rel="noopener noreferrer">
              <Store className="w-4 h-4" />
              Install
            </a>
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <a href={VSIX_DOWNLOAD_URL}>
              <Download className="w-4 h-4" />
              .vsix
            </a>
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <a href="https://github.com/YardenSamorai/TaskOS" target="_blank" rel="noopener noreferrer">
              <Github className="w-4 h-4" />
            </a>
          </Button>
        </div>
      </div>

      {/* Quick Setup - 3 stat-like cards matching Execution Pulse */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Step 1 */}
        <div className="flex items-start gap-3 rounded-xl border bg-card p-4 transition-colors">
          <div className="p-2 rounded-lg shrink-0 bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Terminal className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-bold text-muted-foreground">STEP 1</span>
            </div>
            <p className="text-sm font-semibold mb-1.5">Install Extension</p>
            <p className="text-xs text-muted-foreground mb-2">Search "TaskOS" in Extensions panel or use terminal:</p>
            <div className="flex items-center gap-1.5 bg-muted rounded-lg p-2 font-mono text-[11px]">
              <code className="flex-1 overflow-x-auto whitespace-nowrap text-muted-foreground">code --install-extension YardenSamorai.taskos</code>
              <button className="text-muted-foreground hover:text-foreground shrink-0" onClick={() => copyToClipboard("code --install-extension YardenSamorai.taskos", "cmd1")}>
                {copied === "cmd1" ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              Or <a href={VSIX_DOWNLOAD_URL} className="text-primary hover:underline">download .vsix</a>
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex items-start gap-3 rounded-xl border bg-card p-4 transition-colors">
          <div className="p-2 rounded-lg shrink-0 bg-violet-500/10 text-violet-600 dark:text-violet-400">
            <Key className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-bold text-muted-foreground">STEP 2</span>
            </div>
            <p className="text-sm font-semibold mb-1.5">Get API Key</p>
            <ol className="text-xs text-muted-foreground space-y-1 mb-2.5">
              <li>1. Open <strong className="text-foreground">Account Settings</strong></li>
              <li>2. Go to <strong className="text-foreground">Security → API Keys</strong></li>
              <li>3. Create & copy key</li>
            </ol>
            <Button variant="outline" size="sm" asChild className="gap-1.5 w-full text-xs h-8">
              <a href={`/${locale}/app/account`}>
                <Key className="w-3 h-3" /> Account Settings
              </a>
            </Button>
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex items-start gap-3 rounded-xl border bg-card p-4 transition-colors">
          <div className="p-2 rounded-lg shrink-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Puzzle className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-bold text-muted-foreground">STEP 3</span>
            </div>
            <p className="text-sm font-semibold mb-1.5">Connect Workspace</p>
            <p className="text-xs text-muted-foreground mb-2">Enter your API key and workspace ID:</p>
            <div className="bg-muted rounded-lg p-2 text-[11px] font-mono overflow-x-auto mb-2">
              <span className="text-muted-foreground">task-os.app/en/app/</span>
              <span className="text-primary font-bold">your-workspace-id</span>
              <span className="text-muted-foreground">/dashboard</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3 h-3" /> API URL is auto-configured
            </div>
          </div>
        </div>
      </div>

      {/* Agent Summary style card for the pipeline */}
      <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-violet-500/5">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.03] to-violet-500/[0.03]" />
        <CardContent className="relative p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-violet-500/20 shrink-0">
                <Workflow className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm sm:text-base">AI Agent Pipeline</h3>
                <p className="text-muted-foreground text-xs sm:text-sm mt-0.5 leading-relaxed">
                  One command triggers the full cycle: plan, implement, test, review, and open a PR.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-muted rounded-lg px-3 py-2 font-mono text-[11px] shrink-0">
              <Terminal className="w-3 h-3 text-muted-foreground shrink-0" />
              <code className="whitespace-nowrap">Ctrl+Shift+P → "TaskOS: Run Pipeline"</code>
              <button className="text-muted-foreground hover:text-foreground shrink-0 ml-1" onClick={() => copyToClipboard("TaskOS: Run Pipeline & Create PR", "pipe")}>
                {copied === "pipe" ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main content - 2 column grid like dashboard Zone 3 */}
      <div className="grid lg:grid-cols-5 gap-5">
        {/* Left column - 3/5 */}
        <div className="lg:col-span-3 flex flex-col gap-5">
          {/* Pipeline Steps */}
          <Card>
            <CardHeader className="pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
              <CardTitle className="text-base sm:text-lg">Pipeline Steps</CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              {/* Pipeline bar - matches TaskPipeline style */}
              <div className="flex items-center gap-0.5 h-8 rounded-lg overflow-hidden bg-muted/30 mb-3">
                {[
                  { label: "Plan", color: "bg-blue-400 dark:bg-blue-500" },
                  { label: "Implement", color: "bg-amber-400 dark:bg-amber-500" },
                  { label: "Test", color: "bg-yellow-400 dark:bg-yellow-500" },
                  { label: "Review", color: "bg-violet-400 dark:bg-violet-500" },
                  { label: "PR", color: "bg-emerald-400 dark:bg-emerald-500" },
                ].map((stage) => (
                  <div
                    key={stage.label}
                    className="relative h-full flex-1 group"
                  >
                    <div className={cn("h-full w-full opacity-70", stage.color)} />
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-sm">
                      {stage.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                {[
                  { icon: <Code2 className="w-4 h-4" />, step: "Plan & Implement", desc: "Reads the task, plans changes, writes code", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
                  { icon: <TestTube className="w-4 h-4" />, step: "Run Tests", desc: "Executes test suites, validates output", color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" },
                  { icon: <ShieldCheck className="w-4 h-4" />, step: "Self Code Review", desc: "AI reviews its own changes for quality", color: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
                  { icon: <Zap className="w-4 h-4" />, step: "Autofix Blockers", desc: "Fixes lint errors, type issues, test failures", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
                  { icon: <GitPullRequest className="w-4 h-4" />, step: "Open PR", desc: "Creates a pull request with summary & findings", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className={cn("p-2 rounded-lg shrink-0", item.color)}>
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{item.step}</p>
                      <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                    </div>
                    {i < 4 && (
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* FAQ */}
          <Card>
            <CardHeader className="pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                FAQ & Troubleshooting
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="space-y-1.5">
                {[
                  { q: "Extension not showing?", a: "Press Ctrl+Shift+P → type \"Reload Window\" and press Enter." },
                  { q: "Can't find TaskOS in the Marketplace?", a: "Search for \"YardenSamorai.taskos\" or use the direct install link above." },
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
                      <ChevronDown className={cn(
                        "w-4 h-4 shrink-0 text-muted-foreground transition-transform",
                        openFaq === i && "rotate-180"
                      )} />
                    </div>
                    {openFaq === i && (
                      <p className="text-xs text-muted-foreground mt-2 pr-6">{faq.a}</p>
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column - 2/5 */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* Key Features */}
          <Card>
            <CardHeader className="pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                Key Features
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="space-y-1.5">
                {[
                  { icon: <Layers className="w-4 h-4" />, title: "Custom Profiles", desc: "Code style & review rules", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
                  { icon: <TestTube className="w-4 h-4" />, title: "Auto Testing", desc: "Run & verify before shipping", color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" },
                  { icon: <ShieldCheck className="w-4 h-4" />, title: "Code Review", desc: "AI reviews every PR", color: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
                  { icon: <GitPullRequest className="w-4 h-4" />, title: "Rich PRs", desc: "Summaries, tests & findings", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
                  { icon: <Eye className="w-4 h-4" />, title: "Task Sidebar", desc: "View & manage tasks", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
                  { icon: <Settings className="w-4 h-4" />, title: "Configurable", desc: "Profiles, presets & more", color: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className={cn("p-2 rounded-lg shrink-0", f.color)}>
                      {f.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{f.title}</p>
                      <p className="text-[11px] text-muted-foreground">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Marketplace Links */}
          <Card>
            <CardHeader className="pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Store className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                Get the Extension
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-2">
              <Button className="w-full gap-2 justify-center" asChild>
                <a href={MARKETPLACE_URL} target="_blank" rel="noopener noreferrer">
                  <Store className="w-4 h-4" />
                  VS Code Marketplace
                  <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                </a>
              </Button>
              <Button variant="outline" className="w-full gap-2 justify-center" asChild>
                <a href={VSIX_DOWNLOAD_URL}>
                  <Download className="w-4 h-4" />
                  Download .vsix (v0.1.1)
                </a>
              </Button>
              <Button variant="outline" className="w-full gap-2 justify-center" asChild>
                <a href="https://github.com/YardenSamorai/TaskOS" target="_blank" rel="noopener noreferrer">
                  <Github className="w-4 h-4" />
                  View on GitHub
                  <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* Coming Soon */}
          <div className="flex items-center gap-3 rounded-xl border bg-card p-4 opacity-50">
            <div className="p-2 rounded-lg shrink-0 bg-muted text-muted-foreground">
              <Code2 className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">JetBrains IDEs</p>
              <p className="text-[11px] text-muted-foreground">IntelliJ, WebStorm, PyCharm</p>
            </div>
            <Badge variant="secondary" className="text-[10px] shrink-0">Soon</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
