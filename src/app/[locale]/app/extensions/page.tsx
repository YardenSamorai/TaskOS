"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Download, 
  ExternalLink, 
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
  FolderOpen,
  HelpCircle,
  ArrowRight,
  Github
} from "lucide-react";
import { toast } from "sonner";

export default function ExtensionsPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const params = useParams();
  const locale = params.locale as string || "en";

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <AppShell>
      <div className="container max-w-4xl py-8">
        {/* Hero Section */}
        <div className="relative mb-10 p-8 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnYyaDR2Mmgtdi00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <Badge className="bg-white/20 text-white border-0">Pro Feature</Badge>
              <Badge className="bg-green-500/80 text-white border-0">v0.1.0</Badge>
            </div>
            <h1 className="text-4xl font-bold mb-3">TaskOS for VS Code & Cursor</h1>
            <p className="text-xl text-white/90 mb-6 max-w-2xl">
              Manage your tasks, view progress, and stay productive — all without leaving your code editor.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button 
                size="lg" 
                className="bg-white text-indigo-600 hover:bg-white/90 gap-2 font-semibold"
                asChild
              >
                <a href="https://github.com/YardenSamorai/TaskOS/releases/latest/download/taskos-0.1.0.vsix">
                  <Download className="h-5 w-5" />
                  Download Extension
                </a>
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-white/30 text-white hover:bg-white/10 gap-2"
                asChild
              >
                <a href="https://github.com/YardenSamorai/TaskOS/releases" target="_blank" rel="noopener noreferrer">
                  <Github className="h-5 w-5" />
                  View on GitHub
                </a>
              </Button>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <Card className="border-0 shadow-md bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20">
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <Eye className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h3 className="font-semibold mb-1">View Tasks</h3>
              <p className="text-xs text-muted-foreground">See all your tasks in the sidebar</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-green-500/20 flex items-center justify-center">
                <RefreshCw className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold mb-1">Live Sync</h3>
              <p className="text-xs text-muted-foreground">Auto-updates every 15 seconds</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <ListTodo className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold mb-1">Manage Tasks</h3>
              <p className="text-xs text-muted-foreground">Create, edit, update status</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold mb-1">AI Powered</h3>
              <p className="text-xs text-muted-foreground">Generate code from tasks</p>
            </CardContent>
          </Card>
        </div>

        {/* Installation Guide */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Download className="h-6 w-6" />
              Installation Guide
            </CardTitle>
            <CardDescription>
              Follow these simple steps to get started in under 5 minutes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Step 1: Download */}
            <div className="relative pl-10 pb-8 border-l-2 border-indigo-200 dark:border-indigo-800 ml-4">
              <div className="absolute -left-5 top-0 w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-lg">
                1
              </div>
              <div className="bg-muted/50 rounded-xl p-5">
                <h4 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <Download className="h-5 w-5 text-indigo-600" />
                  Download the Extension
                </h4>
                <p className="text-muted-foreground mb-4">
                  Click the button below to download the .vsix file to your computer:
                </p>
                <Button asChild className="gap-2">
                  <a href="https://github.com/YardenSamorai/TaskOS/releases/latest/download/taskos-0.1.0.vsix">
                    <Download className="h-4 w-4" />
                    Download taskos-0.1.0.vsix (26 KB)
                  </a>
                </Button>
              </div>
            </div>

            {/* Step 2: Install */}
            <div className="relative pl-10 pb-8 border-l-2 border-indigo-200 dark:border-indigo-800 ml-4">
              <div className="absolute -left-5 top-0 w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-lg">
                2
              </div>
              <div className="bg-muted/50 rounded-xl p-5">
                <h4 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-indigo-600" />
                  Install in VS Code / Cursor
                </h4>
                
                <div className="space-y-4">
                  {/* Option A */}
                  <div className="bg-background rounded-lg p-4 border">
                    <p className="font-medium mb-3 flex items-center gap-2">
                      <span className="w-6 h-6 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 text-xs flex items-center justify-center font-bold">A</span>
                      Via Command Palette (Recommended)
                    </p>
                    <ol className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <span className="text-indigo-600 font-bold">1.</span>
                        <span>Press <kbd className="px-2 py-1 bg-muted rounded border text-xs font-mono">Ctrl+Shift+P</kbd> (Mac: <kbd className="px-2 py-1 bg-muted rounded border text-xs font-mono">Cmd+Shift+P</kbd>)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-indigo-600 font-bold">2.</span>
                        <span>Type <code className="px-2 py-0.5 bg-muted rounded text-xs">Extensions: Install from VSIX</code></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-indigo-600 font-bold">3.</span>
                        <span>Select the downloaded <code className="px-2 py-0.5 bg-muted rounded text-xs">taskos-0.1.0.vsix</code> file</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-indigo-600 font-bold">4.</span>
                        <span>Click <strong>&quot;Reload&quot;</strong> when prompted</span>
                      </li>
                    </ol>
                  </div>

                  {/* Option B */}
                  <div className="bg-background rounded-lg p-4 border">
                    <p className="font-medium mb-3 flex items-center gap-2">
                      <span className="w-6 h-6 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 text-xs flex items-center justify-center font-bold">B</span>
                      Via Terminal
                    </p>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">For VS Code:</p>
                      <div className="flex items-center gap-2 bg-zinc-900 text-zinc-100 rounded-lg p-3 font-mono text-sm">
                        <Terminal className="h-4 w-4 text-zinc-400" />
                        <code className="flex-1">code --install-extension ~/Downloads/taskos-0.1.0.vsix</code>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-zinc-400 hover:text-white hover:bg-zinc-800"
                          onClick={() => copyToClipboard("code --install-extension ~/Downloads/taskos-0.1.0.vsix", "vscode")}
                        >
                          {copied === "vscode" ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground mt-3">For Cursor:</p>
                      <div className="flex items-center gap-2 bg-zinc-900 text-zinc-100 rounded-lg p-3 font-mono text-sm">
                        <Terminal className="h-4 w-4 text-zinc-400" />
                        <code className="flex-1">cursor --install-extension ~/Downloads/taskos-0.1.0.vsix</code>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-zinc-400 hover:text-white hover:bg-zinc-800"
                          onClick={() => copyToClipboard("cursor --install-extension ~/Downloads/taskos-0.1.0.vsix", "cursor")}
                        >
                          {copied === "cursor" ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: API Key */}
            <div className="relative pl-10 pb-8 border-l-2 border-indigo-200 dark:border-indigo-800 ml-4">
              <div className="absolute -left-5 top-0 w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-lg">
                3
              </div>
              <div className="bg-muted/50 rounded-xl p-5">
                <h4 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <Key className="h-5 w-5 text-indigo-600" />
                  Create an API Key
                </h4>
                <p className="text-muted-foreground mb-4">
                  You need an API key to connect the extension to your TaskOS account:
                </p>
                <ol className="space-y-2 text-sm mb-4">
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-600 font-bold">1.</span>
                    <span>Go to <strong>Account Settings</strong> → <strong>Security</strong> → <strong>API Keys</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-600 font-bold">2.</span>
                    <span>Click <strong>&quot;Create Key&quot;</strong> and give it a name (e.g., &quot;VS Code&quot;)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-600 font-bold">3.</span>
                    <span>Copy the API key — <strong>you won&apos;t see it again!</strong></span>
                  </li>
                </ol>
                <Button variant="outline" asChild className="gap-2">
                  <a href={`/${locale}/app/account`}>
                    <Key className="h-4 w-4" />
                    Go to Account Settings
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>

            {/* Step 4: Configure */}
            <div className="relative pl-10 pb-8 border-l-2 border-indigo-200 dark:border-indigo-800 ml-4">
              <div className="absolute -left-5 top-0 w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-lg">
                4
              </div>
              <div className="bg-muted/50 rounded-xl p-5">
                <h4 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <Settings className="h-5 w-5 text-indigo-600" />
                  Configure the Extension
                </h4>
                <p className="text-muted-foreground mb-4">
                  Open VS Code/Cursor Settings (<kbd className="px-2 py-0.5 bg-background rounded border text-xs">Ctrl+,</kbd>) and search for <strong>&quot;TaskOS&quot;</strong>:
                </p>
                
                <div className="space-y-3">
                  {/* API Key */}
                  <div className="bg-background rounded-lg p-4 border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-sm font-medium">taskos.apiKey</span>
                      <Badge variant="secondary">Required</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Paste the API key you created in Step 3</p>
                  </div>

                  {/* API URL */}
                  <div className="bg-background rounded-lg p-4 border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-sm font-medium">taskos.apiUrl</span>
                      <Badge variant="secondary">Required</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <code className="flex-1 text-sm bg-zinc-900 text-green-400 px-3 py-2 rounded font-mono">https://www.task-os.app/api/v1</code>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => copyToClipboard("https://www.task-os.app/api/v1", "apiUrl")}
                      >
                        {copied === "apiUrl" ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Workspace ID */}
                  <div className="bg-background rounded-lg p-4 border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-sm font-medium">taskos.defaultWorkspaceId</span>
                      <Badge variant="secondary">Required</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Your workspace ID from the URL. For example:
                    </p>
                    <div className="bg-muted rounded p-2 text-xs font-mono">
                      https://www.task-os.app/en/app/<span className="text-indigo-600 font-bold">2839eba0-e2c7-42b1-aa4c-009d146be5ff</span>/dashboard
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 5: Done */}
            <div className="relative pl-10 ml-4">
              <div className="absolute -left-5 top-0 w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-5">
                <h4 className="font-semibold text-lg mb-2 text-green-700 dark:text-green-400 flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  You&apos;re All Set! 🎉
                </h4>
                <p className="text-muted-foreground mb-4">
                  Look for the <strong>TaskOS icon</strong> in your Activity Bar (left sidebar). Click it to see your tasks!
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="gap-1">
                    <Eye className="h-3 w-3" /> View tasks in sidebar
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <RefreshCw className="h-3 w-3" /> Auto-syncs every 15s
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Zap className="h-3 w-3" /> Ctrl+Shift+P → &quot;TaskOS&quot;
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Troubleshooting */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Troubleshooting
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-2">Extension not showing in sidebar?</h4>
              <p className="text-sm text-muted-foreground">
                Press <kbd className="px-2 py-0.5 bg-muted rounded border text-xs">Ctrl+Shift+P</kbd> → type <code className="px-1 bg-muted rounded text-xs">Developer: Reload Window</code> → press Enter.
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-2">&quot;Invalid API key&quot; error?</h4>
              <p className="text-sm text-muted-foreground">
                Make sure you copied the full API key without any spaces. API keys start with <code className="px-1 bg-muted rounded text-xs">tko_</code>.
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-2">No tasks showing?</h4>
              <p className="text-sm text-muted-foreground">
                Check that your <code className="px-1 bg-muted rounded text-xs">defaultWorkspaceId</code> is set correctly. It should be the UUID from your workspace URL.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Coming Soon */}
        <Card className="opacity-60">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Code2 className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg">JetBrains IDEs</CardTitle>
                  <CardDescription>IntelliJ, WebStorm, PyCharm, and more</CardDescription>
                </div>
              </div>
              <Badge variant="secondary">Coming Soon</Badge>
            </div>
          </CardHeader>
        </Card>
      </div>
    </AppShell>
  );
}
