import React from "react";
import { format, subDays, startOfMonth, startOfYear } from "date-fns";
import { Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AdminDateFilterProps {
  onFilterChange: (start: string, end: string) => void;
}

export function AdminDateFilter({ onFilterChange }: AdminDateFilterProps) {
  const [range, setRange] = React.useState("month");
  const [startDate, setStartDate] = React.useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = React.useState(format(new Date(), "yyyy-MM-dd"));

  const applyPreset = (value: string) => {
    setRange(value);
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (value) {
      case "today":
        start = now;
        break;
      case "yesterday":
        start = subDays(now, 1);
        end = subDays(now, 1);
        break;
      case "week":
        start = subDays(now, 7);
        break;
      case "month":
        start = startOfMonth(now);
        break;
      case "year":
        start = startOfYear(now);
        break;
      case "custom":
        return;
    }

    const startStr = format(start, "yyyy-MM-dd");
    const endStr = format(end, "yyyy-MM-dd");
    setStartDate(startStr);
    setEndDate(endStr);
    onFilterChange(startStr, endStr);
  };

  const handleCustomChange = (type: "start" | "end", date: string) => {
    if (type === "start") setStartDate(date);
    else setEndDate(date);
  };

  return (
    <div className="bg-card p-3 rounded-xl border border-border shadow-sm w-full xl:w-auto">
      {/* Row 1: Label + Select + Desktop pickers */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground shrink-0">
          <Filter className="w-4 h-4 text-primary" />
          <span className="whitespace-nowrap hidden sm:inline">Filter Period</span>
        </div>

        <Select value={range} onValueChange={applyPreset}>
          <SelectTrigger className="w-[140px] h-9 text-xs bg-muted/50 border-border/50 shrink-0">
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="yesterday">Yesterday</SelectItem>
            <SelectItem value="week">Last 7 Days</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>

        {/* Desktop: inline date pickers (xl and up) */}
        <div className={cn(
          "hidden xl:flex items-center gap-2 transition-all duration-300",
          range !== "custom" ? "opacity-30 pointer-events-none grayscale" : "opacity-100"
        )}>
          <DatePicker 
            date={startDate} 
            setDate={(d) => handleCustomChange("start", d ? format(d, "yyyy-MM-dd") : "")}
            className="w-[130px] h-9 text-[11px]"
          />
          <span className="text-muted-foreground text-[10px] uppercase font-bold shrink-0">to</span>
          <DatePicker 
            date={endDate} 
            setDate={(d) => handleCustomChange("end", d ? format(d, "yyyy-MM-dd") : "")}
            className="w-[130px] h-9 text-[11px]"
          />
          {range === "custom" && (
            <Button 
              size="sm" 
              className="h-9 text-xs px-5 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => onFilterChange(startDate, endDate)}
            >
              Apply
            </Button>
          )}
        </div>
      </div>

      {/* Row 2: Mobile/Tablet date pickers (below xl) */}
      <div className={cn(
        "xl:hidden mt-3 transition-all duration-300",
        range !== "custom" ? "opacity-30 pointer-events-none grayscale" : "opacity-100"
      )}>
        <div className="flex items-center gap-2">
          <DatePicker 
            date={startDate} 
            setDate={(d) => handleCustomChange("start", d ? format(d, "yyyy-MM-dd") : "")}
            className="flex-1 h-9 text-[11px]"
          />
          <span className="text-muted-foreground text-[10px] uppercase font-bold shrink-0">to</span>
          <DatePicker 
            date={endDate} 
            setDate={(d) => handleCustomChange("end", d ? format(d, "yyyy-MM-dd") : "")}
            className="flex-1 h-9 text-[11px]"
          />
        </div>
        {range === "custom" && (
          <Button 
            size="sm" 
            className="w-full mt-2 h-9 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => onFilterChange(startDate, endDate)}
          >
            Apply
          </Button>
        )}
      </div>
    </div>
  );
}
