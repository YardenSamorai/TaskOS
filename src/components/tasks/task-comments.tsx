"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import {
  MessageSquare,
  Send,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
  Check,
  Image as ImageIcon,
  Paperclip,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { createComment, updateComment, deleteComment } from "@/lib/actions/comment";
import type { Task, TaskComment, User } from "@/lib/db/schema";

interface CommentWithUser extends TaskComment {
  user: User;
}

interface TaskWithComments extends Task {
  comments: CommentWithUser[];
}

interface TaskCommentsProps {
  task: TaskWithComments;
  currentUserId: string;
}

interface PendingImage {
  file: File;
  preview: string;
}

export const TaskComments = ({ task, currentUserId }: TaskCommentsProps) => {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [comments, setComments] = useState<CommentWithUser[]>(task.comments);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const t = useTranslations("comments");

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Handle paste event for images
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const preview = URL.createObjectURL(file);
          setPendingImages((prev) => [...prev, { file, preview }]);
          toast.success("Image added to comment");
        }
      }
    }
  }, []);

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      if (file.type.startsWith("image/")) {
        const preview = URL.createObjectURL(file);
        setPendingImages((prev) => [...prev, { file, preview }]);
      }
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Remove pending image
  const removePendingImage = (index: number) => {
    setPendingImages((prev) => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const handleSubmit = async () => {
    if ((!content.trim() && pendingImages.length === 0) || submitting) return;
    setSubmitting(true);
    setUploadingImage(pendingImages.length > 0);

    try {
      // Convert images to base64 and embed in content
      let finalContent = content;
      
      if (pendingImages.length > 0) {
        const images: string[] = [];
        for (const img of pendingImages) {
          const base64 = await fileToBase64(img.file);
          images.push(base64);
        }
        
        // Append images as markdown-like syntax
        if (finalContent) {
          finalContent += "\n\n";
        }
        finalContent += images.map((url) => `[image]${url}[/image]`).join("\n");
      }

      const formData = new FormData();
      formData.append("taskId", task.id);
      formData.append("content", finalContent);

      const result = await createComment(formData);

      if (result.success && result.comment) {
        setComments((prev) => [result.comment as CommentWithUser, ...prev]);
        setContent("");
        setPendingImages([]);
        toast.success(t("added"));
        router.refresh();
      } else {
        toast.error(result.error || t("addError"));
      }
    } catch (error) {
      console.error(error);
      toast.error(t("addError"));
    } finally {
      setSubmitting(false);
      setUploadingImage(false);
    }
  };

  const handleStartEdit = (comment: CommentWithUser) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editContent.trim()) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("commentId", commentId);
      formData.append("content", editContent);

      const result = await updateComment(formData);

      if (result.success && result.comment) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId ? (result.comment as CommentWithUser) : c
          )
        );
        setEditingId(null);
        setEditContent("");
        toast.success(t("updated"));
      } else {
        toast.error(result.error || t("updateError"));
      }
    } catch (error) {
      console.error(error);
      toast.error(t("updateError"));
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
        toast.success(t("deleted"));
        router.refresh();
      } else {
        toast.error(result.error || t("deleteError"));
      }
    } catch (error) {
      console.error(error);
      toast.error(t("deleteError"));
    } finally {
      setDeletingId(null);
      setDeleteDialogOpen(false);
    }
  };

  const isEdited = (comment: CommentWithUser) => {
    const created = new Date(comment.createdAt).getTime();
    const updated = new Date(comment.updatedAt).getTime();
    return updated - created > 1000;
  };

  // Render comment content with images
  const renderCommentContent = (commentContent: string) => {
    // Split by image tags
    const parts = commentContent.split(/(\[image\].*?\[\/image\])/g);
    
    return parts.map((part, index) => {
      const imageMatch = part.match(/\[image\](.*?)\[\/image\]/);
      if (imageMatch) {
        return (
          <div key={index} className="my-2">
            <img
              src={imageMatch[1]}
              alt="Comment image"
              className="max-w-full max-h-64 rounded-lg border cursor-zoom-in hover:opacity-90 transition-opacity"
              onClick={() => setViewingImage(imageMatch[1])}
            />
          </div>
        );
      }
      return part ? (
        <span key={index} className="whitespace-pre-wrap">
          {part}
        </span>
      ) : null;
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="w-5 h-5" />
          {t("title")}
          {comments.length > 0 && (
            <span className="text-sm text-muted-foreground font-normal">
              ({comments.length})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add comment form */}
        <div className="space-y-2">
          <div className="relative">
            <Textarea
              placeholder={t("placeholder")}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onPaste={handlePaste}
              rows={3}
              disabled={submitting}
              className="pr-10"
            />
            {/* Attach image button */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute bottom-2 end-2 h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => fileInputRef.current?.click()}
              disabled={submitting}
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Pending images preview */}
          {pendingImages.length > 0 && (
            <div className="flex flex-wrap gap-2 p-2 bg-muted/50 rounded-lg">
              {pendingImages.map((img, index) => (
                <div key={index} className="relative group">
                  <img
                    src={img.preview}
                    alt={`Pending ${index + 1}`}
                    className="h-20 w-20 object-cover rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -end-2 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removePendingImage(index)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={(!content.trim() && pendingImages.length === 0) || submitting}
              className="gap-2"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {uploadingImage ? "Uploading..." : t("add")}
            </Button>
          </div>
        </div>

        {/* Comments list */}
        {comments.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>{t("noComments")}</p>
          </div>
        ) : (
          <div className="space-y-4 pt-4 border-t">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 group">
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarImage src={comment.user.image || undefined} />
                  <AvatarFallback className="text-xs">
                    {comment.user.name?.[0] || comment.user.email[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {comment.user.name || comment.user.email}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                    {isEdited(comment) && (
                      <span className="text-xs text-muted-foreground italic">
                        ({t("edited")})
                      </span>
                    )}
                  </div>

                  {editingId === comment.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={2}
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSaveEdit(comment.id)}
                          disabled={!editContent.trim() || submitting}
                        >
                          {submitting ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Check className="w-3 h-3 me-1" />
                          )}
                          {t("save")}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelEdit}
                        >
                          <X className="w-3 h-3 me-1" />
                          {t("cancel")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm">
                      {renderCommentContent(comment.content)}
                    </div>
                  )}
                </div>

                {/* Actions - only for comment author */}
                {comment.userId === currentUserId && editingId !== comment.id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleStartEdit(comment)}>
                        <Pencil className="w-4 h-4 me-2" />
                        {t("edit")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => {
                          setDeletingId(comment.id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4 me-2" />
                        {t("delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Delete confirmation dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("deleteConfirmDescription")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingId && handleDelete(deletingId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deletingId && comments.find((c) => c.id === deletingId) ? (
                  <Loader2 className="w-4 h-4 animate-spin me-2" />
                ) : null}
                {t("delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Image viewer dialog */}
        <Dialog open={!!viewingImage} onOpenChange={() => setViewingImage(null)}>
          <DialogContent className="max-w-[90vw] max-h-[90vh] p-2">
            {viewingImage && (
              <img
                src={viewingImage}
                alt="Full size image"
                className="max-w-full max-h-[85vh] object-contain mx-auto rounded-lg"
              />
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
