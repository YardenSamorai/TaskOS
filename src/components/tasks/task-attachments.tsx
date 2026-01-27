"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Paperclip, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { FileUpload } from "@/components/files/file-upload";
import { FileList } from "@/components/files/file-list";
import type { Task, Attachment, User } from "@/lib/db/schema";

interface AttachmentWithUser extends Attachment {
  uploader?: User;
}

interface TaskWithAttachments extends Task {
  attachments: AttachmentWithUser[];
}

interface TaskAttachmentsProps {
  task: TaskWithAttachments;
}

export const TaskAttachments = ({ task }: TaskAttachmentsProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const router = useRouter();
  const t = useTranslations("files");

  const handleUploadComplete = () => {
    router.refresh();
    setShowUpload(false);
  };

  const handleDelete = () => {
    router.refresh();
  };

  // Transform attachments for FileList
  const formattedAttachments = task.attachments.map((a) => ({
    id: a.id,
    name: a.name,
    url: a.url,
    fileType: a.type,
    fileSize: a.size,
    createdAt: a.createdAt,
    uploadedBy: a.uploader
      ? {
          id: a.uploader.id,
          name: a.uploader.name,
          image: a.uploader.image,
        }
      : undefined,
  }));

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="p-0 hover:bg-transparent">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Paperclip className="w-5 h-5" />
                  {t("title")}
                  {task.attachments.length > 0 && (
                    <span className="text-sm text-muted-foreground font-normal">
                      ({task.attachments.length})
                    </span>
                  )}
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </CardTitle>
              </Button>
            </CollapsibleTrigger>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUpload(!showUpload)}
            >
              {showUpload ? t("cancel") : t("upload")}
            </Button>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Upload area */}
            {showUpload && (
              <FileUpload
                taskId={task.id}
                onUploadComplete={handleUploadComplete}
              />
            )}

            {/* File list */}
            <FileList
              attachments={formattedAttachments}
              onDelete={handleDelete}
              canDelete={true}
            />
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
