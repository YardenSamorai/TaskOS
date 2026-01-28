"use client";

import { useState, useEffect } from "react";
import { CheckSquare, Plus, Trash2, Check, ChevronDown, Flag, Link as LinkIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { 
  getTodos, 
  createTodo, 
  toggleTodo, 
  deleteTodo,
  type TodoWithLinkedTask
} from "@/lib/actions/todo";

const priorityColors = {
  low: "bg-slate-500",
  medium: "bg-blue-500",
  high: "bg-orange-500",
  urgent: "bg-red-500",
};

export const TodosCard = () => {
  const [todos, setTodos] = useState<TodoWithLinkedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [activeOpen, setActiveOpen] = useState(true);
  const [completedOpen, setCompletedOpen] = useState(false);

  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      const result = await getTodos();
      if (result.success) {
        setTodos(result.todos);
      }
    } catch (error) {
      console.error("Error fetching todos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTodo = async () => {
    if (!newTodoTitle.trim()) return;

    try {
      const result = await createTodo({ 
        title: newTodoTitle.trim(),
      });
      if (result.success && result.todo) {
        setTodos([result.todo as TodoWithLinkedTask, ...todos]);
        setNewTodoTitle("");
        setIsAdding(false);
        toast.success("To-do added");
      }
    } catch (error) {
      toast.error("Failed to add to-do");
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const result = await toggleTodo(id);
      if (result) {
        setTodos(todos.map(t => 
          t.id === id ? { ...t, completed: !t.completed } : t
        ));
      }
    } catch (error) {
      toast.error("Failed to update to-do");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const result = await deleteTodo(id);
      if (result.success) {
        setTodos(todos.filter(t => t.id !== id));
        toast.success("To-do deleted");
      }
    } catch (error) {
      toast.error("Failed to delete to-do");
    }
  };

  // Separate active and completed todos
  const activeTodos = todos.filter(t => !t.completed);
  const completedTodos = todos.filter(t => t.completed);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckSquare className="w-5 h-5 text-muted-foreground" />
            To-Do
          </CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add todo input */}
        {isAdding && (
          <div className="flex items-center gap-2">
            <Input
              value={newTodoTitle}
              onChange={(e) => setNewTodoTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="flex-1"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddTodo();
                if (e.key === "Escape") setIsAdding(false);
              }}
            />
            <Button size="sm" onClick={handleAddTodo}>
              Add
            </Button>
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Active todos section */}
            <Collapsible open={activeOpen} onOpenChange={setActiveOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <ChevronDown className={cn(
                  "w-4 h-4 transition-transform",
                  !activeOpen && "-rotate-90"
                )} />
                <span className="text-sm font-medium">Active</span>
                <Badge variant="secondary" className="text-xs">
                  {activeTodos.length}
                </Badge>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-1">
                {activeTodos.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-2 pl-6">
                    All done! Add a new to-do above.
                  </p>
                ) : (
                  activeTodos.map((todo) => (
                    <TodoItem
                      key={todo.id}
                      todo={todo}
                      onToggle={() => handleToggle(todo.id)}
                      onDelete={() => handleDelete(todo.id)}
                    />
                  ))
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Completed todos section */}
            {completedTodos.length > 0 && (
              <Collapsible open={completedOpen} onOpenChange={setCompletedOpen}>
                <CollapsibleTrigger className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronDown className={cn(
                    "w-4 h-4 transition-transform",
                    !completedOpen && "-rotate-90"
                  )} />
                  <span className="text-sm font-medium">Completed</span>
                  <Badge variant="secondary" className="text-xs">
                    {completedTodos.length}
                  </Badge>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-1">
                  {completedTodos.map((todo) => (
                    <TodoItem
                      key={todo.id}
                      todo={todo}
                      onToggle={() => handleToggle(todo.id)}
                      onDelete={() => handleDelete(todo.id)}
                    />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

interface TodoItemProps {
  todo: TodoWithLinkedTask;
  onToggle: () => void;
  onDelete: () => void;
}

const TodoItem = ({ todo, onToggle, onDelete }: TodoItemProps) => {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group">
      <button
        onClick={onToggle}
        className={cn(
          "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0",
          todo.completed
            ? "bg-primary border-primary"
            : "border-muted-foreground/30 hover:border-primary"
        )}
      >
        {todo.completed && <Check className="w-3 h-3 text-primary-foreground" />}
      </button>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-sm transition-colors truncate",
            todo.completed ? "text-muted-foreground line-through" : ""
          )}>
            {todo.title}
          </span>
          {todo.priority && todo.priority !== "medium" && (
            <div className={cn(
              "w-2 h-2 rounded-full shrink-0",
              priorityColors[todo.priority as keyof typeof priorityColors]
            )} />
          )}
        </div>
        {todo.linkedTask && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            <LinkIcon className="w-3 h-3" />
            <span className="truncate">{todo.linkedTask.title}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};
