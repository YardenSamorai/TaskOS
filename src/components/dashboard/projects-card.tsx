"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Building2, Plus, ChevronDown, Users, ListTodo, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    "bg-gradient-to-br from-violet-500 to-purple-600",
    "bg-gradient-to-br from-emerald-500 to-teal-600",
    "bg-gradient-to-br from-blue-500 to-indigo-600",
    "bg-gradient-to-br from-pink-500 to-rose-600",
    "bg-gradient-to-br from-amber-500 to-orange-600",
    "bg-gradient-to-br from-cyan-500 to-blue-600",
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
        if (result.success && result.workspaces) {
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
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-base sm:text-lg">
            <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
            Projects
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground gap-1 h-7 sm:h-8 text-xs sm:text-sm px-2 sm:px-3">
                {sortBy === "recents" ? "Recents" : "Name"}
                <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
      <CardContent className="space-y-1.5 sm:space-y-2 px-3 sm:px-6 pb-3 sm:pb-6">
        {/* Create new project button */}
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 sm:gap-3 text-muted-foreground hover:text-foreground h-10 sm:h-12 text-sm"
          onClick={onCreateWorkspace}
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: "var(--accent-color)" }} />
          </div>
          <span className="truncate">Create new project</span>
        </Button>

        {/* Workspace list */}
        {loading ? (
          <div className="space-y-1.5 sm:space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-12 sm:h-14 bg-muted rounded-lg sm:rounded-xl animate-pulse" />
            ))}
          </div>
        ) : workspaces.length === 0 ? (
          <div className="text-center py-3 sm:py-4 text-muted-foreground text-xs sm:text-sm">
            No projects yet. Create your first one!
          </div>
        ) : (
          sortedWorkspaces.map((workspace) => {
            const isSelected = workspace.id === currentWorkspaceId;
            return (
              <Link
                key={workspace.id}
                href={`/${locale}/app/${workspace.id}/dashboard`}
                className={cn(
                  "flex items-center justify-between p-2.5 sm:p-3 rounded-lg sm:rounded-xl transition-all border-2 gap-2",
                  isSelected 
                    ? "bg-primary/10 border-primary/30 shadow-sm" 
                    : "bg-muted/30 hover:bg-muted/50 border-transparent hover:border-muted"
                )}
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  {/* Workspace Icon */}
                  <div className={cn(
                    "w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-white font-bold text-xs sm:text-sm relative shrink-0",
                    getColorFromString(workspace.name)
                  )}>
                    {workspace.name.charAt(0).toUpperCase()}
                    {isSelected && (
                      <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-primary flex items-center justify-center shadow-sm">
                        <Check className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-white" />
                      </div>
                    )}
                  </div>
                  
                  {/* Workspace Name */}
                  <div className="min-w-0">
                    <p className={cn(
                      "font-medium text-sm sm:text-base truncate",
                      isSelected ? "text-primary" : "text-foreground"
                    )}>
                      {workspace.name}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                      {isSelected ? "Current" : workspace.role}
                    </p>
                  </div>
                </div>

                {/* Right side icons - hidden on small screens */}
                {!isSelected && (
                  <div className="hidden sm:flex items-center gap-3 text-muted-foreground shrink-0">
                    <ListTodo className="w-4 h-4" />
                    <Users className="w-4 h-4" />
                  </div>
                )}
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};
