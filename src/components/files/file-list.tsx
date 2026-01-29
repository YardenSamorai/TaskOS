"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  FileText,
  Image as ImageIcon,
  File,
  Download,
  Trash2,
  ExternalLink,
  Loader2,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { cn } from "@/lib/utils";
import { deleteAttachment } from "@/lib/actions/attachment";
import { toast } from "sonner";

interface Attachment {
  id: string;
  name: string;
  url: string;
  fileType: string | null;
  fileSize: number | null;
  createdAt: Date;
  uploadedBy?: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

interface FileListProps {
  attachments: Attachment[];
  onDelete?: () => void;
  canDelete?: boolean;
}

const getFileIcon = (type: string | null) => {
  if (!type) return File;
  if (type.startsWith("image/")) return ImageIcon;
  if (type.includes("pdf") || type.includes("document")) return FileText;
  return File;
};

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const isImage = (type: string | null) => type?.startsWith("image/");

export const FileList = ({
  attachments,
  onDelete,
  canDelete = true,
}: FileListProps) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const result = await deleteAttachment(id);
      if (result.success) {
        toast.success("File deleted");
        onDelete?.();
      } else {
        toast.error(result.error || "Failed to delete file");
      }
    } catch (error) {
      toast.error("Failed to delete file");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = (url: string, name: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
  };

  if (attachments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <File className="w-10 h-10 mx-auto mb-2 opacity-30" />
        <p className="text-sm">No files attached</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {attachments.map((attachment) => {
          const Icon = getFileIcon(attachment.fileType);
          const isImg = isImage(attachment.fileType);

          return (
            <div
              key={attachment.id}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors group"
            >
              {/* Preview thumbnail for images */}
              {isImg ? (
                <div
                  className="w-10 h-10 rounded-lg bg-muted overflow-hidden cursor-pointer flex-shrink-0"
                  onClick={() => {
                    setPreviewUrl(attachment.url);
                    setPreviewName(attachment.name);
                  }}
                >
                  <img
                    src={attachment.url}
                    alt={attachment.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-muted-foreground" />
                </div>
              )}

              {/* File info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{attachment.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(attachment.fileSize)}
                  {attachment.uploadedBy?.name && (
                    <> · {attachment.uploadedBy.name}</>
                  )}
                  {" · "}
                  {formatDistanceToNow(new Date(attachment.createdAt), {
                    addSuffix: true,
                  })}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {isImg && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setPreviewUrl(attachment.url);
                      setPreviewName(attachment.name);
                    }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleDownload(attachment.url, attachment.name)}
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  asChild
                >
                  <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
                {canDelete && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        disabled={deletingId === attachment.id}
                      >
                        {deletingId === attachment.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete file?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{attachment.name}"?
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(attachment.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Image preview dialog */}
      <ResponsiveDialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <ResponsiveDialogContent className="max-w-4xl">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{previewName}</ResponsiveDialogTitle>
          </ResponsiveDialogHeader>
          {previewUrl && (
            <div className="flex items-center justify-center max-h-[70vh] overflow-hidden px-4 pb-4">
              <img
                src={previewUrl}
                alt={previewName || "Preview"}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          )}
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
};
