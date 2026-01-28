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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  onLinkSuccess?: () => void;
  onUnlinkSuccess?: () => void;
}

export function RepositoriesDialog({
  open,
  onOpenChange,
  workspaceId,
  onRepositoryChange,
  onLinkSuccess,
  onUnlinkSuccess,
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
        onLinkSuccess?.();
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
        onUnlinkSuccess?.();
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="w-5 h-5" />
            GitHub Repositories
          </DialogTitle>
          <DialogDescription>
            Link repositories to this workspace to sync issues and track commits
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search repositories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
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
          <Tabs defaultValue="available" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="available">
                Available
                <Badge variant="secondary" className="ml-2">
                  {availableRepos.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="linked">
                Linked
                <Badge variant="secondary" className="ml-2">
                  {linkedRepos.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="available" className="flex-1 overflow-hidden mt-4">
              <ScrollArea className="h-[400px] pr-4">
                {availableRepos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {search ? "No repositories match your search" : "All repositories are linked"}
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

            <TabsContent value="linked" className="flex-1 overflow-hidden mt-4">
              <ScrollArea className="h-[400px] pr-4">
                {linkedRepos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No repositories linked yet
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
      </DialogContent>
    </Dialog>
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
      "p-4 rounded-lg border transition-all",
      isLinked ? "border-primary/50 bg-primary/5" : "hover:border-primary/30"
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <a
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:text-primary hover:underline truncate"
            >
              {repo.full_name}
            </a>
            {repo.private ? (
              <Lock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            ) : (
              <Globe className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            )}
          </div>
          
          {repo.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {repo.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {repo.language && (
              <span className="flex items-center gap-1">
                <span className={cn(
                  "w-2.5 h-2.5 rounded-full",
                  languageColors[repo.language] || "bg-gray-400"
                )} />
                {repo.language}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5" />
              {repo.stargazers_count}
            </span>
            <span className="flex items-center gap-1">
              <GitFork className="w-3.5 h-3.5" />
              {repo.forks_count}
            </span>
            {repo.open_issues_count > 0 && (
              <span className="flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {repo.open_issues_count} issues
              </span>
            )}
          </div>
        </div>

        <div className="flex-shrink-0">
          {isLinked ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onUnlink}
              disabled={isLoading}
              className="text-destructive hover:text-destructive"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Unlink className="w-4 h-4 mr-1" />
                  Unlink
                </>
              )}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={onLink}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Link2 className="w-4 h-4 mr-1" />
                  Link
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
