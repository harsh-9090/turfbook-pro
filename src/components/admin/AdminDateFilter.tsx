import React from "react";
import { format, subDays, startOfMonth, startOfYear } from "date-fns";
import { Calendar as CalendarIcon, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";

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
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-card p-3 rounded-xl border border-border shadow-sm">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mr-1">
        <Filter className="w-4 h-4" />
        <span>Filter Period</span>
      </div>

      <Select value={range} onValueChange={applyPreset}>
        <SelectTrigger className="w-[140px] h-9 text-xs">
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

      <div className={`flex items-center gap-2 ${range !== "custom" ? "opacity-50 pointer-events-none" : ""}`}>
        <DatePicker 
          date={startDate} 
          setDate={(d) => handleCustomChange("start", d ? format(d, "yyyy-MM-dd") : "")}
          className="w-[130px] h-9 text-xs"
        />
        <span className="text-muted-foreground text-xs">to</span>
        <DatePicker 
          date={endDate} 
          setDate={(d) => handleCustomChange("end", d ? format(d, "yyyy-MM-dd") : "")}
          className="w-[130px] h-9 text-xs"
        />
      </div>
      
      {range === "custom" && (
        <Button 
          variant="secondary" 
          size="sm" 
          className="h-8 text-xs px-3"
          onClick={() => onFilterChange(startDate, endDate)}
        >
          Apply
        </Button>
      )}
    </div>
  );
}
