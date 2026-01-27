import { createUploadthing, type FileRouter } from "uploadthing/next";
import { auth } from "@/lib/auth";

const f = createUploadthing();

// Middleware to check auth
const authMiddleware = async () => {
  const session = await auth();
  
  if (!session?.user?.id) throw new Error("Unauthorized");

  return { userId: session.user.id };
};

// FileRouter for your app
export const ourFileRouter = {
  // For task attachments
  taskAttachment: f({
    image: { maxFileSize: "8MB", maxFileCount: 10 },
    pdf: { maxFileSize: "16MB", maxFileCount: 5 },
    text: { maxFileSize: "4MB", maxFileCount: 5 },
    "application/msword": { maxFileSize: "16MB", maxFileCount: 5 },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      maxFileSize: "16MB",
      maxFileCount: 5,
    },
    "application/vnd.ms-excel": { maxFileSize: "16MB", maxFileCount: 5 },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
      maxFileSize: "16MB",
      maxFileCount: 5,
    },
  })
    .middleware(authMiddleware)
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata.userId);
      console.log("File url:", file.url);
      
      return { uploadedBy: metadata.userId, url: file.url };
    }),

  // For workspace images
  workspaceImage: f({
    image: { maxFileSize: "4MB", maxFileCount: 1 },
  })
    .middleware(authMiddleware)
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.url };
    }),

  // For user avatars
  avatar: f({
    image: { maxFileSize: "2MB", maxFileCount: 1 },
  })
    .middleware(authMiddleware)
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
