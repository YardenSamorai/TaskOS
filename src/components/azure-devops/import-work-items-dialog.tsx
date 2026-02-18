"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  Download,
  Search,
  Cloud,
  ClipboardList,
  Bug,
  Sparkles,
  BookOpen,
  User,
  Users,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getUserAzureOrganizations,
  getUserAzureDevOpsProjects,
  getProjectTeamsList,
  getTeamBoardsList,
  getTeamBoardWorkItems,
  importAzureWorkItemsAsTasks,
} from "@/lib/actions/azure-devops";
import type { AzureDevOpsProject, AzureDevOpsWorkItem } from "@/lib/azure-devops";

interface ImportWorkItemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  onImportSuccess?: () => void;
}

const workItemTypeIcon: Record<string, React.ReactNode> = {
  Task: <ClipboardList className="w-4 h-4 text-yellow-500" />,
  Bug: <Bug className="w-4 h-4 text-red-500" />,
  "User Story": <BookOpen className="w-4 h-4 text-blue-500" />,
  Feature: <Sparkles className="w-4 h-4 text-purple-500" />,
  Epic: <Sparkles className="w-4 h-4 text-orange-500" />,
};

type Step = "select-project" | "select-board" | "view-board";
type Team = { id: string; name: string };
type Board = { id: string; name: string };
type BoardColumn = { name: string; columnType: string; items: AzureDevOpsWorkItem[] };

export function ImportWorkItemsDialog({
  open,
  onOpenChange,
  workspaceId,
  onImportSuccess,
}: ImportWorkItemsDialogProps) {
  const [step, setStep] = useState<Step>("select-project");
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState("");
  const [projects, setProjects] = useState<AzureDevOpsProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<AzureDevOpsProject | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [boards, setBoards] = useState<{ team: string; boards: Board[] }[]>([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedBoard, setSelectedBoard] = useState("");
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [importing, setImporting] = useState(false);
  const [search, setSearch] = useState("");
  const [projectSearch, setProjectSearch] = useState("");
  const [boardSearch, setBoardSearch] = useState("");
  const [activeColumn, setActiveColumn] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadInitial();
    } else {
      resetAll();
    }
  }, [open]);

  const resetAll = () => {
    setStep("select-project");
    setSelectedProject(null);
    setTeams([]);
    setBoards([]);
    setColumns([]);
    setSelectedIds(new Set());
    setSearch("");
    setProjectSearch("");
    setBoardSearch("");
    setActiveColumn(null);
  };

  const loadInitial = async () => {
    setLoading(true);
    try {
      const orgResult = await getUserAzureOrganizations();
      if (orgResult.success && orgResult.organizations?.length) {
        const org = orgResult.organizations[0].name;
        setOrganization(org);
        const projResult = await getUserAzureDevOpsProjects(org);
        if (projResult.success && projResult.projects) {
          setProjects(projResult.projects);
        }
      }
    } catch {
      toast.error("Failed to load Azure DevOps data");
    } finally {
      setLoading(false);
    }
  };

  const selectProject = async (project: AzureDevOpsProject) => {
    setSelectedProject(project);
    setStep("select-board");
    setLoadingBoard(true);

    try {
      const teamsResult = await getProjectTeamsList(organization, project.name);
      if (teamsResult.success && teamsResult.teams) {
        setTeams(teamsResult.teams);

        const allBoards: { team: string; boards: Board[] }[] = [];
        for (const team of teamsResult.teams) {
          const boardsResult = await getTeamBoardsList(organization, project.name, team.name);
          if (boardsResult.success && boardsResult.boards?.length) {
            allBoards.push({ team: team.name, boards: boardsResult.boards });
          }
        }
        setBoards(allBoards);
      }
    } catch {
      toast.error("Failed to load teams");
    } finally {
      setLoadingBoard(false);
    }
  };

  const selectBoard = async (team: string, board: string) => {
    setSelectedTeam(team);
    setSelectedBoard(board);
    setStep("view-board");
    setLoadingBoard(true);

    try {
      const result = await getTeamBoardWorkItems(organization, selectedProject!.name, team, board);
      if (result.success && result.columns) {
        setColumns(result.columns);
        const firstNonEmpty = result.columns.find((c: BoardColumn) => c.items.length > 0);
        setActiveColumn(firstNonEmpty?.name || result.columns[0]?.name || null);
      } else {
        toast.error(result.error || "Failed to load board");
      }
    } catch {
      toast.error("Failed to load board");
    } finally {
      setLoadingBoard(false);
    }
  };

  const toggleItem = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleColumnItems = (columnItems: AzureDevOpsWorkItem[]) => {
    const columnItemIds = columnItems.map((i) => i.id);
    const allSelected = columnItemIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        columnItemIds.forEach((id) => next.delete(id));
      } else {
        columnItemIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleImport = async () => {
    if (selectedIds.size === 0 || !selectedProject) return;
    setImporting(true);
    try {
      const result = await importAzureWorkItemsAsTasks({
        workspaceId,
        organization,
        project: selectedProject.name,
        workItemIds: Array.from(selectedIds),
      });
      if (result.success) {
        toast.success(`Imported ${result.imported} work items as tasks`);
        onOpenChange(false);
        onImportSuccess?.();
      } else {
        toast.error(result.error || "Failed to import");
      }
    } catch {
      toast.error("Import failed");
    } finally {
      setImporting(false);
    }
  };

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(projectSearch.toLowerCase())
  );

  const filteredBoards = boards
    .map((tb) => ({
      ...tb,
      boards: tb.boards.filter(
        (b) =>
          b.name.toLowerCase().includes(boardSearch.toLowerCase()) ||
          tb.team.toLowerCase().includes(boardSearch.toLowerCase())
      ),
    }))
    .filter((tb) => tb.boards.length > 0);

  const activeColumnData = columns.find((c) => c.name === activeColumn);
  const activeItems = (activeColumnData?.items || []).filter((item) =>
    item.fields["System.Title"]?.toLowerCase().includes(search.toLowerCase())
  );

  const totalItems = columns.reduce((sum, c) => sum + c.items.length, 0);

  const stepTitle = step === "select-project"
    ? "Select a project"
    : step === "select-board"
    ? `${selectedProject?.name} — Choose a board`
    : `${selectedProject?.name} — ${selectedBoard}`;

  const columnDotColor = (type: string) => {
    if (type === "incoming") return "bg-blue-500";
    if (type === "outgoing") return "bg-emerald-500";
    return "bg-amber-500";
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2 text-lg">
            {step !== "select-project" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -ml-1"
                onClick={() => {
                  if (step === "view-board") {
                    setStep("select-board");
                    setColumns([]);
                    setSelectedIds(new Set());
                    setSearch("");
                    setActiveColumn(null);
                  } else {
                    setStep("select-project");
                    setSelectedProject(null);
                    setBoards([]);
                    setTeams([]);
                  }
                }}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div className="p-2 rounded-lg bg-[#0078D4]/10">
              <Cloud className="w-4 h-4 text-[#0078D4]" />
            </div>
            Import Work Items
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {stepTitle}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {/* Step: Select Project */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : step === "select-project" ? (
          <div className="flex-1 flex flex-col overflow-hidden gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-2">
                {filteredProjects.map((project) => (
                  <button
                    key={project.id}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 hover:border-primary/30 transition-colors text-left"
                    onClick={() => selectProject(project)}
                  >
                    <div className="w-9 h-9 rounded-lg bg-[#0078D4]/10 flex items-center justify-center shrink-0">
                      <Cloud className="w-4 h-4 text-[#0078D4]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{project.name}</p>
                      {project.description && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {project.description}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>
                ))}
                {filteredProjects.length === 0 && (
                  <div className="text-center py-12">
                    <Cloud className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">No projects found</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        ) : step === "select-board" ? (
          <div className="flex-1 flex flex-col overflow-hidden gap-3">
            {loadingBoard ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search boards..."
                    value={boardSearch}
                    onChange={(e) => setBoardSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <ScrollArea className="flex-1 -mx-6 px-6">
                  <div className="space-y-4">
                    {filteredBoards.map((tb) => (
                      <div key={tb.team}>
                        <div className="flex items-center gap-1.5 mb-2 px-1">
                          <Users className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            {tb.team}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {tb.boards.map((board) => (
                            <button
                              key={board.id}
                              className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 hover:border-primary/30 transition-colors text-left"
                              onClick={() => selectBoard(tb.team, board.name)}
                            >
                              <div className="w-9 h-9 rounded-lg bg-[#0078D4]/10 flex items-center justify-center shrink-0">
                                <ClipboardList className="w-4 h-4 text-[#0078D4]" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{board.name}</p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    {filteredBoards.length === 0 && (
                      <div className="text-center py-12">
                        <ClipboardList className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                        <p className="text-sm text-muted-foreground">No boards found</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </>
            )}
          </div>
        ) : (
          /* Step: View Board */
          <div className="flex-1 flex flex-col overflow-hidden gap-3">
            {loadingBoard ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Column tabs */}
                <div className="flex items-center gap-1 overflow-x-auto border-b pb-0">
                  {columns.map((col) => {
                    const isActive = activeColumn === col.name;
                    const selectedInCol = col.items.filter((i) => selectedIds.has(i.id)).length;
                    return (
                      <button
                        key={col.name}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors whitespace-nowrap shrink-0",
                          isActive
                            ? "border-primary text-foreground"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                        onClick={() => setActiveColumn(col.name)}
                      >
                        <div className={cn("w-2 h-2 rounded-full", columnDotColor(col.columnType))} />
                        {col.name}
                        <span className="text-muted-foreground font-normal">
                          {col.items.length}
                        </span>
                        {selectedInCol > 0 && (
                          <Badge variant="secondary" className="h-4 px-1 text-[10px] font-normal">
                            {selectedInCol}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Search + select column */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search items..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  {activeColumnData && activeColumnData.items.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-8 shrink-0"
                      onClick={() => toggleColumnItems(activeItems)}
                    >
                      {activeItems.every((i) => selectedIds.has(i.id))
                        ? "Deselect all"
                        : "Select all"}
                    </Button>
                  )}
                </div>

                {/* Work items list */}
                <ScrollArea className="flex-1 -mx-6 px-6">
                  <div className="space-y-2">
                    {activeItems.length === 0 ? (
                      <div className="text-center py-12">
                        <ClipboardList className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                        <p className="text-sm text-muted-foreground">
                          {search ? "No matching items" : "No items in this column"}
                        </p>
                      </div>
                    ) : (
                      activeItems.map((item) => {
                        const fields = item.fields;
                        const type = fields["System.WorkItemType"] || "Task";
                        const title = fields["System.Title"];
                        const assignee = fields["System.AssignedTo"]?.displayName;
                        const priority = fields["Microsoft.VSTS.Common.Priority"];
                        const tags = fields["System.Tags"];
                        const isSelected = selectedIds.has(item.id);

                        return (
                          <div
                            key={item.id}
                            className={cn(
                              "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                              isSelected
                                ? "border-primary bg-primary/5"
                                : "hover:border-primary/30 hover:bg-muted/50"
                            )}
                            onClick={() => toggleItem(item.id)}
                          >
                            <Checkbox checked={isSelected} className="shrink-0 mt-0.5" />
                            <div className="shrink-0 mt-0.5">
                              {workItemTypeIcon[type] || (
                                <ClipboardList className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium leading-snug">{title}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-xs text-muted-foreground">#{item.id}</span>
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                  {type}
                                </Badge>
                                {priority && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                                    P{priority}
                                  </Badge>
                                )}
                                {assignee && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {assignee}
                                  </span>
                                )}
                              </div>
                              {tags && (
                                <div className="flex gap-1 mt-1.5 flex-wrap">
                                  {tags.split(";").slice(0, 3).map((tag: string) => (
                                    <Badge
                                      key={tag.trim()}
                                      variant="secondary"
                                      className="text-[10px] px-1.5 py-0 h-4"
                                    >
                                      {tag.trim()}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </>
            )}
          </div>
        )}

        {/* Footer - only in board view with items */}
        {step === "view-board" && !loadingBoard && columns.length > 0 && (
          <ResponsiveDialogFooter className="border-t pt-4">
            <div className="flex items-center justify-between w-full gap-3">
              <span className="text-xs text-muted-foreground">
                {totalItems} items total
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={selectedIds.size === 0 || importing}
                >
                  {importing ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Import {selectedIds.size} Item{selectedIds.size !== 1 ? "s" : ""}
                </Button>
              </div>
            </div>
          </ResponsiveDialogFooter>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
