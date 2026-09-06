"use client";

import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Filter, Search } from "lucide-react";
import type { DashboardOverview } from "@workspace/validations";

interface SearchAndFilterProps {
  onFilterChange: (value: DashboardOverview["sort"]) => void;
  onSearchChange: (value: string) => void;
  searchValue?: string;
}

export function SearchAndFilter({
  onFilterChange,
  onSearchChange,
  searchValue = "",
}: SearchAndFilterProps) {
  const handleFilterChange = (value: string) => {
    onFilterChange(value as DashboardOverview["sort"]);
  };

  return (
    <div className="flex items-center justify-center gap-3 w-full">
      <div className="relative flex-1">
        <Input
          placeholder="Search newsletters..."
          className="pl-10 py-5 w-full"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
      </div>

      <Select onValueChange={handleFilterChange} defaultValue="newest">
        <SelectTrigger className="w-auto h-10 px-3 py-5">
          <Filter className="w-4 h-4" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="name">Name</SelectItem>
          <SelectItem value="activity">Activity</SelectItem>
          <SelectItem value="newest">Newest</SelectItem>
          <SelectItem value="oldest">Oldest</SelectItem>
          <SelectItem value="revenue">Revenue</SelectItem>
          <SelectItem value="subscribers">Subscribers</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
