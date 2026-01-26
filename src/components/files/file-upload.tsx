"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, FileText, Image, File, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { createAttachment } from "@/lib/actions/attachment";
import { toast } from "sonner";

interface FileUploadProps {
  taskId?: string;
  stageId?: string;
  onUploadComplete?: () => void;
  maxFiles?: number;
  maxSize?: number; // in bytes
  accept?: Record<string, string[]>;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
}

const getFileIcon = (type: string) => {
  if (type.startsWith("image/")) return Image;
  if (type.includes("pdf") || type.includes("document")) return FileText;
  return File;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const FileUpload = ({
  taskId,
  stageId,
  onUploadComplete,
  maxFiles = 5,
  maxSize = 16 * 1024 * 1024, // 16MB
  accept = {
    "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
    "application/pdf": [".pdf"],
    "application/msword": [".doc"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    "application/vnd.ms-excel": [".xls"],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    "text/plain": [".txt"],
  },
}: FileUploadProps) => {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = async (file: File) => {
    // Create FormData and upload to uploadthing (simplified for demo)
    // In production, you'd use the UploadThing component or API
    
    try {
      // Simulate upload progress
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.file === file ? { ...f, progress: 50 } : f
        )
      );

      // For now, create a data URL (in production, use uploadthing)
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.file === file ? { ...f, progress: 80 } : f
        )
      );

      // Save to database
      const formData = new FormData();
      if (taskId) formData.append("taskId", taskId);
      if (stageId) formData.append("stageId", stageId);
      formData.append("name", file.name);
      formData.append("url", dataUrl);
      formData.append("fileType", file.type);
      formData.append("fileSize", file.size.toString());

      const result = await createAttachment(formData);

      if (result.success) {
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.file === file ? { ...f, progress: 100, status: "done" } : f
          )
        );
        toast.success(`${file.name} uploaded successfully`);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.file === file
            ? { ...f, status: "error", error: "Upload failed" }
            : f
        )
      );
      toast.error(`Failed to upload ${file.name}`);
    }
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      setIsUploading(true);

      // Add files to uploading list
      const newFiles: UploadingFile[] = acceptedFiles.map((file) => ({
        file,
        progress: 0,
        status: "uploading" as const,
      }));

      setUploadingFiles((prev) => [...prev, ...newFiles]);

      // Upload each file
      await Promise.all(acceptedFiles.map(uploadFile));

      setIsUploading(false);
      onUploadComplete?.();

      // Clear completed files after a delay
      setTimeout(() => {
        setUploadingFiles((prev) =>
          prev.filter((f) => f.status !== "done")
        );
      }, 2000);
    },
    [taskId, stageId, onUploadComplete]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      maxFiles,
      maxSize,
      accept,
    });

  const removeFile = (file: File) => {
    setUploadingFiles((prev) => prev.filter((f) => f.file !== file));
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
          isDragActive && !isDragReject && "border-primary bg-primary/5",
          isDragReject && "border-destructive bg-destructive/5",
          !isDragActive && "border-border hover:border-primary/50 hover:bg-muted/50"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          <div className={cn(
            "p-3 rounded-full",
            isDragActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          )}>
            <Upload className="w-6 h-6" />
          </div>
          {isDragActive ? (
            <p className="text-sm font-medium text-primary">
              Drop files here...
            </p>
          ) : (
            <>
              <p className="text-sm font-medium">
                Drag & drop files here, or click to select
              </p>
              <p className="text-xs text-muted-foreground">
                Max {maxFiles} files, up to {formatFileSize(maxSize)} each
              </p>
            </>
          )}
        </div>
      </div>

      {/* Uploading files */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((uploadingFile, index) => {
            const Icon = getFileIcon(uploadingFile.file.type);
            return (
              <div
                key={`${uploadingFile.file.name}-${index}`}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border",
                  uploadingFile.status === "error" && "border-destructive bg-destructive/5",
                  uploadingFile.status === "done" && "border-green-500 bg-green-500/5"
                )}
              >
                <div className={cn(
                  "p-2 rounded-lg",
                  uploadingFile.status === "error" ? "bg-destructive/10 text-destructive" : "bg-muted"
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {uploadingFile.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(uploadingFile.file.size)}
                  </p>
                  {uploadingFile.status === "uploading" && (
                    <Progress
                      value={uploadingFile.progress}
                      className="h-1 mt-1"
                    />
                  )}
                  {uploadingFile.status === "error" && (
                    <p className="text-xs text-destructive">
                      {uploadingFile.error}
                    </p>
                  )}
                </div>
                {uploadingFile.status === "uploading" ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : uploadingFile.status === "done" ? (
                  <span className="text-xs text-green-500 font-medium">Done</span>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeFile(uploadingFile.file)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
