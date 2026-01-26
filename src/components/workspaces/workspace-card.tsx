"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { FolderKanban, Users, ChevronRight, Crown, Shield, User, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Workspace, WorkspaceRole } from "@/lib/db/schema";

interface WorkspaceWithRole extends Workspace {
  role: WorkspaceRole;
}

interface WorkspaceCardProps {
  workspace: WorkspaceWithRole;
  locale: string;
}

const roleIcons: Record<WorkspaceRole, React.ElementType> = {
  owner: Crown,
  admin: Shield,
  member: User,
  viewer: Eye,
};

const roleColors: Record<WorkspaceRole, string> = {
  owner: "text-yellow-500",
  admin: "text-blue-500",
  member: "text-green-500",
  viewer: "text-slate-400",
};

export const WorkspaceCard = ({ workspace, locale }: WorkspaceCardProps) => {
  const t = useTranslations("workspaces");
  const RoleIcon = roleIcons[workspace.role];

  return (
    <Link href={`/${locale}/app/${workspace.id}/dashboard`}>
      <Card className="group hover:shadow-lg hover:shadow-primary/5 transition-all hover:border-primary/20 cursor-pointer">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <FolderKanban className="w-6 h-6 text-primary" />
            </div>
            <div className={`flex items-center gap-1.5 text-xs font-medium ${roleColors[workspace.role]}`}>
              <RoleIcon className="w-3.5 h-3.5" />
              <span>{t(`roles.${workspace.role}`)}</span>
            </div>
          </div>

          <h3 className="text-lg font-semibold mb-1 group-hover:text-primary transition-colors">
            {workspace.name}
          </h3>
          
          {workspace.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
              {workspace.description}
            </p>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>{t("members")}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
