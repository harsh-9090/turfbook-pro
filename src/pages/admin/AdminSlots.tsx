import { useState, useEffect } from "react";
import { format, parse, isAfter, isBefore, differenceInSeconds } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { type FacilityType, facilityLabels } from "@/lib/mock-data";
import { Lock, Unlock, Plus, CalendarIcon, User, Phone, CreditCard, Clock } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

export default function AdminSlots() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [facility, setFacility] = useState<FacilityType>("cricket");
  const [slots, setSlots] = useState<any[]>([]);

  const fetchSlots = async (date: Date) => {
    try {
      const response = await api.get(`/slots?date=${format(date, "yyyy-MM-dd")}`);
      const mapped = response.data
        .filter((s: any) => s.facility_type === facility || !s.facility_type) // Filter logic based on response
        .map((s: any) => ({
          id: s.id,
          turf_id: s.turf_id,
          startTime: s.start_time?.substring(0, 5) || "",
          endTime: s.end_time?.substring(0, 5) || "",
          isAvailable: s.is_available,
          price: Number(s.price),
          isBooked: s.is_booked,
          userName: s.user_name,
          phone: s.phone,
          paymentStatus: s.payment_status
      }));
      setSlots(mapped);
    } catch(e) {
      toast.error('Failed to load slots');
    }
  };

  useEffect(() => {
    fetchSlots(selectedDate);
  }, [selectedDate, facility]);

  // Live Timer Telemetry
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleDateChange = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
  };

  const handleFacilityChange = (f: FacilityType) => {
    setFacility(f);
  };

  const toggleSlot = async (id: string) => {
    try {
      const res = await api.patch(`/slots/${id}/toggle`);
      const updatedSlot = res.data;
      setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, isAvailable: updatedSlot.is_available } : s)));
      toast.success(`Slot successfully ${updatedSlot.is_available ? "unblocked" : "blocked"}`);
    } catch(e) {
      toast.error('Failed to toggle slot');
    }
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [formData, setFormData] = useState({ id: "", startTime: "10:00", endTime: "11:00", price: "800" });

  const openModal = (mode: "add" | "edit", slot?: any) => {
    setModalMode(mode);
    if (slot) {
      setFormData({ id: slot.id, startTime: slot.startTime, endTime: slot.endTime, price: slot.price.toString() });
    } else {
      setFormData({ id: "", startTime: "10:00", endTime: "11:00", price: "800" });
    }
    setIsModalOpen(true);
  };

  const handleSaveSlot = async () => {
    try {
      if (modalMode === "add") {
        const payload = {
          turf_id: slots[0]?.turf_id, // Safely use the existing active turf context!
          date: format(selectedDate, "yyyy-MM-dd"),
          start_time: formData.startTime,
          end_time: formData.endTime,
          price: Number(formData.price),
          is_available: true
        };
        await api.post('/slots', payload);
        toast.success("Custom slot created!");
      } else {
        await api.patch(`/slots/${formData.id}`, {
          start_time: formData.startTime,
          end_time: formData.endTime,
          price: Number(formData.price)
        });
        toast.success("Slot updated!");
      }
      setIsModalOpen(false);
      fetchSlots(selectedDate);
    } catch (e: any) {
      toast.error(e.response?.data?.error || "Failed to save slot");
    }
  };

  const deleteSlot = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this slot?")) return;
    try {
      await api.delete(`/slots/${id}`);
      setSlots((prev) => prev.filter((s) => s.id !== id));
      toast.success("Slot deleted");
    } catch (e) {
      toast.error("Failed to delete slot");
    }
  };

  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectTarget, setInspectTarget] = useState<any>(null);

  const handleCardClick = (slot: any) => {
    if (slot.isBooked) {
      setInspectTarget(slot);
      setInspectorOpen(true);
    }
  };

  const formatCountdown = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  return (
    <div className="space-y-6">
      {/* Facility filter */}
      <div className="flex gap-2">
        {(["cricket", "snooker", "pool"] as FacilityType[]).map((f) => (
          <Button key={f} size="sm" variant={facility === f ? "default" : "outline"}
            onClick={() => handleFacilityChange(f)}
            className={facility === f ? "bg-gradient-turf text-primary-foreground" : ""}>
            {facilityLabels[f]}
          </Button>
        ))}
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex-1 w-full mt-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div className="flex flex-col gap-1">
              <h3 className="font-heading font-semibold text-lg text-foreground">
                {facilityLabels[facility]} Manage Overrides
              </h3>
              <p className="text-sm text-muted-foreground">Select a specific date to manually block slots or add irregular timings.</p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal w-[240px] bg-card border-border">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-card border-border">
                  <Calendar 
                    mode="single" 
                    selected={selectedDate} 
                    onSelect={handleDateChange}
                    className="rounded-xl border border-border pointer-events-auto" 
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Button onClick={() => openModal("add")} className="bg-gradient-turf text-primary-foreground shadow-turf h-10 w-full sm:w-auto px-4">
                <Plus className="w-4 h-4 mr-2" /> Custom Slot
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {slots.map((slot) => {
              // Mathematical Telemetry Logic
              const startDateTime = parse(`${format(selectedDate, "yyyy-MM-dd")} ${slot.startTime}`, "yyyy-MM-dd HH:mm", new Date());
              const endDateTime = parse(`${format(selectedDate, "yyyy-MM-dd")} ${slot.endTime}`, "yyyy-MM-dd HH:mm", new Date());
              const isRunning = slot.isBooked && isAfter(now, startDateTime) && isBefore(now, endDateTime);
              const isPast = isAfter(now, endDateTime);
              const remainingSecs = isRunning ? differenceInSeconds(endDateTime, now) : 0;

              return (
                <div key={slot.id} onClick={() => handleCardClick(slot)}
                  className={`relative p-4 rounded-xl border transition-all duration-300 overflow-hidden flex flex-col ${
                    slot.isBooked 
                      ? "bg-primary/10 border-primary/40 cursor-pointer hover:border-primary" 
                      : isPast && slot.isAvailable
                        ? "bg-amber-500/5 border-amber-500/20"
                      : slot.isAvailable 
                        ? "bg-card border-border hover:border-primary/30" 
                        : "bg-destructive/5 border-destructive/20"
                  } ${isRunning ? 'ring-2 ring-green-500/60 ring-offset-2 ring-offset-background' : ''}`}>
                  
                  {isRunning && (
                    <div className="flex items-center gap-1.5 text-green-500 font-bold text-[10px] uppercase tracking-wider mb-3 bg-green-500/10 w-fit px-2 py-1 rounded-md animate-pulse">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping"></div>
                      Live • {formatCountdown(remainingSecs)}
                    </div>
                  )}

                  <p className={`font-heading font-bold text-lg ${isPast && !isRunning ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                    {slot.startTime} <span className="text-muted-foreground text-sm font-normal mx-1">to</span> {slot.endTime}
                  </p>
                  <p className="text-sm text-muted-foreground font-medium mb-4 mt-1">₹{slot.price}</p>
                  
                  <div className="flex items-center justify-between mt-auto">
                    {slot.isBooked ? (
                      <span className="text-[10px] uppercase tracking-wider font-bold text-primary flex items-center gap-1.5 bg-primary/20 px-2.5 py-1 rounded-md">
                        <Lock className="w-3 h-3" /> Booked
                      </span>
                    ) : (
                      <>
                        <span className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-md ${
                          isPast && slot.isAvailable ? "text-amber-500 bg-amber-500/10" 
                          : slot.isAvailable ? "text-emerald-400 bg-emerald-500/10" 
                          : "text-destructive bg-destructive/10"
                        }`}>
                          {isPast && slot.isAvailable ? "Expired" : slot.isAvailable ? "Available" : "Blocked"}
                        </span>
                        {!isPast && (
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-muted-foreground hover:text-foreground z-10 relative" 
                              onClick={(e) => { e.stopPropagation(); toggleSlot(slot.id); }}>
                              {slot.isAvailable ? <><Lock className="w-3.5 h-3.5 mr-1" /> <span className="text-xs">Block</span></> : <><Unlock className="w-3.5 h-3.5 text-foreground mr-1" /> <span className="text-xs">Unblock</span></>}
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{modalMode === "add" ? "Add Custom Slot" : "Edit Slot Details"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input type="time" value={formData.startTime} onChange={(e) => setFormData({...formData, startTime: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input type="time" value={formData.endTime} onChange={(e) => setFormData({...formData, endTime: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Price (₹)</Label>
              <Input type="number" placeholder="Enter amount" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSlot} className="bg-gradient-turf text-primary-foreground shadow-turf">
              {modalMode === "add" ? "Create Slot" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inspector Details Dialog */}
      <Dialog open={inspectorOpen} onOpenChange={setInspectorOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Booking Inspector</DialogTitle>
          </DialogHeader>
          {inspectTarget && (
            <div className="grid gap-5 py-4">
              <div className="flex items-center gap-3 bg-muted/40 p-3 rounded-lg border border-border">
                <Clock className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Slot Time</p>
                  <p className="font-semibold text-foreground">{inspectTarget.startTime} to {inspectTarget.endTime}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Booked By</p>
                    <p className="font-medium text-foreground">{inspectTarget.userName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Phone className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Contact Number</p>
                    <p className="font-medium text-foreground">{inspectTarget.phone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Payment Status</p>
                    <p className="font-medium capitalize text-foreground">
                      {inspectTarget.paymentStatus} 
                      <span className="text-muted-foreground ml-2">(₹{inspectTarget.price})</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setInspectorOpen(false)} className="w-full bg-primary text-primary-foreground">Close Inspector</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
