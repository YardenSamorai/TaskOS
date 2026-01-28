"use client";

import { useState, useEffect } from "react";
import { Target, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getGoals, createGoal, updateGoalProgress } from "@/lib/actions/goal";

interface Goal {
  id: string;
  title: string;
  description: string | null;
  targetValue: number;
  currentValue: number;
  unit: string | null;
  workspace?: { name: string } | null;
}

interface GoalsCardProps {
  workspaceId?: string;
}

export const GoalsCard = ({ workspaceId }: GoalsCardProps) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: "",
    targetValue: 100,
    unit: "%",
  });

  useEffect(() => {
    fetchGoals();
  }, [workspaceId]);

  const fetchGoals = async () => {
    try {
      const result = await getGoals({ workspaceId });
      if (result.success) {
        setGoals(result.goals as Goal[]);
      }
    } catch (error) {
      console.error("Error fetching goals:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async () => {
    if (!newGoal.title.trim()) return;

    try {
      const result = await createGoal({
        title: newGoal.title.trim(),
        targetValue: newGoal.targetValue,
        unit: newGoal.unit,
        workspaceId,
      });
      if (result.success && result.goal) {
        setGoals([result.goal as Goal, ...goals]);
        setDialogOpen(false);
        setNewGoal({ title: "", targetValue: 100, unit: "%" });
        toast.success("Goal created");
      }
    } catch (error) {
      toast.error("Failed to create goal");
    }
  };

  // Get progress color based on percentage
  const getProgressColor = (percent: number) => {
    if (percent >= 75) return "bg-emerald-500";
    if (percent >= 50) return "bg-amber-500";
    if (percent >= 25) return "bg-orange-500";
    return "bg-rose-500";
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="w-5 h-5 text-muted-foreground" />
              My goals
            </CardTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
          ) : goals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No goals yet</p>
              <Button 
                variant="ghost" 
                className="mt-2"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add your first goal
              </Button>
            </div>
          ) : (
            goals.slice(0, 5).map((goal) => {
              const percent = Math.round((goal.currentValue / goal.targetValue) * 100);
              return (
                <div key={goal.id} className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">
                        {goal.title}
                      </h4>
                      {goal.workspace && (
                        <p className="text-muted-foreground text-xs mt-0.5">
                          {goal.workspace.name}
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-semibold ml-3">
                      {percent}%
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        getProgressColor(percent)
                      )}
                      style={{ width: `${Math.min(percent, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Create Goal Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Goal</DialogTitle>
            <DialogDescription>
              Set a goal to track your progress
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="goal-title">Goal Title</Label>
              <Input
                id="goal-title"
                value={newGoal.title}
                onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                placeholder="e.g., Complete 10 tasks this week"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="goal-target">Target Value</Label>
                <Input
                  id="goal-target"
                  type="number"
                  value={newGoal.targetValue}
                  onChange={(e) => setNewGoal({ ...newGoal, targetValue: parseInt(e.target.value) || 100 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal-unit">Unit</Label>
                <Input
                  id="goal-unit"
                  value={newGoal.unit}
                  onChange={(e) => setNewGoal({ ...newGoal, unit: e.target.value })}
                  placeholder="%"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateGoal} disabled={!newGoal.title.trim()}>
              Create Goal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
