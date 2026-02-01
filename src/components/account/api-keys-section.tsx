"use client";

import { useState, useEffect } from "react";
import {
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Calendar,
  Clock,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog";
import { toast } from "sonner";
import {
  createApiKey,
  getUserApiKeys,
  deleteApiKey,
} from "@/lib/actions/api-keys";
import { formatDistanceToNow } from "date-fns";

interface ApiKey {
  id: string;
  name: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  isExpired: boolean;
}

export function ApiKeysSection() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyExpiresInDays, setNewKeyExpiresInDays] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [showNewKey, setShowNewKey] = useState(false);

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    setLoading(true);
    try {
      const result = await getUserApiKeys();
      if (result.success) {
        setKeys(result.keys as ApiKey[]);
      }
    } catch (error) {
      console.error("Error loading API keys:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast.error("Please enter a name for the API key");
      return;
    }

    setCreating(true);
    try {
      const result = await createApiKey({
        name: newKeyName.trim(),
        expiresInDays: newKeyExpiresInDays || undefined,
      });

      if (result.success && result.apiKey) {
        setNewKeyValue(result.apiKey);
        setShowNewKey(true);
        setNewKeyName("");
        setNewKeyExpiresInDays(null);
        await loadKeys();
        toast.success("API key created successfully!");
      } else {
        toast.error(result.error || "Failed to create API key");
      }
    } catch (error) {
      toast.error("Failed to create API key");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm("Are you sure you want to delete this API key? This action cannot be undone.")) {
      return;
    }

    try {
      const result = await deleteApiKey(keyId);
      if (result.success) {
        toast.success("API key deleted successfully");
        await loadKeys();
      } else {
        toast.error(result.error || "Failed to delete API key");
      }
    } catch (error) {
      toast.error("Failed to delete API key");
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
    setNewKeyName("");
    setNewKeyExpiresInDays(null);
    setNewKeyValue(null);
    setShowNewKey(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                API Keys
              </CardTitle>
              <CardDescription>
                Manage API keys for IDE extensions and integrations
              </CardDescription>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Key
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <div className="text-center py-8">
              <Key className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground mb-4">No API keys yet</p>
              <Button onClick={() => setCreateDialogOpen(true)} variant="outline">
                Create your first API key
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{key.name}</p>
                      {key.isExpired && (
                        <Badge variant="destructive" className="text-xs">
                          Expired
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Created {formatDistanceToNow(new Date(key.createdAt), { addSuffix: true })}
                      </span>
                      {key.lastUsedAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Last used {formatDistanceToNow(new Date(key.lastUsedAt), { addSuffix: true })}
                        </span>
                      )}
                      {key.expiresAt && (
                        <span className="flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Expires {formatDistanceToNow(new Date(key.expiresAt), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteKey(key.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create API Key Dialog */}
      <ResponsiveDialog open={createDialogOpen} onOpenChange={handleCloseCreateDialog}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Create API Key</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {newKeyValue
                ? "Copy your API key now. You won't be able to see it again!"
                : "Create a new API key for IDE extensions and integrations"}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogBody>
            {newKeyValue ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm mb-1">Important: Save this key</p>
                      <p className="text-xs text-muted-foreground">
                        This is the only time you'll be able to see this API key. Make sure to copy it now.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Your API Key</Label>
                  <div className="relative">
                    <Input
                      type={showNewKey ? "text" : "password"}
                      value={newKeyValue}
                      readOnly
                      className="font-mono pr-20"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setShowNewKey(!showNewKey)}
                      >
                        {showNewKey ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => copyToClipboard(newKeyValue)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">
                    Use this key in your IDE extension or API client with the header:
                  </p>
                  <code className="text-xs mt-2 block p-2 bg-background rounded border">
                    Authorization: Bearer {newKeyValue.slice(0, 20)}...
                  </code>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    placeholder="e.g., VS Code Extension"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Give this key a descriptive name to identify where it's used
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Expires In (Optional)</Label>
                  <Input
                    type="number"
                    placeholder="Days (leave empty for never)"
                    value={newKeyExpiresInDays || ""}
                    onChange={(e) =>
                      setNewKeyExpiresInDays(
                        e.target.value ? parseInt(e.target.value) : null
                      )
                    }
                    min="1"
                  />
                  <p className="text-xs text-muted-foreground">
                    Set expiration in days. Leave empty for keys that never expire.
                  </p>
                </div>
              </div>
            )}
          </ResponsiveDialogBody>
          <ResponsiveDialogFooter>
            {newKeyValue ? (
              <Button onClick={handleCloseCreateDialog} className="w-full">
                Done
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={handleCloseCreateDialog}>
                  Cancel
                </Button>
                <Button onClick={handleCreateKey} disabled={creating || !newKeyName.trim()}>
                  {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Key
                </Button>
              </>
            )}
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
}
