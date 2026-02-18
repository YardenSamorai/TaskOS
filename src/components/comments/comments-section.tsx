"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Send,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  MessageSquare,
  AtSign,
  X,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  createComment,
  getTaskComments,
  updateComment,
  deleteComment,
  getMentionSuggestions,
} from "@/lib/actions/comment";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import PusherClient from "pusher-js";

interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface Comment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  user: User;
}

interface MentionSuggestion {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

interface CommentsSectionProps {
  taskId: string;
  workspaceId: string;
  currentUserId: string;
  currentUserRole: string;
}

// Parse comment content and render mentions
const renderContent = (content: string) => {
  // Match @[Name](userId)
  const parts = content.split(/(@\[[^\]]+\]\([^)]+\))/g);

  return parts.map((part, index) => {
    const mentionMatch = part.match(/@\[([^\]]+)\]\(([^)]+)\)/);
    if (mentionMatch) {
      return (
        <span
          key={index}
          className="inline-flex items-center px-1.5 py-0.5 rounded bg-primary/10 text-primary text-sm font-medium"
        >
          @{mentionMatch[1]}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

export const CommentsSection = ({
  taskId,
  workspaceId,
  currentUserId,
  currentUserRole,
}: CommentsSectionProps) => {
  // DEBUG - This should appear in console
  console.log("🔴🔴🔴 CommentsSection RENDERED 🔴🔴🔴", { taskId });
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Mention states
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionSuggestions, setMentionSuggestions] = useState<MentionSuggestion[]>([]);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionTriggerPos = useRef<number | null>(null);

  // Fetch comments
  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getTaskComments(taskId);
      if (result.success) {
        setComments(result.comments as Comment[]);
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  const fetchMentionSuggestions = useCallback(async (search: string) => {
    const result = await getMentionSuggestions(workspaceId, search);
    if (result.success) {
      setMentionSuggestions(result.suggestions);
    }
  }, [workspaceId]);

  // Pusher client ref (singleton)
  const pusherRef = useRef<PusherClient | null>(null);

  // Initial fetch and Pusher subscription
  useEffect(() => {
    console.log("[CommentsSection] useEffect running for taskId:", taskId);
    fetchComments();

    // Set up Pusher
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    // Pusher config check

    if (!key || !cluster) {
      console.error("[Pusher] ❌ Missing env vars!");
      return;
    }

    // Enable Pusher logging
    PusherClient.logToConsole = true;

    // Create or reuse Pusher client
    if (!pusherRef.current) {
      console.log("[Pusher] Creating new client...");
      pusherRef.current = new PusherClient(key, { cluster });
    }

    const pusher = pusherRef.current;
    const channelName = `task-${taskId}`;

    console.log("[Pusher] Subscribing to channel:", channelName);
    const channel = pusher.subscribe(channelName);

    channel.bind("pusher:subscription_succeeded", () => {
      console.log("[Pusher] ✅ Subscription succeeded for:", channelName);
      setIsConnected(true);
    });

    channel.bind("pusher:subscription_error", (error: any) => {
      console.error("[Pusher] ❌ Subscription error:", error);
      setIsConnected(false);
    });

    // Listen for new comments
    channel.bind("comment:created", (data: { comment: Comment }) => {
      console.log("[Pusher] 📩 Received new comment:", data);
      setComments((prev) => {
        // Avoid duplicates
        if (prev.some((c) => c.id === data.comment.id)) {
          console.log("[Pusher] Comment already exists, skipping");
          return prev;
        }
        return [data.comment, ...prev];
      });
    });

    // Listen for updated comments
    channel.bind("comment:updated", (data: { comment: Comment }) => {
      console.log("[Pusher] 📝 Received updated comment:", data);
      setComments((prev) =>
        prev.map((c) => (c.id === data.comment.id ? data.comment : c))
      );
    });

    // Listen for deleted comments
    channel.bind("comment:deleted", (data: { commentId: string }) => {
      console.log("[Pusher] 🗑️ Received deleted comment:", data);
      setComments((prev) => prev.filter((c) => c.id !== data.commentId));
    });

    // Connection state
    pusher.connection.bind("connected", () => {
      console.log("[Pusher] 🔗 Connected to Pusher");
      setIsConnected(true);
    });
    pusher.connection.bind("disconnected", () => {
      console.log("[Pusher] 🔌 Disconnected from Pusher");
      setIsConnected(false);
    });
    pusher.connection.bind("error", (error: any) => {
      console.error("[Pusher] ❌ Connection error:", error);
      setIsConnected(false);
    });

    // Cleanup function
    return () => {
      console.log("[Pusher] 🧹 Cleaning up channel:", channelName);
      channel.unbind_all();
      pusher.unsubscribe(channelName);
    };
  }, [taskId, fetchComments]);

  useEffect(() => {
    if (showMentions) {
      fetchMentionSuggestions(mentionSearch);
    }
  }, [showMentions, mentionSearch, fetchMentionSuggestions]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const pos = e.target.selectionStart || 0;
    setContent(value);
    setCursorPosition(pos);

    // Check for @ trigger
    const textBeforeCursor = value.substring(0, pos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      // Check if there's no space between @ and cursor
      if (!textAfterAt.includes(" ")) {
        mentionTriggerPos.current = lastAtIndex;
        setMentionSearch(textAfterAt);
        setShowMentions(true);
        setMentionIndex(0);
        return;
      }
    }

    setShowMentions(false);
    mentionTriggerPos.current = null;
  };

  const insertMention = (suggestion: MentionSuggestion) => {
    if (mentionTriggerPos.current === null) return;

    const before = content.substring(0, mentionTriggerPos.current);
    const after = content.substring(cursorPosition);
    const mentionText = `@[${suggestion.name}](${suggestion.id}) `;

    setContent(before + mentionText + after);
    setShowMentions(false);
    mentionTriggerPos.current = null;

    // Focus back on textarea
    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = before.length + mentionText.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showMentions) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMentionIndex((prev) =>
        prev < mentionSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setMentionIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter" && mentionSuggestions.length > 0) {
      e.preventDefault();
      insertMention(mentionSuggestions[mentionIndex]);
    } else if (e.key === "Escape") {
      setShowMentions(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) return;

    const commentContent = content;
    setContent(""); // Clear immediately for better UX
    setSubmitting(true);
    
    try {
      const formData = new FormData();
      formData.append("taskId", taskId);
      formData.append("content", commentContent);

      const result = await createComment(formData);

      if (result.success && result.comment) {
        // Comment will be added via Pusher, but add optimistically if not connected
        if (!isConnected) {
          setComments((prev) => {
            if (prev.some(c => c.id === (result.comment as Comment).id)) {
              return prev;
            }
            return [result.comment as Comment, ...prev];
          });
        }
        toast.success("Comment added");
      } else {
        setContent(commentContent); // Restore content on error
        toast.error(result.error || "Failed to add comment");
      }
    } catch (error) {
      setContent(commentContent); // Restore content on error
      toast.error("Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (commentId: string) => {
    if (!editContent.trim()) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("commentId", commentId);
      formData.append("content", editContent);

      const result = await updateComment(formData);

      if (result.success && result.comment) {
        setComments((prev) =>
          prev.map((c) => (c.id === commentId ? (result.comment as Comment) : c))
        );
        setEditingId(null);
        setEditContent("");
        toast.success("Comment updated");
      } else {
        toast.error(result.error || "Failed to update comment");
      }
    } catch (error) {
      toast.error("Failed to update comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    setDeletingId(commentId);
    try {
      const result = await deleteComment(commentId);
      if (result.success) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        toast.success("Comment deleted");
      } else {
        toast.error(result.error || "Failed to delete comment");
      }
    } catch (error) {
      toast.error("Failed to delete comment");
    } finally {
      setDeletingId(null);
    }
  };

  const canEditDelete = (comment: Comment) => {
    return comment.userId === currentUserId || ["owner", "admin"].includes(currentUserRole);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Comments ({comments.length})
        </h3>
        <Badge 
          variant="outline" 
          className={cn(
            "text-xs gap-1",
            isConnected 
              ? "text-green-600 border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800" 
              : "text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800"
          )}
        >
          {isConnected ? (
            <>
              <Wifi className="w-3 h-3" />
              <span>Live</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3" />
              <span>Connecting...</span>
            </>
          )}
        </Badge>
      </div>

      {/* New comment form */}
      <form onSubmit={handleSubmit} className="relative">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          onKeyDown={handleKeyDown}
          placeholder="Write a comment... Use @ to mention someone"
          rows={3}
          className="pr-12"
        />
        <Button
          type="submit"
          size="icon"
          className="absolute bottom-2 end-2 h-8 w-8"
          disabled={!content.trim() || submitting}
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>

        {/* Mention suggestions dropdown */}
        {showMentions && mentionSuggestions.length > 0 && (
          <div className="absolute bottom-full mb-1 start-0 w-64 bg-popover border rounded-lg shadow-lg py-1 z-50">
            {mentionSuggestions.map((suggestion, index) => (
              <button
                key={suggestion.id}
                type="button"
                onClick={() => insertMention(suggestion)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-sm text-start hover:bg-muted transition-colors",
                  index === mentionIndex && "bg-muted"
                )}
              >
                <Avatar className="w-6 h-6">
                  <AvatarImage src={suggestion.image || undefined} />
                  <AvatarFallback className="text-[10px]">
                    {suggestion.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{suggestion.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {suggestion.email}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </form>

      {/* Comments list */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No comments yet</p>
          <p className="text-xs">Be the first to comment</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="flex gap-3 p-3 rounded-lg bg-muted/30 group"
            >
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarImage src={comment.user.image || undefined} />
                <AvatarFallback className="text-xs">
                  {comment.user.name?.charAt(0) || comment.user.email.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">
                    {comment.user.name || comment.user.email}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                  {comment.updatedAt !== comment.createdAt && (
                    <span className="text-xs text-muted-foreground">(edited)</span>
                  )}
                </div>

                {editingId === comment.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={2}
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleUpdate(comment.id)}
                        disabled={submitting}
                      >
                        {submitting && (
                          <Loader2 className="w-3 h-3 me-1 animate-spin" />
                        )}
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(null);
                          setEditContent("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">
                    {renderContent(comment.content)}
                  </p>
                )}
              </div>

              {canEditDelete(comment) && editingId !== comment.id && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {comment.userId === currentUserId && (
                      <DropdownMenuItem
                        onClick={() => {
                          setEditingId(comment.id);
                          setEditContent(comment.content);
                        }}
                      >
                        <Pencil className="w-4 h-4 me-2" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem
                          onSelect={(e) => e.preventDefault()}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 me-2" />
                          Delete
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete comment?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(comment.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {deletingId === comment.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              "Delete"
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
