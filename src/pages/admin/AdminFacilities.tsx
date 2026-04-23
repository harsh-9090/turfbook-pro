import { useState, useEffect } from "react";
import { Plus, Trash2, Layers, Minus, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import api from "@/lib/api";

export default function AdminFacilities() {
  const [facilities, setFacilities] = useState<any[]>([]);
  const [type, setType] = useState("cricket");
  const [desc, setDesc] = useState("");
  const [weekdayDayPrice, setWeekdayDayPrice] = useState("800");
  const [weekdayNightPrice, setWeekdayNightPrice] = useState("1000");
  const [weekendDayPrice, setWeekendDayPrice] = useState("1000");
  const [weekendNightPrice, setWeekendNightPrice] = useState("1200");
  const [hourlyPrice, setHourlyPrice] = useState("150");
  const [tableCount, setTableCount] = useState("1");
  const [openingHour, setOpeningHour] = useState("8");
  const [closingHour, setClosingHour] = useState("23");
  const [minBookingAmount, setMinBookingAmount] = useState("0");
  const [isFormExpanded, setIsFormExpanded] = useState(false);

  const isHourlySettings = type === "snooker" || type === "pool";

  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [pricingTarget, setPricingTarget] = useState<any>(null);
  const [editPrices, setEditPrices] = useState({ wd_day: "", wd_night: "", we_day: "", we_night: "", min_booking_amount: "" });

  const fetchFacilities = async () => {
    try {
      const res = await api.get('/facilities');
      setFacilities(res.data);
    } catch (e) {
      toast.error('Failed to load facilities');
    }
  };

  useEffect(() => {
    fetchFacilities();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/facilities', {
        facility_type: type,
        description: desc,
        location: 'Dynamic Arena',
        weekday_day_price: Number(isHourlySettings ? hourlyPrice : weekdayDayPrice),
        weekday_night_price: Number(isHourlySettings ? hourlyPrice : weekdayNightPrice),
        weekend_day_price: Number(isHourlySettings ? hourlyPrice : weekendDayPrice),
        weekend_night_price: Number(isHourlySettings ? hourlyPrice : weekendNightPrice),
        table_count: isHourlySettings ? Number(tableCount) : 1,
        opening_hour: Number(openingHour),
        closing_hour: Number(closingHour),
        min_booking_amount: Number(minBookingAmount)
      });
      toast.success('Sports Event added & Slots autonomously synced!');
      setDesc('');
      setWeekdayDayPrice('800');
      setWeekdayNightPrice('1000');
      setWeekendDayPrice('1000');
      setWeekendNightPrice('1200');
      setHourlyPrice('150');
      setTableCount('1');
      setOpeningHour('8');
      setClosingHour('23');
      setMinBookingAmount('0');
      fetchFacilities();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to add sports event');
    }
  };

  const handleDelete = (id: string) => {
    toast("Are you sure you want to delete this event? All related slots will be broken if not handled!", {
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            await api.delete(`/facilities/${id}`);
            toast.success('Sports Event deleted');
            fetchFacilities();
          } catch (e) {
            toast.error('Failed to delete event');
          }
        }
      },
      cancel: { label: "Cancel", onClick: () => { } }
    });
  };

  const openPricingModal = (facility: any) => {
    setPricingTarget(facility);
    setEditPrices({
      wd_day: facility.weekday_day_price || "800",
      wd_night: facility.weekday_night_price || "1000",
      we_day: facility.weekend_day_price || "1000",
      we_night: facility.weekend_night_price || "1200",
      min_booking_amount: facility.min_booking_amount || "0",
    });
    setIsPricingModalOpen(true);
  };

  const handleSavePricing = async () => {
    try {
      const isHourlyPatch = pricingTarget?.facility_type === "snooker" || pricingTarget?.facility_type === "pool";
      await api.patch(`/facilities/${pricingTarget.id}/pricing`, {
        weekday_day_price: Number(isHourlyPatch ? editPrices.wd_day : editPrices.wd_day), // Using wd_day as the absolute hourly rate if snooker
        weekday_night_price: Number(isHourlyPatch ? editPrices.wd_day : editPrices.wd_night),
        weekend_day_price: Number(isHourlyPatch ? editPrices.wd_day : editPrices.we_day),
        weekend_night_price: Number(isHourlyPatch ? editPrices.wd_day : editPrices.we_night),
        min_booking_amount: Number(editPrices.min_booking_amount)
      });
      toast.success("Pricing meticulously updated and retroactively applied!");
      setIsPricingModalOpen(false);
      fetchFacilities();
    } catch (e) {
      toast.error("Failed to update pricing matrix");
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-card border border-border overflow-hidden">
        <button
          onClick={() => setIsFormExpanded(!isFormExpanded)}
          className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-muted/30 transition-colors"
        >
          <h3 className="font-heading font-semibold text-foreground">Add New Sports Event</h3>
          <div className="p-1 rounded-md bg-secondary text-muted-foreground sm:hidden">
            {isFormExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        <div className={`${isFormExpanded ? "block" : "hidden sm:block"} p-4 sm:p-5 pt-0 sm:pt-0 border-t border-border/50 sm:border-t-0`}>
          <form onSubmit={handleAdd} className="flex flex-col gap-4 mt-4 sm:mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold">Sport</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="w-full bg-card border-border h-10">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cricket">Cricket Turf</SelectItem>
                    <SelectItem value="snooker">Snooker Table</SelectItem>
                    <SelectItem value="pool">Pool Table</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold">Short Description</Label>
                <Input placeholder="Visual context for players..." value={desc} onChange={e => setDesc(e.target.value)} className="h-10" />
              </div>
            </div>

            {isHourlySettings ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold">Hourly Rate (₹)</Label>
                  <Input type="number" placeholder="250" value={hourlyPrice} onChange={e => setHourlyPrice(e.target.value)} className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold">Table Count</Label>
                  <Input type="number" min="1" placeholder="1" value={tableCount} onChange={e => setTableCount(e.target.value)} className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold">Min Booking Deposit (₹)</Label>
                  <Input type="number" placeholder="0" value={minBookingAmount} onChange={e => setMinBookingAmount(e.target.value)} className="h-10" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold">Wkday Day</Label>
                  <Input type="number" placeholder="800" value={weekdayDayPrice} onChange={e => setWeekdayDayPrice(e.target.value)} className="h-10 px-2" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold">Wkday Night</Label>
                  <Input type="number" placeholder="1000" value={weekdayNightPrice} onChange={e => setWeekdayNightPrice(e.target.value)} className="h-10 px-2" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold">Wkend Day</Label>
                  <Input type="number" placeholder="1000" value={weekendDayPrice} onChange={e => setWeekendDayPrice(e.target.value)} className="h-10 px-2" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold">Wkend Night</Label>
                  <Input type="number" placeholder="1200" value={weekendNightPrice} onChange={e => setWeekendNightPrice(e.target.value)} className="h-10 px-2" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold">Deposit (₹)</Label>
                  <Input type="number" placeholder="0" value={minBookingAmount} onChange={e => setMinBookingAmount(e.target.value)} className="h-10 px-2" />
                </div>
              </div>
            )}
            {/* Opening / Closing Hours */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold">Opening</Label>
                <Select value={openingHour} onValueChange={setOpeningHour}>
                  <SelectTrigger className="w-full bg-card border-border h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem key={i} value={String(i)}>{i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold">Closing</Label>
                <Select value={closingHour} onValueChange={setClosingHour}>
                  <SelectTrigger className="w-full bg-card border-border h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => i + 1).filter(h => h > Number(openingHour)).map(h => (
                      <SelectItem key={h} value={String(h)}>{h === 24 ? '12 AM (midnight)' : h === 12 ? '12 PM' : h < 12 ? `${h} AM` : `${h - 12} PM`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" className="w-full sm:w-auto bg-gradient-turf text-primary-foreground font-bold shadow-turf h-11 px-8">
                <Plus className="w-5 h-5 mr-2" /> Add Selection
              </Button>
            </div>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {facilities.map((f) => (
          <div key={f.id} className="rounded-xl bg-card border border-border p-5 flex flex-col hover:border-primary/30 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Layers className="w-5 h-5 text-primary" />
              </div>
              <Button size="sm" variant="ghost" className="text-destructive h-8 w-8 p-0 hover:bg-destructive/10" onClick={() => handleDelete(f.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <h4 className="font-heading font-semibold text-lg text-foreground">{f.name}</h4>
            <p className="text-sm font-medium text-primary capitalize mb-2">{f.facility_type}</p>
            <p className="text-xs text-muted-foreground line-clamp-2 mb-4">{f.description}</p>
            {/* Operating Hours Row */}
            <div className="bg-muted/20 border border-border/50 px-3 py-2 rounded-md mb-3 flex items-center justify-between">
              <span className="text-muted-foreground font-semibold text-xs tracking-wider uppercase flex items-center gap-1.5"><Clock className="w-3 h-3" /> Hours</span>
              <div className="flex items-center gap-1">
                <select className="bg-transparent border border-border rounded px-1.5 py-0.5 text-xs text-foreground font-medium w-[70px]"
                  value={f.opening_hour ?? 6}
                  onChange={async (e) => {
                    try {
                      await api.patch(`/facilities/${f.id}/hours`, { opening_hour: Number(e.target.value), closing_hour: f.closing_hour ?? 23 });
                      toast.success('Opening hour updated & slots synced!');
                      fetchFacilities();
                    } catch { toast.error('Failed to update'); }
                  }}>
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i} className="bg-card text-foreground">{i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}</option>
                  ))}
                </select>
                <span className="text-muted-foreground text-xs">→</span>
                <select className="bg-transparent border border-border rounded px-1.5 py-0.5 text-xs text-foreground font-medium w-[70px]"
                  value={f.closing_hour ?? 23}
                  onChange={async (e) => {
                    try {
                      await api.patch(`/facilities/${f.id}/hours`, { opening_hour: f.opening_hour ?? 6, closing_hour: Number(e.target.value) });
                      toast.success('Closing hour updated & slots synced!');
                      fetchFacilities();
                    } catch { toast.error('Failed to update'); }
                  }}>
                  {Array.from({ length: 24 }, (_, i) => i + 1).filter(h => h > (f.opening_hour ?? 6)).map(h => (
                    <option key={h} value={h} className="bg-card text-foreground">{h === 24 ? '12 AM' : h === 12 ? '12 PM' : h < 12 ? `${h} AM` : `${h - 12} PM`}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-auto pt-4 border-t border-border flex flex-col gap-3">
              {f.facility_type === 'snooker' || f.facility_type === 'pool' ? (
                <>
                  <div className="bg-primary/5 border border-primary/20 px-3 py-2 rounded-md mb-2 flex items-center justify-between">
                    <span className="text-muted-foreground font-semibold text-xs tracking-wider uppercase">Flat Hourly Engine</span>
                    <span className="font-bold text-primary">₹{f.weekday_day_price} / hr</span>
                  </div>
                  <div className="bg-muted/30 px-3 py-2 rounded-md mb-2 flex items-center justify-between">
                    <span className="text-muted-foreground font-semibold text-xs tracking-wider uppercase">Physical Tables</span>
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={async () => {
                          const newCount = Math.max(1, (f.table_count || 1) - 1);
                          await api.patch(`/facilities/${f.id}/tables`, { table_count: newCount });
                          toast.success(`Table count updated to ${newCount}`);
                          fetchFacilities();
                        }}>
                        <Minus className="w-3.5 h-3.5" />
                      </Button>
                      <span className="font-bold text-foreground text-sm min-w-[20px] text-center">{f.table_count || 1}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={async () => {
                          const newCount = (f.table_count || 1) + 1;
                          await api.patch(`/facilities/${f.id}/tables`, { table_count: newCount });
                          toast.success(`Table count updated to ${newCount}`);
                          fetchFacilities();
                        }}>
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-x-1 gap-y-1.5 text-[11px] mb-2">
                  <div className="flex justify-between items-center bg-muted/30 px-2 py-1 rounded-md">
                    <span className="text-muted-foreground">Wkday Day</span>
                    <span className="font-semibold text-foreground">₹{f.weekday_day_price}</span>
                  </div>
                  <div className="flex justify-between items-center bg-muted/30 px-2 py-1 rounded-md">
                    <span className="text-muted-foreground">Wkday Night</span>
                    <span className="font-semibold text-foreground">₹{f.weekday_night_price}</span>
                  </div>
                  <div className="flex justify-between items-center bg-muted/30 px-2 py-1 rounded-md">
                    <span className="text-muted-foreground">Wkend Day</span>
                    <span className="font-semibold text-foreground">₹{f.weekend_day_price}</span>
                  </div>
                  <div className="flex justify-between items-center bg-muted/30 px-2 py-1 rounded-md">
                    <span className="text-muted-foreground">Wkend Night</span>
                    <span className="font-semibold text-foreground">₹{f.weekend_night_price}</span>
                  </div>
                </div>
              )}
              <div className="bg-primary/5 border border-primary/10 px-3 py-1.5 rounded-lg mb-2 flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">Min Online Deposit</span>
                <span className="text-sm font-bold text-primary">₹{f.min_booking_amount || 0}</span>
              </div>
              <Button size="sm" variant="outline" className="w-full text-xs h-8" onClick={() => openPricingModal(f)}>Update Global Pricing</Button>
            </div>
          </div>
        ))}
        {facilities.length === 0 && (
          <div className="col-span-full text-center py-8 text-muted-foreground">No sports events found. Create one above!</div>
        )}
      </div>

      <Dialog open={isPricingModalOpen} onOpenChange={setIsPricingModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Update Split Pricing Grid</DialogTitle>
          </DialogHeader>
          {pricingTarget?.facility_type === 'snooker' || pricingTarget?.facility_type === 'pool' ? (
            <>
              <p className="text-sm text-muted-foreground mb-4">Changing this global hourly rate will autonomously recalculate all future templates and free slots for <b>{pricingTarget?.name}</b>.</p>
              <div className="space-y-2 mb-4">
                <Label>Flat Hourly Engine Rate (₹)</Label>
                <Input type="number" value={editPrices.wd_day} onChange={(e) => setEditPrices({ ...editPrices, wd_day: e.target.value })} />
              </div>
              <div className="space-y-2 mb-4">
                <Label>Booking Deposit Amount (₹)</Label>
                <Input type="number" value={editPrices.min_booking_amount} onChange={(e) => setEditPrices({ ...editPrices, min_booking_amount: e.target.value })} />
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">Changing these prices will instantly recalculate all future unbooked slots & weekly templates for <b>{pricingTarget?.name}</b>. Night starts dynamically at 18:00 (6 PM).</p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label>Weekday Day (₹)</Label>
                  <Input type="number" value={editPrices.wd_day} onChange={(e) => setEditPrices({ ...editPrices, wd_day: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Weekday Night (₹)</Label>
                  <Input type="number" value={editPrices.wd_night} onChange={(e) => setEditPrices({ ...editPrices, wd_night: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Weekend Day (₹)</Label>
                  <Input type="number" value={editPrices.we_day} onChange={(e) => setEditPrices({ ...editPrices, we_day: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Weekend Night (₹)</Label>
                  <Input type="number" value={editPrices.we_night} onChange={(e) => setEditPrices({ ...editPrices, we_night: e.target.value })} />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Default Online Booking Deposit (₹)</Label>
                  <Input type="number" value={editPrices.min_booking_amount} onChange={(e) => setEditPrices({ ...editPrices, min_booking_amount: e.target.value })} />
                </div>
              </div>
            </>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPricingModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePricing} className="bg-gradient-turf text-primary-foreground shadow-turf">Sync Updates</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
