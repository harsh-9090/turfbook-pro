import React from "react";
import { format, subDays, startOfMonth, startOfYear } from "date-fns";
import { Calendar as CalendarIcon, Filter } from "lucide-react";
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
        return; // Don't trigger change yet
    }

    const startStr = format(start, "yyyy-MM-dd");
    const endStr = format(end, "yyyy-MM-dd");
    setStartDate(startStr);
    setEndDate(endStr);
    onFilterChange(startStr, endStr);
  };

  const handleCustomChange = (type: "start" | "end", date: string) => {
    if (type === "start") {
      setStartDate(date);
      if (range === "custom") onFilterChange(date, endDate);
    } else {
      setEndDate(date);
      if (range === "custom") onFilterChange(startDate, date);
    }
  };

  return (
    <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-3 bg-card p-2 sm:p-3 rounded-xl border border-border shadow-sm w-full xl:w-auto">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground px-1 py-1">
        <Filter className="w-4 h-4 text-primary" />
        <span className="whitespace-nowrap">Filter Period</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={range} onValueChange={applyPreset}>
          <SelectTrigger className="w-full sm:w-[140px] h-9 text-xs bg-muted/50 border-border/50">
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

        <div className={cn(
          "flex flex-wrap items-center gap-2 flex-1 sm:flex-none transition-all duration-300 min-w-0",
          range !== "custom" ? "opacity-30 pointer-events-none grayscale" : "opacity-100"
        )}>
          <div className="flex items-center gap-1.5 flex-1 sm:flex-none min-w-0">
            <DatePicker 
              date={startDate} 
              setDate={(d) => handleCustomChange("start", d ? format(d, "yyyy-MM-dd") : "")}
              className="w-[110px] xs:w-[125px] h-9 text-[11px]"
            />
            <span className="text-muted-foreground text-[10px] uppercase font-bold px-0.5 shrink-0">to</span>
            <DatePicker 
              date={endDate} 
              setDate={(d) => handleCustomChange("end", d ? format(d, "yyyy-MM-dd") : "")}
              className="w-[110px] xs:w-[125px] h-9 text-[11px]"
            />
          </div>
          
          {range === "custom" && (
            <Button 
              variant="secondary" 
              size="sm" 
              className="h-9 text-xs px-4 bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto"
              onClick={() => onFilterChange(startDate, endDate)}
            >
              Apply
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
