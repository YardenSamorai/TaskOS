"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  ExternalLink, 
  Code2, 
  Zap, 
  RefreshCw, 
  Settings,
  CheckCircle2,
  Copy,
  Terminal
} from "lucide-react";
import { toast } from "sonner";

export default function ExtensionsPage() {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <AppShell>
      <div className="container max-w-4xl py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
              <Code2 className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">IDE Extensions</h1>
              <p className="text-muted-foreground">
                Manage your tasks directly from your favorite code editor
              </p>
            </div>
          </div>
        </div>

        {/* VS Code Extension Card */}
        <Card className="mb-8 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <svg viewBox="0 0 24 24" className="h-10 w-10" fill="currentColor">
                    <path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12 .326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a.999.999 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352zm-5.146 14.861L10.826 12l7.178-5.448v10.896z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold">TaskOS for VS Code / Cursor</h2>
                  <p className="text-white/80">Version 0.1.0</p>
                </div>
              </div>
              <Badge className="bg-white/20 text-white hover:bg-white/30">
                Pro Feature
              </Badge>
            </div>
          </div>
          
          <CardContent className="p-6">
            {/* Features */}
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                <Zap className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <h3 className="font-semibold">Quick Task Management</h3>
                  <p className="text-sm text-muted-foreground">
                    View, create, and update tasks without leaving your editor
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                <RefreshCw className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <h3 className="font-semibold">Live Sync</h3>
                  <p className="text-sm text-muted-foreground">
                    Auto-refresh keeps your tasks in sync with the web app
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                <Code2 className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <h3 className="font-semibold">AI Code Generation</h3>
                  <p className="text-sm text-muted-foreground">
                    Generate code snippets based on your task descriptions
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                <Settings className="h-5 w-5 text-purple-500 mt-0.5" />
                <div>
                  <h3 className="font-semibold">Full Integration</h3>
                  <p className="text-sm text-muted-foreground">
                    Access your workspace, projects, and team tasks
                  </p>
                </div>
              </div>
            </div>

            {/* Installation Steps */}
            <div className="space-y-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Download className="h-5 w-5" />
                Installation Guide
              </h3>

              {/* Step 1 */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    1
                  </div>
                  <h4 className="font-semibold">Download the Extension</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Download the latest .vsix file from our releases:
                </p>
                <Button asChild className="gap-2">
                  <a 
                    href="https://github.com/YardenSamorai/TaskOS/releases/latest/download/taskos-0.1.0.vsix"
                    download
                  >
                    <Download className="h-4 w-4" />
                    Download taskos-0.1.0.vsix
                  </a>
                </Button>
              </div>

              {/* Step 2 */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    2
                  </div>
                  <h4 className="font-semibold">Install in VS Code / Cursor</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Open VS Code or Cursor and install the extension using one of these methods:
                </p>
                
                <div className="space-y-4">
                  <div className="bg-muted rounded-lg p-4">
                    <p className="text-sm font-medium mb-2">Option A: Via Command Palette</p>
                    <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Press <kbd className="px-2 py-0.5 bg-background rounded border text-xs">Ctrl+Shift+P</kbd> (or <kbd className="px-2 py-0.5 bg-background rounded border text-xs">Cmd+Shift+P</kbd> on Mac)</li>
                      <li>Type &quot;Install from VSIX&quot; and select it</li>
                      <li>Navigate to the downloaded .vsix file</li>
                      <li>Click &quot;Install&quot;</li>
                    </ol>
                  </div>

                  <div className="bg-muted rounded-lg p-4">
                    <p className="text-sm font-medium mb-2">Option B: Via Terminal</p>
                    <div className="flex items-center gap-2 bg-background rounded border p-3 font-mono text-sm">
                      <Terminal className="h-4 w-4 text-muted-foreground" />
                      <code className="flex-1">code --install-extension taskos-0.1.0.vsix</code>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => copyToClipboard("code --install-extension taskos-0.1.0.vsix", "terminal")}
                      >
                        {copied === "terminal" ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      For Cursor, use <code className="bg-background px-1 rounded">cursor</code> instead of <code className="bg-background px-1 rounded">code</code>
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    3
                  </div>
                  <h4 className="font-semibold">Get Your API Key</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Go to Account Settings → Security → API Keys and create a new API key.
                </p>
                <Button variant="outline" asChild className="gap-2">
                  <a href="/en/app/account">
                    <Settings className="h-4 w-4" />
                    Go to Account Settings
                  </a>
                </Button>
              </div>

              {/* Step 4 */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    4
                  </div>
                  <h4 className="font-semibold">Configure the Extension</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Open VS Code Settings (<kbd className="px-2 py-0.5 bg-muted rounded border text-xs">Ctrl+,</kbd>) and search for &quot;TaskOS&quot;:
                </p>
                <div className="space-y-3 bg-muted rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">taskos.apiKey</span>
                    <span className="text-xs text-muted-foreground">Your API key from Step 3</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">taskos.apiUrl</span>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-background px-2 py-1 rounded">https://www.task-os.app/api/v1</code>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => copyToClipboard("https://www.task-os.app/api/v1", "apiUrl")}
                      >
                        {copied === "apiUrl" ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">taskos.defaultWorkspaceId</span>
                    <span className="text-xs text-muted-foreground">Your workspace ID from the URL</span>
                  </div>
                </div>
              </div>

              {/* Step 5 */}
              <div className="border rounded-lg p-4 bg-green-500/5 border-green-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <h4 className="font-semibold text-green-700 dark:text-green-400">You&apos;re All Set!</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Click the TaskOS icon in the Activity Bar (left sidebar) to view your tasks.
                  Press <kbd className="px-2 py-0.5 bg-background rounded border text-xs">Ctrl+Shift+P</kbd> and type &quot;TaskOS&quot; to see all available commands.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Coming Soon */}
        <Card className="opacity-60">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
                    <path d="M13.144 8.171c-.035-.066.342-.102.409-.102.074.009-.196.452-.409.102zm-2.152-3.072l.108-.031c.064.055-.072.095-.051.136.086.155.021.248.008.332-.014.085-.104.048-.149.093-.053.066.258.075.262.085.011.033-.375.089-.304.171.096.136.824-.195.708-.176.225-.113.029-.125-.097-.19-.043-.215-.079-.547-.213-.68l.088-.102c-.206-.299-.36.098-.381-.025-.009-.135-.277-.105-.406-.127-.226-.076-.235.131-.258.085-.029-.063.017-.21.017-.21l.108.031c.047-.084-.267-.145-.267-.145s-.012.086-.025.122c-.056.153-.12.318-.208.485-.257-.12-.516-.245-.774-.374a1.293 1.293 0 0 0-.263-.041.549.549 0 0 0-.106.013 1.066 1.066 0 0 0-.167.053c-.145.061-.28.16-.364.275-.052.076-.075.12-.062.196.017.149.017.342.034.472.037.267.138.587.262.763.088.125.186.184.3.217.254.073.556.036.764-.144.203-.174.321-.427.321-.427l.028-.105c.028-.005.048-.012.073-.015l.121.033c.106-.02.175-.119.242-.154-.175-.134-.238-.309-.355-.448-.059-.067-.074-.145-.057-.221.011-.052.027-.106.059-.157.046-.072.107-.138.174-.18.089-.055.167-.076.262-.076.1 0 .2.025.298.072-.014-.022-.037-.064-.073-.113-.039-.052-.067-.088-.024-.122.072-.056.198-.122.346-.163.155-.035.293-.024.393.02a.467.467 0 0 1 .168.129c.071-.036.107-.104.189-.125.044-.011.164-.066.193-.02.026.047.072.135.11.213-.013-.009-.039-.027-.06-.034l-.071-.042c-.019-.014-.077-.016-.077-.016l.042.055c.052.045.042.095.045.138a.417.417 0 0 1-.018.107c-.02.059-.069.108-.11.16l.075-.003c.033-.004.046.005.063.012.088.035.157.119.213.197.062-.074.121-.15.168-.233.12-.217.134-.378.102-.517-.054-.214-.248-.316-.409-.316-.124 0-.207.025-.293.091-.053.043-.12.115-.168.206l.055-.031c-.011.037-.076.1-.057.139.019.038.077.045.1.096.027.06.003.127-.017.181-.019.048-.071.089-.091.126-.039.072.005.117.035.166.062.093.066.132.032.236l-.058-.014-.051.044.039.031.044.015.052-.037.025-.031c.009-.01.02-.017.026-.035-.011-.009-.015-.019-.022-.027l.016-.037c.017-.011.028-.011.038-.024.025-.035.046-.077.047-.12.001-.043-.013-.088-.027-.127-.012-.031-.032-.053-.053-.078-.019-.023-.04-.047-.072-.057l.027-.019c.024-.01.037-.014.059-.027.026-.016.061-.029.086-.056.071-.077.043-.14.038-.202a.256.256 0 0 0-.049-.136c-.027-.04-.062-.076-.101-.109a.475.475 0 0 0-.075-.053l.024-.014c.015-.016.013-.046 0-.057-.015-.011-.052-.023-.052-.023l.037-.037c.025-.021.055-.039.094-.043.058-.007.092.041.125.07.034.028.062.063.083.1.029.05.039.108.039.168 0 .056-.011.11-.036.164-.025.053-.062.1-.108.142-.051.046-.107.079-.176.094.013-.051.025-.092.047-.131.019-.035.043-.066.073-.091a.318.318 0 0 1 .107-.063c.039-.01.082-.011.118-.001a.286.286 0 0 1 .108.053c.031.027.054.059.069.096.016.037.022.078.018.118a.265.265 0 0 1-.041.117c-.024.037-.057.068-.096.093-.039.024-.084.04-.133.046-.051.006-.103 0-.154-.014a.43.43 0 0 1-.142-.068l.031-.023c.048-.04.096-.082.142-.127a.83.83 0 0 0 .11-.135.386.386 0 0 0 .055-.137.239.239 0 0 0-.015-.134.221.221 0 0 0-.078-.094.247.247 0 0 0-.112-.044.315.315 0 0 0-.126.012c-.044.015-.084.039-.119.07-.034.031-.063.069-.085.111a.34.34 0 0 0-.047.14c-.004.051.003.103.021.152.018.049.046.095.083.134.037.039.082.071.133.095l-.023.026a.515.515 0 0 1-.134-.077.423.423 0 0 1-.099-.117.343.343 0 0 1-.051-.146.296.296 0 0 1 .016-.152c.018-.049.046-.094.083-.132a.406.406 0 0 1 .133-.093.476.476 0 0 1 .163-.039c.058-.002.116.009.169.033a.384.384 0 0 1 .134.101c.036.044.063.095.079.15a.36.36 0 0 1 .011.165.417.417 0 0 1-.059.153.525.525 0 0 1-.114.131c-.047.04-.1.076-.158.106l.042.032c.029.019.055.045.078.073.022.029.041.061.054.096.013.035.02.073.019.111a.291.291 0 0 1-.035.123.345.345 0 0 1-.083.101.44.44 0 0 1-.121.069.54.54 0 0 1-.145.029.613.613 0 0 1-.156-.015.648.648 0 0 1-.151-.058l.023-.015z"/>
                  </svg>
                </div>
                <div>
                  <CardTitle className="text-lg">JetBrains IDEs</CardTitle>
                  <CardDescription>IntelliJ, WebStorm, PyCharm, etc.</CardDescription>
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
