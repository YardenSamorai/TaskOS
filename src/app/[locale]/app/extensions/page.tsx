"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  Code2, 
  Zap, 
  RefreshCw, 
  Settings,
  CheckCircle2,
  Copy,
  Terminal,
  Eye,
  ListTodo,
  Sparkles,
  Monitor,
  Key,
  HelpCircle,
  Github,
  Search,
  ExternalLink,
  Store,
  GitPullRequest,
  ShieldCheck,
  TestTube,
  Workflow,
  FileCode,
  ArrowRight,
  Layers
} from "lucide-react";
import { toast } from "sonner";

const MARKETPLACE_URL = "https://marketplace.visualstudio.com/items?itemName=YardenSamorai.taskos";
const VSIX_DOWNLOAD_URL = "/downloads/taskos-0.1.1.vsix";

export default function ExtensionsPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const [installMethod, setInstallMethod] = useState<"marketplace" | "manual">("marketplace");
  const params = useParams();
  const locale = params.locale as string || "en";

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="container max-w-4xl px-4 sm:px-6 py-6 sm:py-8">
        {/* Hero Section */}
        <div className="relative mb-8 sm:mb-10 p-5 sm:p-8 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnYyaDR2Mmgtdi00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2 mb-3 sm:mb-4">
              <Badge className="bg-white/20 text-white border-0 text-xs">Pro Feature</Badge>
              <Badge className="bg-green-500/80 text-white border-0 text-xs">v0.1.1</Badge>
              <Badge className="bg-blue-500/80 text-white border-0 text-xs">Available on Marketplace</Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-3">
              TaskOS for VS Code & Cursor
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-white/90 mb-5 sm:mb-6 max-w-2xl">
              Your AI-powered coding companion — implements tasks, runs tests, reviews code, and opens PRs. All from your editor.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                size="lg" 
                className="bg-white text-indigo-600 hover:bg-white/90 gap-2 font-semibold w-full sm:w-auto"
                asChild
              >
                <a href={MARKETPLACE_URL} target="_blank" rel="noopener noreferrer">
                  <Store className="h-5 w-5" />
                  Install from Marketplace
                </a>
              </Button>
              <Button 
                size="lg" 
                className="bg-white/20 text-white hover:bg-white/30 border-2 border-white/50 gap-2 font-semibold w-full sm:w-auto"
                asChild
              >
                <a href={VSIX_DOWNLOAD_URL}>
                  <Download className="h-5 w-5" />
                  Download .vsix
                </a>
              </Button>
              <Button 
                size="lg" 
                className="bg-white/10 text-white hover:bg-white/20 border border-white/30 gap-2 font-semibold w-full sm:w-auto"
                asChild
              >
                <a href="https://github.com/YardenSamorai/TaskOS" target="_blank" rel="noopener noreferrer">
                  <Github className="h-5 w-5" />
                  GitHub
                </a>
              </Button>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8 sm:mb-10">
          <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold text-sm sm:text-base mb-1">AI Pipeline</h3>
              <p className="text-xs text-muted-foreground hidden sm:block">Test, review & ship with one click</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Eye className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-sm sm:text-base mb-1">Self Code Review</h3>
              <p className="text-xs text-muted-foreground hidden sm:block">AI reviews every PR automatically</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20">
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h3 className="font-semibold text-sm sm:text-base mb-1">Custom Profiles</h3>
              <p className="text-xs text-muted-foreground hidden sm:block">Define your code style & review rules</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 rounded-xl bg-green-500/20 flex items-center justify-center">
                <RefreshCw className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold text-sm sm:text-base mb-1">Auto Testing</h3>
              <p className="text-xs text-muted-foreground hidden sm:block">Runs & verifies tests before shipping</p>
            </CardContent>
          </Card>
        </div>

        {/* Installation Guide */}
        <Card className="mb-6 sm:mb-8">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
              <Download className="h-5 w-5 sm:h-6 sm:w-6" />
              Installation Guide
            </CardTitle>
            <CardDescription className="text-sm">
              Follow these simple steps to get started in under 5 minutes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
            
            {/* Step 1: Install the Extension */}
            <div className="relative pl-8 sm:pl-10 pb-6 sm:pb-8 border-l-2 border-indigo-200 dark:border-indigo-800 ml-3 sm:ml-4">
              <div className="absolute -left-4 sm:-left-5 top-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm sm:text-lg">
                1
              </div>
              <div className="bg-muted/50 rounded-xl p-4 sm:p-5">
                <h4 className="font-semibold text-base sm:text-lg mb-3 flex items-center gap-2">
                  <Download className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
                  Install the Extension
                </h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Choose your preferred installation method:
                </p>

                {/* Method Toggle */}
                <div className="flex rounded-lg bg-background border p-1 mb-4">
                  <button
                    onClick={() => setInstallMethod("marketplace")}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                      installMethod === "marketplace" 
                        ? "bg-indigo-600 text-white shadow-sm" 
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Store className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    VS Code Marketplace
                    <Badge className={`text-[10px] px-1.5 py-0 ${installMethod === "marketplace" ? "bg-white/20 text-white border-0" : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-0"}`}>
                      Recommended
                    </Badge>
                  </button>
                  <button
                    onClick={() => setInstallMethod("manual")}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                      installMethod === "manual" 
                        ? "bg-indigo-600 text-white shadow-sm" 
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Manual (.vsix)
                  </button>
                </div>

                {/* Marketplace Method */}
                {installMethod === "marketplace" && (
                  <div className="space-y-3 sm:space-y-4">
                    {/* Option A: Search in VS Code */}
                    <div className="bg-background rounded-lg p-3 sm:p-4 border">
                      <p className="font-medium mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
                        <span className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 text-xs flex items-center justify-center font-bold">A</span>
                        Search in Extensions Panel
                        <Badge variant="secondary" className="text-[10px]">Easiest</Badge>
                      </p>
                      <ol className="space-y-2 text-xs sm:text-sm">
                        <li className="flex items-start gap-2">
                          <span className="text-indigo-600 font-bold shrink-0">1.</span>
                          <span>Open VS Code or Cursor</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-indigo-600 font-bold shrink-0">2.</span>
                          <span>Click the <strong>Extensions</strong> icon in the sidebar (or press <kbd className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-muted rounded border text-xs font-mono">Ctrl+Shift+X</kbd>)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-indigo-600 font-bold shrink-0">3.</span>
                          <span>Search for <code className="px-1.5 py-0.5 bg-muted rounded text-xs font-semibold">&quot;TaskOS&quot;</code></span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-indigo-600 font-bold shrink-0">4.</span>
                          <span>Click <strong>&quot;Install&quot;</strong> — that&apos;s it!</span>
                        </li>
                      </ol>
                    </div>

                    {/* Option B: Direct Link */}
                    <div className="bg-background rounded-lg p-3 sm:p-4 border">
                      <p className="font-medium mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
                        <span className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 text-xs flex items-center justify-center font-bold">B</span>
                        Install from Marketplace Website
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-3">
                        Visit the extension page on the VS Code Marketplace and click &quot;Install&quot;:
                      </p>
                      <Button asChild className="gap-2 w-full sm:w-auto">
                        <a href={MARKETPLACE_URL} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                          <span className="truncate">Open in VS Code Marketplace</span>
                        </a>
                      </Button>
                    </div>

                    {/* Option C: Command Line */}
                    <div className="bg-background rounded-lg p-3 sm:p-4 border">
                      <p className="font-medium mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
                        <span className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 text-xs flex items-center justify-center font-bold">C</span>
                        Via Terminal
                      </p>
                      <div className="space-y-2">
                        <p className="text-xs sm:text-sm text-muted-foreground">For VS Code:</p>
                        <div className="flex items-center gap-2 bg-zinc-900 text-zinc-100 rounded-lg p-2 sm:p-3 font-mono text-xs sm:text-sm overflow-hidden">
                          <Terminal className="h-3 w-3 sm:h-4 sm:w-4 text-zinc-400 shrink-0" />
                          <code className="flex-1 overflow-x-auto whitespace-nowrap">code --install-extension YardenSamorai.taskos</code>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-zinc-400 hover:text-white hover:bg-zinc-800 shrink-0 h-7 w-7 p-0"
                            onClick={() => copyToClipboard("code --install-extension YardenSamorai.taskos", "vscode-marketplace")}
                          >
                            {copied === "vscode-marketplace" ? <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" /> : <Copy className="h-3 w-3 sm:h-4 sm:w-4" />}
                          </Button>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-2 sm:mt-3">For Cursor:</p>
                        <div className="flex items-center gap-2 bg-zinc-900 text-zinc-100 rounded-lg p-2 sm:p-3 font-mono text-xs sm:text-sm overflow-hidden">
                          <Terminal className="h-3 w-3 sm:h-4 sm:w-4 text-zinc-400 shrink-0" />
                          <code className="flex-1 overflow-x-auto whitespace-nowrap">cursor --install-extension YardenSamorai.taskos</code>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-zinc-400 hover:text-white hover:bg-zinc-800 shrink-0 h-7 w-7 p-0"
                            onClick={() => copyToClipboard("cursor --install-extension YardenSamorai.taskos", "cursor-marketplace")}
                          >
                            {copied === "cursor-marketplace" ? <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" /> : <Copy className="h-3 w-3 sm:h-4 sm:w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Manual VSIX Method */}
                {installMethod === "manual" && (
                  <div className="space-y-3 sm:space-y-4">
                    {/* Download */}
                    <div className="bg-background rounded-lg p-3 sm:p-4 border">
                      <p className="font-medium mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
                        <Search className="h-4 w-4 text-indigo-600" />
                        Step A — Download the .vsix file
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-3">
                        Download the extension package directly:
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button asChild className="gap-2 w-full sm:w-auto">
                          <a href={VSIX_DOWNLOAD_URL}>
                            <Download className="h-4 w-4" />
                            <span className="truncate">Download taskos-0.1.1.vsix</span>
                          </a>
                        </Button>
                        <Button variant="outline" asChild className="gap-2 w-full sm:w-auto">
                          <a href="https://github.com/YardenSamorai/TaskOS/releases" target="_blank" rel="noopener noreferrer">
                            <Github className="h-4 w-4" />
                            All Releases
                          </a>
                        </Button>
                      </div>
                    </div>

                    {/* Install via Command Palette */}
                    <div className="bg-background rounded-lg p-3 sm:p-4 border">
                      <p className="font-medium mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
                        <Monitor className="h-4 w-4 text-indigo-600" />
                        Step B — Install the .vsix file
                      </p>
                      <div className="space-y-3">
                        <div className="bg-muted/50 rounded-lg p-3 border border-dashed">
                          <p className="font-medium mb-2 text-xs sm:text-sm flex items-center gap-2">
                            <span className="w-5 h-5 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 text-xs flex items-center justify-center font-bold">1</span>
                            Via Command Palette
                          </p>
                          <ol className="space-y-1.5 text-xs sm:text-sm ml-7">
                            <li>Press <kbd className="px-1.5 sm:px-2 py-0.5 bg-background rounded border text-xs font-mono">Ctrl+Shift+P</kbd></li>
                            <li>Type <code className="px-1.5 py-0.5 bg-background rounded text-xs">Install from VSIX</code></li>
                            <li>Select the downloaded file and click <strong>&quot;Reload&quot;</strong></li>
                          </ol>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3 border border-dashed">
                          <p className="font-medium mb-2 text-xs sm:text-sm flex items-center gap-2">
                            <span className="w-5 h-5 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 text-xs flex items-center justify-center font-bold">2</span>
                            Or via Terminal
                          </p>
                          <div className="space-y-2 ml-7">
                            <div className="flex items-center gap-2 bg-zinc-900 text-zinc-100 rounded-lg p-2 sm:p-3 font-mono text-xs sm:text-sm overflow-hidden">
                              <Terminal className="h-3 w-3 sm:h-4 sm:w-4 text-zinc-400 shrink-0" />
                              <code className="flex-1 overflow-x-auto whitespace-nowrap">code --install-extension taskos-0.1.1.vsix</code>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-zinc-400 hover:text-white hover:bg-zinc-800 shrink-0 h-7 w-7 p-0"
                                onClick={() => copyToClipboard("code --install-extension taskos-0.1.1.vsix", "vscode")}
                              >
                                {copied === "vscode" ? <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" /> : <Copy className="h-3 w-3 sm:h-4 sm:w-4" />}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: API Key */}
            <div className="relative pl-8 sm:pl-10 pb-6 sm:pb-8 border-l-2 border-indigo-200 dark:border-indigo-800 ml-3 sm:ml-4">
              <div className="absolute -left-4 sm:-left-5 top-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm sm:text-lg">
                2
              </div>
              <div className="bg-muted/50 rounded-xl p-4 sm:p-5">
                <h4 className="font-semibold text-base sm:text-lg mb-2 flex items-center gap-2">
                  <Key className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
                  Create an API Key
                </h4>
                <p className="text-sm text-muted-foreground mb-3 sm:mb-4">
                  You need an API key to connect the extension to your TaskOS account:
                </p>
                <ol className="space-y-2 text-xs sm:text-sm mb-3 sm:mb-4">
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-600 font-bold shrink-0">1.</span>
                    <span>Go to <strong>Account Settings</strong> → <strong>API Keys</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-600 font-bold shrink-0">2.</span>
                    <span>Click <strong>&quot;Create Key&quot;</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-600 font-bold shrink-0">3.</span>
                    <span>Copy the key — <strong>save it somewhere safe!</strong> You won&apos;t be able to see it again.</span>
                  </li>
                </ol>
                <Button variant="outline" asChild className="gap-2 w-full sm:w-auto">
                  <a href={`/${locale}/app/account`}>
                    <Key className="h-4 w-4" />
                    Go to Account Settings
                  </a>
                </Button>
              </div>
            </div>

            {/* Step 3: Configure */}
            <div className="relative pl-8 sm:pl-10 pb-6 sm:pb-8 border-l-2 border-indigo-200 dark:border-indigo-800 ml-3 sm:ml-4">
              <div className="absolute -left-4 sm:-left-5 top-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm sm:text-lg">
                3
              </div>
              <div className="bg-muted/50 rounded-xl p-4 sm:p-5">
                <h4 className="font-semibold text-base sm:text-lg mb-2 flex items-center gap-2">
                  <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
                  Configure the Extension
                </h4>
                <p className="text-sm text-muted-foreground mb-3 sm:mb-4">
                  Open Settings (<kbd className="px-1.5 py-0.5 bg-background rounded border text-xs">Ctrl+,</kbd>) and search for <strong>&quot;TaskOS&quot;</strong>, then fill in the following:
                </p>
                
                <div className="space-y-2 sm:space-y-3">
                  {/* API Key */}
                  <div className="bg-background rounded-lg p-3 sm:p-4 border">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 mb-1 sm:mb-2">
                      <span className="font-mono text-xs sm:text-sm font-medium">taskos.apiKey</span>
                      <Badge variant="secondary" className="w-fit text-xs">Required</Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Paste the API key you created in Step 2</p>
                  </div>

                  {/* API URL */}
                  <div className="bg-background rounded-lg p-3 sm:p-4 border">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 mb-1 sm:mb-2">
                      <span className="font-mono text-xs sm:text-sm font-medium">taskos.apiUrl</span>
                      <Badge variant="secondary" className="w-fit text-xs">Required</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <code className="flex-1 text-xs sm:text-sm bg-zinc-900 text-green-400 px-2 sm:px-3 py-1.5 sm:py-2 rounded font-mono overflow-x-auto">https://www.task-os.app/api/v1</code>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="shrink-0 h-7 w-7 sm:h-8 sm:w-8 p-0"
                        onClick={() => copyToClipboard("https://www.task-os.app/api/v1", "apiUrl")}
                      >
                        {copied === "apiUrl" ? <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" /> : <Copy className="h-3 w-3 sm:h-4 sm:w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Workspace ID */}
                  <div className="bg-background rounded-lg p-3 sm:p-4 border">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 mb-1 sm:mb-2">
                      <span className="font-mono text-xs sm:text-sm font-medium">taskos.defaultWorkspaceId</span>
                      <Badge variant="secondary" className="w-fit text-xs">Required</Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                      Find your workspace ID in the URL when you&apos;re inside a workspace:
                    </p>
                    <div className="bg-muted rounded p-2 text-xs font-mono overflow-x-auto">
                      <span className="text-muted-foreground">task-os.app/en/app/</span>
                      <span className="text-indigo-600 font-bold">your-workspace-id</span>
                      <span className="text-muted-foreground">/dashboard</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4: Done */}
            <div className="relative pl-8 sm:pl-10 ml-3 sm:ml-4">
              <div className="absolute -left-4 sm:-left-5 top-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-500 text-white flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 sm:h-6 sm:w-6" />
              </div>
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-4 sm:p-5">
                <h4 className="font-semibold text-base sm:text-lg mb-2 text-green-700 dark:text-green-400 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                  You&apos;re All Set!
                </h4>
                <p className="text-sm text-muted-foreground mb-3 sm:mb-4">
                  Look for the <strong>TaskOS icon</strong> in your Activity Bar (left sidebar). You can now:
                </p>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Eye className="h-3 w-3" /> View & manage tasks
                  </Badge>
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Sparkles className="h-3 w-3" /> Run AI Pipeline
                  </Badge>
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Settings className="h-3 w-3" /> Configure profiles
                  </Badge>
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Zap className="h-3 w-3" /> Ctrl+Shift+P for commands
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Pipeline - What It Does */}
        <Card className="mb-6 sm:mb-8 border-indigo-200 dark:border-indigo-800">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
              <Workflow className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600" />
              AI Agent Pipeline
            </CardTitle>
            <CardDescription className="text-sm">
              One click from task to production-ready PR — with tests, code review, and autofix built in
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            {/* Pipeline Steps Visual */}
            <div className="flex flex-col gap-3 mb-6">
              {[
                { icon: <FileCode className="h-4 w-4" />, step: "Plan", desc: "AI analyzes the task and plans the implementation", color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" },
                { icon: <Code2 className="h-4 w-4" />, step: "Implement", desc: "Generates code following your Code Style Profile", color: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300" },
                { icon: <TestTube className="h-4 w-4" />, step: "Test", desc: "Automatically runs tests and validates results", color: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300" },
                { icon: <ShieldCheck className="h-4 w-4" />, step: "Review", desc: "Self code review based on your Review Profile", color: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300" },
                { icon: <Zap className="h-4 w-4" />, step: "Autofix", desc: "Automatically fixes blockers found in review", color: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300" },
                { icon: <GitPullRequest className="h-4 w-4" />, step: "Open PR", desc: "Creates a detailed PR with review & test results", color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`shrink-0 w-8 h-8 rounded-lg ${item.color} flex items-center justify-center`}>
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{item.step}</span>
                      {i < 5 && <ArrowRight className="h-3 w-3 text-muted-foreground hidden sm:block" />}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Key Features */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-muted/50 rounded-lg p-3 sm:p-4 border">
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
                  <Layers className="h-4 w-4 text-indigo-600" />
                  Custom Profiles
                </h4>
                <p className="text-xs text-muted-foreground">
                  Define <strong>Code Style</strong> and <strong>Code Review</strong> profiles to enforce your team&apos;s standards. Set naming conventions, design patterns, testing policies, and review severity levels.
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 sm:p-4 border">
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
                  <TestTube className="h-4 w-4 text-yellow-600" />
                  Automatic Testing
                </h4>
                <p className="text-xs text-muted-foreground">
                  Tests run automatically when required by your profile. Missing or failing tests trigger autofix attempts, and results are included in the PR description.
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 sm:p-4 border">
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
                  <ShieldCheck className="h-4 w-4 text-purple-600" />
                  Self Code Review
                </h4>
                <p className="text-xs text-muted-foreground">
                  Every PR gets an AI code review — checking security, performance, best practices, and more. Findings include file, line range, severity, and suggested fixes.
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 sm:p-4 border">
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
                  <GitPullRequest className="h-4 w-4 text-green-600" />
                  Rich PR Output
                </h4>
                <p className="text-xs text-muted-foreground">
                  Generated PRs include structured summaries, profile-matching checklists, full code review findings, and test execution results — ready for human approval.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* How to Use */}
        <Card className="mb-6 sm:mb-8">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
              <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" />
              How to Use
            </CardTitle>
            <CardDescription className="text-sm">
              Quick guide for the main features of the extension
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-4 sm:px-6">
            {/* Run Pipeline */}
            <div className="bg-muted/50 rounded-xl p-4 sm:p-5 border">
              <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
                <Workflow className="h-4 w-4 text-indigo-600" />
                Run the AI Pipeline
              </h4>
              <ol className="space-y-2 text-xs sm:text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 font-bold shrink-0">1.</span>
                  <span>Click the <strong>TaskOS icon</strong> in the sidebar to open the panel</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 font-bold shrink-0">2.</span>
                  <span>Select a task from your workspace</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 font-bold shrink-0">3.</span>
                  <span>Click <strong>&quot;Run Pipeline & Create PR&quot;</strong> — the agent will implement, test, review, and open a PR</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 font-bold shrink-0">4.</span>
                  <span>Or use <strong>&quot;Quick PR&quot;</strong> for a simpler code-and-commit flow without the full pipeline</span>
                </li>
              </ol>
              <div className="mt-3 flex items-center gap-2 bg-background rounded-lg p-2 sm:p-3 font-mono text-xs sm:text-sm border overflow-hidden">
                <Terminal className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                <code className="flex-1 overflow-x-auto whitespace-nowrap">Ctrl+Shift+P → &quot;TaskOS: Run Pipeline & Create PR&quot;</code>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="shrink-0 h-7 w-7 p-0"
                  onClick={() => copyToClipboard("TaskOS: Run Pipeline & Create PR", "pipeline-cmd")}
                >
                  {copied === "pipeline-cmd" ? <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" /> : <Copy className="h-3 w-3 sm:h-4 sm:w-4" />}
                </Button>
              </div>
            </div>

            {/* Configure Profiles */}
            <div className="bg-muted/50 rounded-xl p-4 sm:p-5 border">
              <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
                <Settings className="h-4 w-4 text-indigo-600" />
                Configure Profiles
              </h4>
              <ol className="space-y-2 text-xs sm:text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 font-bold shrink-0">1.</span>
                  <span>Click <strong>&quot;Profiles&quot;</strong> in the TaskOS panel, or press <kbd className="px-1.5 py-0.5 bg-background rounded border text-xs font-mono">Ctrl+Shift+P</kbd> → <code className="px-1.5 py-0.5 bg-background rounded text-xs">TaskOS: Configure Profiles</code></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 font-bold shrink-0">2.</span>
                  <span>Choose between <strong>Code Review Profile</strong> (what to check) and <strong>Code Style Profile</strong> (how to write code)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 font-bold shrink-0">3.</span>
                  <span>Start with a preset (<strong>Default</strong> or <strong>Strict</strong>) and customize to match your team&apos;s standards</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 font-bold shrink-0">4.</span>
                  <span>Set your active profiles in VS Code Settings → search <code className="px-1.5 py-0.5 bg-background rounded text-xs">taskos</code></span>
                </li>
              </ol>
            </div>

            {/* Available Commands */}
            <div className="bg-muted/50 rounded-xl p-4 sm:p-5 border">
              <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
                <Terminal className="h-4 w-4 text-indigo-600" />
                All Commands (<kbd className="px-1.5 py-0.5 bg-background rounded border text-xs font-mono">Ctrl+Shift+P</kbd>)
              </h4>
              <div className="space-y-2">
                {[
                  { cmd: "TaskOS: Run Pipeline & Create PR", desc: "Full pipeline: implement → test → review → PR" },
                  { cmd: "TaskOS: Configure Profiles", desc: "Open the profiles editor panel" },
                  { cmd: "TaskOS: Refresh Tasks", desc: "Manually refresh the task list" },
                  { cmd: "TaskOS: Quick Generate Code", desc: "Generate code for a task without full pipeline" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 bg-background rounded-lg p-2 sm:p-3 border text-xs sm:text-sm overflow-hidden">
                    <code className="flex-1 font-mono text-indigo-600 dark:text-indigo-400 overflow-x-auto whitespace-nowrap">{item.cmd}</code>
                    <span className="text-muted-foreground hidden sm:block shrink-0 text-xs">— {item.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Troubleshooting */}
        <Card className="mb-6 sm:mb-8">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <HelpCircle className="h-4 w-4 sm:h-5 sm:w-5" />
              Troubleshooting
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
            <div className="border rounded-lg p-3 sm:p-4">
              <h4 className="font-medium text-sm sm:text-base mb-1 sm:mb-2">Extension not showing?</h4>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Press <kbd className="px-1.5 py-0.5 bg-muted rounded border text-xs">Ctrl+Shift+P</kbd> → type <code className="px-1 bg-muted rounded text-xs">Reload Window</code> and press Enter.
              </p>
            </div>
            <div className="border rounded-lg p-3 sm:p-4">
              <h4 className="font-medium text-sm sm:text-base mb-1 sm:mb-2">Can&apos;t find TaskOS in the Marketplace?</h4>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Try searching for <code className="px-1 bg-muted rounded text-xs">YardenSamorai.taskos</code> or use the <a href={MARKETPLACE_URL} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">direct link</a>.
              </p>
            </div>
            <div className="border rounded-lg p-3 sm:p-4">
              <h4 className="font-medium text-sm sm:text-base mb-1 sm:mb-2">&quot;Invalid API key&quot; error?</h4>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Make sure you copied the full key. It starts with <code className="px-1 bg-muted rounded text-xs">tko_</code>
              </p>
            </div>
            <div className="border rounded-lg p-3 sm:p-4">
              <h4 className="font-medium text-sm sm:text-base mb-1 sm:mb-2">No tasks showing?</h4>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Check that your <code className="px-1 bg-muted rounded text-xs">defaultWorkspaceId</code> matches the ID in your browser URL.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Coming Soon */}
        <Card className="opacity-60">
          <CardHeader className="px-4 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-muted">
                  <Code2 className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg">JetBrains IDEs</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">IntelliJ, WebStorm, PyCharm</CardDescription>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
            </div>
          </CardHeader>
        </Card>
      </div>
  );
}
