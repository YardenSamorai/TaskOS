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
  Store
} from "lucide-react";
import { toast } from "sonner";

const MARKETPLACE_URL = "https://marketplace.visualstudio.com/items?itemName=YardenSamorai.taskos";
const VSIX_DOWNLOAD_URL = "https://github.com/YardenSamorai/TaskOS/releases/latest/download/taskos-0.1.0.vsix";

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
              <Badge className="bg-green-500/80 text-white border-0 text-xs">v0.1.0</Badge>
              <Badge className="bg-blue-500/80 text-white border-0 text-xs">Available on Marketplace</Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-3">
              TaskOS for VS Code & Cursor
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-white/90 mb-5 sm:mb-6 max-w-2xl">
              Manage your tasks, view progress, and stay productive — all without leaving your code editor.
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
          <Card className="border-0 shadow-md bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20">
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <Eye className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h3 className="font-semibold text-sm sm:text-base mb-1">View Tasks</h3>
              <p className="text-xs text-muted-foreground hidden sm:block">See all your tasks in the sidebar</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 rounded-xl bg-green-500/20 flex items-center justify-center">
                <RefreshCw className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold text-sm sm:text-base mb-1">Live Sync</h3>
              <p className="text-xs text-muted-foreground hidden sm:block">Auto-updates every 15 seconds</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <ListTodo className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-sm sm:text-base mb-1">Manage Tasks</h3>
              <p className="text-xs text-muted-foreground hidden sm:block">Create, edit, update status</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold text-sm sm:text-base mb-1">AI Powered</h3>
              <p className="text-xs text-muted-foreground hidden sm:block">Generate code from tasks</p>
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
                            <span className="truncate">Download taskos-0.1.0.vsix</span>
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
                              <code className="flex-1 overflow-x-auto whitespace-nowrap">code --install-extension taskos-0.1.0.vsix</code>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-zinc-400 hover:text-white hover:bg-zinc-800 shrink-0 h-7 w-7 p-0"
                                onClick={() => copyToClipboard("code --install-extension taskos-0.1.0.vsix", "vscode")}
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
                    <Eye className="h-3 w-3" /> View tasks
                  </Badge>
                  <Badge variant="outline" className="gap-1 text-xs">
                    <RefreshCw className="h-3 w-3" /> Auto-sync
                  </Badge>
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Sparkles className="h-3 w-3" /> AI code generation
                  </Badge>
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Zap className="h-3 w-3" /> Ctrl+Shift+P for commands
                  </Badge>
                </div>
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
