"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCallback, useState } from "react";

export const TasksFilters = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("tasks");

  const [search, setSearch] = useState(searchParams.get("search") || "");

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(name, value);
      } else {
        params.delete(name);
      }
      return params.toString();
    },
    [searchParams]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(pathname + "?" + createQueryString("search", search));
  };

  const handleStatusChange = (value: string) => {
    router.push(pathname + "?" + createQueryString("status", value));
  };

  const handlePriorityChange = (value: string) => {
    router.push(pathname + "?" + createQueryString("priority", value));
  };

  const clearFilters = () => {
    setSearch("");
    router.push(pathname);
  };

  const hasFilters = searchParams.toString() !== "";

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="ps-9"
            />
          </div>
        </form>

        {/* Status filter */}
        <Select
          value={searchParams.get("status") || ""}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder={t("status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="backlog">{t("statuses.backlog")}</SelectItem>
            <SelectItem value="todo">{t("statuses.todo")}</SelectItem>
            <SelectItem value="in_progress">{t("statuses.in_progress")}</SelectItem>
            <SelectItem value="review">{t("statuses.review")}</SelectItem>
            <SelectItem value="done">{t("statuses.done")}</SelectItem>
          </SelectContent>
        </Select>

        {/* Priority filter */}
        <Select
          value={searchParams.get("priority") || ""}
          onValueChange={handlePriorityChange}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder={t("priority")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="low">{t("priorities.low")}</SelectItem>
            <SelectItem value="medium">{t("priorities.medium")}</SelectItem>
            <SelectItem value="high">{t("priorities.high")}</SelectItem>
            <SelectItem value="urgent">{t("priorities.urgent")}</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear filters */}
        {hasFilters && (
          <Button variant="ghost" onClick={clearFilters} className="gap-2">
            <X className="w-4 h-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Active filters */}
      {hasFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {searchParams.get("search") && (
            <Badge variant="secondary" className="gap-1">
              Search: {searchParams.get("search")}
              <button
                onClick={() => {
                  setSearch("");
                  router.push(pathname + "?" + createQueryString("search", ""));
                }}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {searchParams.get("status") && searchParams.get("status") !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Status: {searchParams.get("status")}
              <button onClick={() => handleStatusChange("")}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {searchParams.get("priority") && searchParams.get("priority") !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Priority: {searchParams.get("priority")}
              <button onClick={() => handlePriorityChange("")}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};
