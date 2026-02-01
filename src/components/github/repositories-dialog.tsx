"use client";

import { useState, useEffect } from "react";
import {
  Github,
  Search,
  Link2,
  Unlink,
  Lock,
  Globe,
  Star,
  GitFork,
  AlertCircle,
  Loader2,
  Check,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  fetchUserRepositories,
  getLinkedRepositoriesForWorkspace,
  linkRepositoryToWorkspace,
  unlinkRepository,
} from "@/lib/actions/github";
import type { GitHubRepo } from "@/lib/github";

interface RepositoriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  onRepositoryChange?: () => void;
}

export function RepositoriesDialog({
  open,
  onOpenChange,
  workspaceId,
  onRepositoryChange,
}: RepositoriesDialogProps) {
  const [loading, setLoading] = useState(true);
  const [repositories, setRepositories] = useState<GitHubRepo[]>([]);
  const [linkedRepoIds, setLinkedRepoIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [linking, setLinking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, workspaceId]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch both user repos and linked repos in parallel
      const [reposResult, linkedResult] = await Promise.all([
        fetchUserRepositories(),
        getLinkedRepositoriesForWorkspace(workspaceId),
      ]);

      if (!reposResult.success) {
        setError(reposResult.error || "Failed to fetch repositories");
        return;
      }

      setRepositories(reposResult.repositories);
      
      // Create set of linked repo IDs
      const linkedIds = new Set(
        linkedResult.repositories.map((r: any) => r.externalId)
      );
      setLinkedRepoIds(linkedIds);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to fetch repositories");
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async (repo: GitHubRepo) => {
    setLinking(repo.id.toString());

    try {
      const result = await linkRepositoryToWorkspace({
        workspaceId,
        repository: repo,
      });

      if (result.success) {
        setLinkedRepoIds(prev => new Set([...prev, repo.id.toString()]));
        toast.success(`${repo.name} linked successfully`);
        onRepositoryChange?.();
      } else {
        toast.error(result.error || "Failed to link repository");
      }
    } catch (error) {
      toast.error("Failed to link repository");
    } finally {
      setLinking(null);
    }
  };

  const handleUnlink = async (repoId: string) => {
    // Find the linked repository record
    const linkedResult = await getLinkedRepositoriesForWorkspace(workspaceId);
    const linkedRepo = linkedResult.repositories.find(
      (r: any) => r.externalId === repoId
    );

    if (!linkedRepo) {
      toast.error("Repository not found");
      return;
    }

    setLinking(repoId);

    try {
      const result = await unlinkRepository(linkedRepo.id);

      if (result.success) {
        setLinkedRepoIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(repoId);
          return newSet;
        });
        toast.success("Repository unlinked");
        onRepositoryChange?.();
      } else {
        toast.error(result.error || "Failed to unlink repository");
      }
    } catch (error) {
      toast.error("Failed to unlink repository");
    } finally {
      setLinking(null);
    }
  };

  const filteredRepos = repositories.filter(repo =>
    repo.name.toLowerCase().includes(search.toLowerCase()) ||
    repo.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (repo.description?.toLowerCase().includes(search.toLowerCase()))
  );

  const linkedRepos = filteredRepos.filter(repo => 
    linkedRepoIds.has(repo.id.toString())
  );
  
  const availableRepos = filteredRepos.filter(repo => 
    !linkedRepoIds.has(repo.id.toString())
  );

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <ResponsiveDialogHeader className="px-4 sm:px-6">
          <ResponsiveDialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Github className="w-4 h-4 sm:w-5 sm:h-5" />
            GitHub Repositories
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="text-xs sm:text-sm">
            Link repos to sync issues
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {/* Search */}
        <div className="relative px-4 sm:px-6">
          <Search className="absolute left-7 sm:left-9 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 sm:h-10 text-sm"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="w-12 h-12 text-destructive/50 mb-4" />
            <h3 className="font-semibold mb-1">Failed to load repositories</h3>
            <p className="text-muted-foreground text-sm mb-4">{error}</p>
            <Button onClick={fetchData} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="available" className="flex-1 overflow-hidden flex flex-col px-4 sm:px-6">
            <TabsList className="grid w-full grid-cols-2 h-9 sm:h-10">
              <TabsTrigger value="available" className="text-xs sm:text-sm">
                Available
                <Badge variant="secondary" className="ml-1.5 sm:ml-2 text-[10px] sm:text-xs px-1.5 sm:px-2">
                  {availableRepos.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="linked" className="text-xs sm:text-sm">
                Linked
                <Badge variant="secondary" className="ml-1.5 sm:ml-2 text-[10px] sm:text-xs px-1.5 sm:px-2">
                  {linkedRepos.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="available" className="flex-1 overflow-hidden mt-3 sm:mt-4">
              <ScrollArea className="h-[300px] sm:h-[400px] -mx-1 px-1">
                {availableRepos.length === 0 ? (
                  <div className="text-center py-6 sm:py-8 text-muted-foreground text-sm">
                    {search ? "No repos match your search" : "All repos are linked"}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availableRepos.map((repo) => (
                      <RepoCard
                        key={repo.id}
                        repo={repo}
                        isLinked={false}
                        isLoading={linking === repo.id.toString()}
                        onLink={() => handleLink(repo)}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="linked" className="flex-1 overflow-hidden mt-3 sm:mt-4">
              <ScrollArea className="h-[300px] sm:h-[400px] -mx-1 px-1">
                {linkedRepos.length === 0 ? (
                  <div className="text-center py-6 sm:py-8 text-muted-foreground text-sm">
                    No repos linked yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {linkedRepos.map((repo) => (
                      <RepoCard
                        key={repo.id}
                        repo={repo}
                        isLinked={true}
                        isLoading={linking === repo.id.toString()}
                        onUnlink={() => handleUnlink(repo.id.toString())}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

interface RepoCardProps {
  repo: GitHubRepo;
  isLinked: boolean;
  isLoading: boolean;
  onLink?: () => void;
  onUnlink?: () => void;
}

function RepoCard({ repo, isLinked, isLoading, onLink, onUnlink }: RepoCardProps) {
  // Language colors mapping
  const languageColors: Record<string, string> = {
    TypeScript: "bg-blue-500",
    JavaScript: "bg-yellow-400",
    Python: "bg-green-500",
    Java: "bg-orange-500",
    Go: "bg-cyan-500",
    Rust: "bg-orange-600",
    Ruby: "bg-red-500",
    PHP: "bg-purple-500",
    "C#": "bg-green-600",
    "C++": "bg-pink-500",
    C: "bg-gray-500",
    Swift: "bg-orange-400",
    Kotlin: "bg-purple-400",
  };

  return (
    <div className={cn(
      "p-3 sm:p-4 rounded-lg border transition-all",
      isLinked ? "border-primary/50 bg-primary/5" : "hover:border-primary/30"
    )}>
      <div className="flex items-start gap-2 sm:gap-4">
        {/* Repo info */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
            <span className="font-medium text-sm sm:text-base truncate">
              {repo.name}
            </span>
            {repo.private ? (
              <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground shrink-0" />
            ) : (
              <Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground shrink-0" />
            )}
          </div>
          
          {repo.description && (
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1 sm:line-clamp-2 mb-1.5 sm:mb-2">
              {repo.description}
            </p>
          )}

          <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground flex-wrap">
            {repo.language && (
              <span className="flex items-center gap-1">
                <span className={cn(
                  "w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full",
                  languageColors[repo.language] || "bg-gray-400"
                )} />
                {repo.language}
              </span>
            )}
            <span className="flex items-center gap-0.5 sm:gap-1">
              <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              {repo.stargazers_count}
            </span>
            <span className="flex items-center gap-0.5 sm:gap-1">
              <GitFork className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              {repo.forks_count}
            </span>
          </div>
        </div>

        {/* Action button */}
        <div className="shrink-0">
          {isLinked ? (
            <Button
              variant="outline"
              size="icon"
              onClick={onUnlink}
              disabled={isLoading}
              className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3 text-destructive hover:text-destructive"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Unlink className="w-4 h-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Unlink</span>
                </>
              )}
            </Button>
          ) : (
            <Button
              size="icon"
              onClick={onLink}
              disabled={isLoading}
              className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Link2 className="w-4 h-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Link</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
