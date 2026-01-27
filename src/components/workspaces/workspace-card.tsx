"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { 
  FolderKanban, 
  Users, 
  ChevronRight, 
  Crown, 
  Shield, 
  User, 
  Eye,
  MoreHorizontal,
  Pencil,
  Settings,
  Kanban,
  Calendar,
  ListTodo
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditWorkspaceDialog } from "./edit-workspace-dialog";
import { cn } from "@/lib/utils";
import type { Workspace, WorkspaceRole } from "@/lib/db/schema";

interface WorkspaceWithRole extends Workspace {
  role: WorkspaceRole;
  _count?: {
    members: number;
    tasks: number;
  };
}

interface WorkspaceCardProps {
  workspace: WorkspaceWithRole;
  locale: string;
}

const roleConfig: Record<WorkspaceRole, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  owner: { 
    icon: Crown, 
    color: "text-yellow-500", 
    bg: "bg-yellow-500/10",
    label: "Owner"
  },
  admin: { 
    icon: Shield, 
    color: "text-blue-500", 
    bg: "bg-blue-500/10",
    label: "Admin"
  },
  member: { 
    icon: User, 
    color: "text-emerald-500", 
    bg: "bg-emerald-500/10",
    label: "Member"
  },
  viewer: { 
    icon: Eye, 
    color: "text-slate-400", 
    bg: "bg-slate-400/10",
    label: "Viewer"
  },
};

// Generate a consistent gradient based on workspace name
const getGradient = (name: string) => {
  const gradients = [
    "from-blue-500 to-cyan-500",
    "from-violet-500 to-purple-500",
    "from-emerald-500 to-green-500",
    "from-orange-500 to-amber-500",
    "from-pink-500 to-rose-500",
    "from-indigo-500 to-blue-500",
  ];
  const index = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % gradients.length;
  return gradients[index];
};

export const WorkspaceCard = ({ workspace, locale }: WorkspaceCardProps) => {
  const t = useTranslations("workspaces");
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  
  const roleInfo = roleConfig[workspace.role];
  const RoleIcon = roleInfo.icon;
  const gradient = getGradient(workspace.name);
  const canEdit = workspace.role === "owner" || workspace.role === "admin";

  const handleEditSuccess = () => {
    router.refresh();
  };

  return (
    <>
      <Card className="group relative overflow-hidden hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 hover:border-primary/30">
        {/* Gradient accent bar */}
        <div className={cn("h-1.5 w-full bg-gradient-to-r", gradient)} />
        
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className={cn(
              "w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg",
              gradient
            )}>
              <span className="text-2xl font-bold text-white">
                {workspace.name.charAt(0).toUpperCase()}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Role badge */}
              <div className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                roleInfo.bg, roleInfo.color
              )}>
                <RoleIcon className="w-3.5 h-3.5" />
                <span>{roleInfo.label}</span>
              </div>
              
              {/* More options */}
              {canEdit && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.preventDefault()}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditOpen(true)}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit Workspace
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push(`/${locale}/app/${workspace.id}/settings`)}>
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Title & Description */}
          <Link href={`/${locale}/app/${workspace.id}/dashboard`} className="block">
            <h3 className="text-lg font-bold mb-1 group-hover:text-primary transition-colors line-clamp-1">
              {workspace.name}
            </h3>
            
            {workspace.description ? (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4 min-h-[2.5rem]">
                {workspace.description}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground/50 italic mb-4 min-h-[2.5rem]">
                No description
              </p>
            )}
          </Link>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 mb-4">
            <Link href={`/${locale}/app/${workspace.id}/board`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full gap-1.5 h-8 text-xs">
                <Kanban className="w-3.5 h-3.5" />
                Board
              </Button>
            </Link>
            <Link href={`/${locale}/app/${workspace.id}/tasks`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full gap-1.5 h-8 text-xs">
                <ListTodo className="w-3.5 h-3.5" />
                Tasks
              </Button>
            </Link>
            <Link href={`/${locale}/app/${workspace.id}/calendar`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full gap-1.5 h-8 text-xs">
                <Calendar className="w-3.5 h-3.5" />
                Calendar
              </Button>
            </Link>
          </div>

          {/* Footer */}
          <Link href={`/${locale}/app/${workspace.id}/dashboard`}>
            <div className="flex items-center justify-between pt-4 border-t border-border group/link">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>{t("members")}</span>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground group-hover/link:text-primary transition-colors">
                <span>Open</span>
                <ChevronRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <EditWorkspaceDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        workspace={workspace}
        onSuccess={handleEditSuccess}
      />
    </>
  );
};
