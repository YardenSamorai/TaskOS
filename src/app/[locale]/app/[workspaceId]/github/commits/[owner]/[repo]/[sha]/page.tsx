"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  GitCommit,
  FileCode,
  Plus,
  Minus,
  ExternalLink,
  Copy,
  Check,
  Clock,
  User,
  GitBranch,
  ChevronDown,
  ChevronRight,
  Loader2,
  Shield,
  ShieldCheck,
  ShieldX,
  FileText,
  FolderTree,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { fetchCommitDetails } from "@/lib/actions/github";
import type { GitHubCommitDetail, GitHubRepo } from "@/lib/github";
import { toast } from "sonner";

export default function CommitDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;
  const locale = params.locale as string;
  const owner = params.owner as string;
  const repo = params.repo as string;
  const sha = params.sha as string;

  const [loading, setLoading] = useState(true);
  const [commit, setCommit] = useState<GitHubCommitDetail | null>(null);
  const [repository, setRepository] = useState<GitHubRepo | null>(null);
  const [copied, setCopied] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCommitDetails();
  }, [owner, repo, sha]);

  const loadCommitDetails = async () => {
    setLoading(true);
    try {
      const result = await fetchCommitDetails({ owner, repo, sha });
      if (result.success && result.commit) {
        setCommit(result.commit);
        setRepository(result.repository || null);
        // Expand first 3 files by default
        const initialExpanded = new Set(
          result.commit.files.slice(0, 3).map((f) => f.filename)
        );
        setExpandedFiles(initialExpanded);
      }
    } catch (error) {
      console.error("Error loading commit:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleFile = (filename: string) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(filename)) {
      newExpanded.delete(filename);
    } else {
      newExpanded.add(filename);
    }
    setExpandedFiles(newExpanded);
  };

  const getFileStatusColor = (status: string) => {
    switch (status) {
      case "added":
        return "text-green-500 bg-green-500/10";
      case "removed":
        return "text-red-500 bg-red-500/10";
      case "modified":
        return "text-yellow-500 bg-yellow-500/10";
      case "renamed":
        return "text-blue-500 bg-blue-500/10";
      default:
        return "text-muted-foreground bg-muted";
    }
  };

  const getFileStatusLabel = (status: string) => {
    switch (status) {
      case "added":
        return "Added";
      case "removed":
        return "Deleted";
      case "modified":
        return "Modified";
      case "renamed":
        return "Renamed";
      case "copied":
        return "Copied";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!commit) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <GitCommit className="w-16 h-16 text-muted-foreground/30" />
        <p className="text-muted-foreground">Commit not found</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  const messageParts = commit.commit.message.split("\n");
  const title = messageParts[0];
  const body = messageParts.slice(1).join("\n").trim();

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        className="gap-2 -ml-2"
        onClick={() => router.push(`/${locale}/app/${workspaceId}/github`)}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to GitHub
      </Button>

      {/* Commit Header */}
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-blue-500/10 shrink-0">
            <GitCommit className="w-6 h-6 text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold break-words">{title}</h1>
            {body && (
              <pre className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap font-sans">
                {body}
              </pre>
            )}
          </div>
        </div>

        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {/* Author */}
          <div className="flex items-center gap-2">
            {commit.author ? (
              <>
                <Avatar className="w-6 h-6">
                  <AvatarImage src={commit.author.avatar_url} />
                  <AvatarFallback className="text-xs">
                    {commit.author.login[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <a
                  href={commit.author.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium hover:text-primary transition-colors"
                >
                  {commit.author.login}
                </a>
              </>
            ) : (
              <>
                <User className="w-4 h-4 text-muted-foreground" />
                <span>{commit.commit.author.name}</span>
              </>
            )}
          </div>

          <span className="text-muted-foreground">committed</span>

          {/* Time */}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span title={format(new Date(commit.commit.author.date), "PPpp")}>
              {formatDistanceToNow(new Date(commit.commit.author.date), { addSuffix: true })}
            </span>
          </div>

          {/* Verification */}
          {commit.commit.verification && (
            <Badge
              variant="outline"
              className={cn(
                "gap-1",
                commit.commit.verification.verified
                  ? "border-green-500/50 text-green-600"
                  : "border-yellow-500/50 text-yellow-600"
              )}
            >
              {commit.commit.verification.verified ? (
                <ShieldCheck className="w-3 h-3" />
              ) : (
                <Shield className="w-3 h-3" />
              )}
              {commit.commit.verification.verified ? "Verified" : "Unverified"}
            </Badge>
          )}
        </div>

        {/* SHA and Links */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5">
            <code className="text-xs font-mono">{sha}</code>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => copyToClipboard(sha)}
            >
              {copied ? (
                <Check className="w-3 h-3 text-green-500" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </Button>
          </div>

          <Button variant="outline" size="sm" asChild>
            <a href={commit.html_url} target="_blank" rel="noopener noreferrer" className="gap-2">
              <ExternalLink className="w-4 h-4" />
              View on GitHub
            </a>
          </Button>

          {repository && (
            <Badge variant="secondary" className="gap-1">
              <GitBranch className="w-3 h-3" />
              {repository.full_name}
            </Badge>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <p className="text-2xl font-bold">{commit.files.length}</p>
              <p className="text-xs text-muted-foreground">Files changed</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Plus className="w-4 h-4 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-500">+{commit.stats.additions}</p>
              <p className="text-xs text-muted-foreground">Additions</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <Minus className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-500">-{commit.stats.deletions}</p>
              <p className="text-xs text-muted-foreground">Deletions</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Parents */}
      {commit.parents.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">
            Parent{commit.parents.length > 1 ? "s" : ""}:
          </span>
          {commit.parents.map((parent) => (
            <Button
              key={parent.sha}
              variant="outline"
              size="sm"
              className="font-mono text-xs h-7"
              onClick={() =>
                router.push(
                  `/${locale}/app/${workspaceId}/github/commits/${owner}/${repo}/${parent.sha}`
                )
              }
            >
              {parent.sha.slice(0, 7)}
            </Button>
          ))}
        </div>
      )}

      {/* Changed Files */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderTree className="w-5 h-5" />
            Changed Files
            <Badge variant="secondary" className="ml-2">
              {commit.files.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {commit.files.map((file) => (
              <Collapsible
                key={file.filename}
                open={expandedFiles.has(file.filename)}
                onOpenChange={() => toggleFile(file.filename)}
              >
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors">
                    {expandedFiles.has(file.filename) ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                    <FileCode className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-mono truncate flex-1 text-left">
                      {file.filename}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant="secondary"
                        className={cn("text-[10px]", getFileStatusColor(file.status))}
                      >
                        {getFileStatusLabel(file.status)}
                      </Badge>
                      <span className="text-xs text-green-500">+{file.additions}</span>
                      <span className="text-xs text-red-500">-{file.deletions}</span>
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {file.patch ? (
                    <ScrollArea className="max-h-[400px]">
                      <pre className="text-xs font-mono bg-muted/30 p-4 overflow-x-auto">
                        {file.patch.split("\n").map((line, i) => (
                          <div
                            key={i}
                            className={cn(
                              "px-2 -mx-2",
                              line.startsWith("+") && !line.startsWith("+++")
                                ? "bg-green-500/10 text-green-700 dark:text-green-400"
                                : line.startsWith("-") && !line.startsWith("---")
                                ? "bg-red-500/10 text-red-700 dark:text-red-400"
                                : line.startsWith("@@")
                                ? "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                                : ""
                            )}
                          >
                            {line}
                          </div>
                        ))}
                      </pre>
                    </ScrollArea>
                  ) : (
                    <div className="p-4 text-sm text-muted-foreground text-center bg-muted/30">
                      No diff available for this file
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
