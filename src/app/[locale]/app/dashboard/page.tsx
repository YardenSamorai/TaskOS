"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { 
  Loader2, 
  Sparkles, 
  FolderPlus, 
  Rocket,
  CheckCircle2,
  Users,
  ListTodo,
  Calendar,
  Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CreateWorkspaceDialog } from "@/components/workspaces/create-workspace-dialog";
import { getUserWorkspaces } from "@/lib/actions/workspace";

const GlobalDashboardPage = () => {
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;

  const [loading, setLoading] = useState(true);
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);
  const [greeting, setGreeting] = useState("Hello");

  // Fetch workspaces on mount and redirect to first workspace
  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const result = await getUserWorkspaces();
        if (result.success && result.workspaces) {
          // If user has workspaces, redirect to the first one
          if (result.workspaces.length > 0) {
            const firstWorkspace = result.workspaces[0];
            router.replace(`/${locale}/app/${firstWorkspace.id}/dashboard`);
            return;
          }
        }
      } catch (error) {
        console.error("Error fetching workspaces:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchWorkspaces();
  }, [locale, router]);

  useEffect(() => {
    // Set greeting based on time of day
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting("Good Morning");
    } else if (hour < 18) {
      setGreeting("Good Afternoon");
    } else {
      setGreeting("Good Evening");
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your workspaces...</p>
        </div>
      </div>
    );
  }

  // This page only shows when user has NO workspaces (onboarding)
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Welcome Header */}
        <div className="space-y-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center mx-auto shadow-xl">
            <Rocket className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold">
            {greeting}! 👋
          </h1>
          <p className="text-xl text-muted-foreground">
            Welcome to TaskOS. Let&apos;s create your first workspace to get started.
          </p>
        </div>

        {/* Features */}
        <div className="grid sm:grid-cols-2 gap-4 text-left">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <ListTodo className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Manage Tasks</h3>
                  <p className="text-sm text-muted-foreground">Create, organize, and track your tasks with ease</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Users className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Collaborate</h3>
                  <p className="text-sm text-muted-foreground">Work together with your team in real-time</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-violet-500/10">
                  <Calendar className="w-5 h-5 text-violet-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Stay Organized</h3>
                  <p className="text-sm text-muted-foreground">Calendar view, deadlines, and reminders</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Target className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Focus Mode</h3>
                  <p className="text-sm text-muted-foreground">Pomodoro timer and distraction-free work</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <div className="space-y-4">
          <Button 
            size="lg" 
            className="gap-2 text-lg px-8 h-14"
            onClick={() => setCreateWorkspaceOpen(true)}
          >
            <FolderPlus className="w-5 h-5" />
            Create Your First Workspace
          </Button>
          <p className="text-sm text-muted-foreground">
            A workspace is where you organize your projects and collaborate with your team
          </p>
        </div>
      </div>

      {/* Create Workspace Dialog */}
      <CreateWorkspaceDialog
        open={createWorkspaceOpen}
        onOpenChange={setCreateWorkspaceOpen}
        locale={locale}
      />
    </div>
  );
};

export default GlobalDashboardPage;
