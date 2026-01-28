"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Building2, Plus, ChevronDown, Users, ListTodo, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getUserWorkspaces } from "@/lib/actions/workspace";
import { cn } from "@/lib/utils";

interface Workspace {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  role: string;
}

interface ProjectsCardProps {
  locale: string;
  currentWorkspaceId?: string;
  onCreateWorkspace?: () => void;
}

// Generate consistent color from string
const getColorFromString = (str: string) => {
  const colors = [
    "from-primary/80 to-primary",
    "from-emerald-500 to-teal-600",
    "from-blue-500 to-indigo-600",
    "from-purple-500 to-violet-600",
    "from-pink-500 to-rose-600",
    "from-cyan-500 to-blue-600",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const ProjectsCard = ({ locale, currentWorkspaceId, onCreateWorkspace }: ProjectsCardProps) => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"recents" | "name">("recents");

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const result = await getUserWorkspaces();
        if (result.success) {
          setWorkspaces(result.workspaces as Workspace[]);
        }
      } catch (error) {
        console.error("Error fetching workspaces:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchWorkspaces();
  }, []);

  const sortedWorkspaces = [...workspaces].sort((a, b) => {
    if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    }
    return 0;
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="w-5 h-5 text-muted-foreground" />
            Projects
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground gap-1">
                {sortBy === "recents" ? "Recents" : "Name"}
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortBy("recents")}>
                Recents
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("name")}>
                Name
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Create new project button */}
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground h-12"
          onClick={onCreateWorkspace}
        >
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
            <Plus className="w-4 h-4" style={{ color: "var(--accent-color)" }} />
          </div>
          Create new project
        </Button>

        {/* Workspace list */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          sortedWorkspaces.slice(0, 5).map((workspace) => {
            const isSelected = workspace.id === currentWorkspaceId;
            return (
              <Link
                key={workspace.id}
                href={`/${locale}/app/${workspace.id}/dashboard`}
                className={cn(
                  "flex items-center justify-between p-3 rounded-xl transition-all",
                  isSelected 
                    ? "bg-primary/10 border-2 border-primary/30 shadow-sm" 
                    : "hover:bg-muted/50 border-2 border-transparent"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-white font-semibold text-sm relative",
                    getColorFromString(workspace.name)
                  )}>
                    {workspace.imageUrl ? (
                      <img src={workspace.imageUrl} alt="" className="w-full h-full rounded-lg object-cover" />
                    ) : (
                      workspace.name.charAt(0).toUpperCase()
                    )}
                    {isSelected && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </div>
                  <div>
                    <span className={cn(
                      "font-medium block",
                      isSelected && "text-primary"
                    )}>
                      {workspace.name}
                    </span>
                    {isSelected && (
                      <span className="text-xs text-primary/70">Current</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!isSelected && (
                    <div className="flex items-center gap-4 text-muted-foreground text-sm">
                      <span className="flex items-center gap-1">
                        <ListTodo className="w-4 h-4" />
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};
