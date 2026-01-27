import Pusher from "pusher";
import PusherClient from "pusher-js";

// Server-side Pusher instance (lazy initialization)
let pusherServerInstance: Pusher | null = null;

export const getPusherServer = () => {
  if (!pusherServerInstance) {
    console.log("[Pusher] Creating server instance with:", {
      appId: process.env.PUSHER_APP_ID,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY,
      secret: process.env.PUSHER_SECRET ? "SET" : "NOT SET",
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    });
    
    pusherServerInstance = new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      useTLS: true,
    });
  }
  return pusherServerInstance;
};

// For backward compatibility
export const pusherServer = {
  trigger: async (channel: string, event: string, data: any) => {
    return getPusherServer().trigger(channel, event, data);
  }
};

// Client-side Pusher instance (singleton)
let pusherClientInstance: PusherClient | null = null;

export const getPusherClient = () => {
  if (!pusherClientInstance) {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    
    console.log("[Pusher] Creating client instance with key:", key, "cluster:", cluster);
    
    if (!key || !cluster) {
      console.error("[Pusher] ❌ Missing env vars! key:", key, "cluster:", cluster);
      throw new Error("Missing Pusher configuration");
    }
    
    // Enable Pusher logging for debugging
    PusherClient.logToConsole = true;
    
    pusherClientInstance = new PusherClient(key, { cluster });
  }
  return pusherClientInstance;
};

// Channel names
export const getTaskChannel = (taskId: string) => `task-${taskId}`;
export const getWorkspaceChannel = (workspaceId: string) => `workspace-${workspaceId}`;
export const getUserChannel = (userId: string) => `user-${userId}`;

// Event names
export const PUSHER_EVENTS = {
  COMMENT_CREATED: "comment:created",
  COMMENT_UPDATED: "comment:updated",
  COMMENT_DELETED: "comment:deleted",
  TASK_UPDATED: "task:updated",
  NOTIFICATION_NEW: "notification:new",
} as const;
