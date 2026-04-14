import { useState } from "react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { generateSlots, type Slot } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Lock, Unlock } from "lucide-react";
import { toast } from "sonner";

export default function AdminSlots() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [slots, setSlots] = useState<Slot[]>(generateSlots(new Date()));

  const handleDateChange = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
    setSlots(generateSlots(date));
  };

  const toggleSlot = (id: string) => {
    setSlots((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isAvailable: !s.isAvailable } : s))
    );
    const slot = slots.find((s) => s.id === id);
    toast.success(`Slot ${slot?.startTime} ${slot?.isAvailable ? "blocked" : "unblocked"}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-6">
        <div>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateChange}
            className="rounded-xl border border-border bg-card p-4 pointer-events-auto"
          />
        </div>
        <div className="flex-1">
          <h3 className="font-heading font-semibold text-foreground mb-4">
            Slots for {format(selectedDate, "EEEE, MMMM d, yyyy")}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {slots.map((slot) => (
              <div
                key={slot.id}
                className={`p-4 rounded-xl border transition-all ${
                  slot.isAvailable ? "bg-card border-primary/20" : "bg-muted/30 border-border"
                }`}
              >
                <p className="font-semibold text-foreground text-sm">{slot.startTime} – {slot.endTime}</p>
                <p className="text-xs text-muted-foreground mb-2">₹{slot.price}</p>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium ${slot.isAvailable ? "text-primary" : "text-destructive"}`}>
                    {slot.isAvailable ? "Available" : "Blocked"}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => toggleSlot(slot.id)} className="h-7 w-7 p-0">
                    {slot.isAvailable ? <Lock className="w-3.5 h-3.5 text-muted-foreground" /> : <Unlock className="w-3.5 h-3.5 text-primary" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
