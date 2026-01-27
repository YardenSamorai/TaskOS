// Simple event emitter for real-time updates
// In production, consider using Redis pub/sub for scalability across multiple server instances

type EventCallback = (data: any) => void;

class EventEmitter {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  subscribe(channel: string, callback: EventCallback): () => void {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }
    this.listeners.get(channel)!.add(callback);

    // Return unsubscribe function
    return () => {
      const channelListeners = this.listeners.get(channel);
      if (channelListeners) {
        channelListeners.delete(callback);
        if (channelListeners.size === 0) {
          this.listeners.delete(channel);
        }
      }
    };
  }

  emit(channel: string, data: any): void {
    const channelListeners = this.listeners.get(channel);
    if (channelListeners) {
      channelListeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error("Error in event listener:", error);
        }
      });
    }
  }

  // Get number of listeners for a channel (for debugging)
  getListenerCount(channel: string): number {
    return this.listeners.get(channel)?.size || 0;
  }
}

// Global singleton instance
export const eventEmitter = new EventEmitter();

// Channel helpers
export const getTaskCommentsChannel = (taskId: string) => `task:${taskId}:comments`;
export const getTaskChannel = (taskId: string) => `task:${taskId}`;
export const getWorkspaceChannel = (workspaceId: string) => `workspace:${workspaceId}`;

// Event types
export type CommentEvent = {
  type: "comment_created" | "comment_updated" | "comment_deleted";
  comment?: any;
  commentId?: string;
};

export type TaskEvent = {
  type: "task_updated" | "task_deleted";
  task?: any;
  taskId?: string;
};
