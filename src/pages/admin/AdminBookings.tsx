import { useState, useEffect } from "react";
import { getFacilityLabel } from "@/lib/mock-data";
import api from "@/lib/api";
import { DatePicker } from "@/components/ui/date-picker";
import { useSocket } from "@/hooks/useSocket";
import { format, parse, isAfter, isSameDay, startOfDay } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, XCircle, Plus, CheckCircle2, IndianRupee, Smartphone, Wallet, Banknote, ArrowUp, ArrowDown, Filter } from "lucide-react";
import { formatTime12Hour } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function AdminBookings() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [facilityFilter, setFacilityFilter] = useState<string>("all");
  const [facilityTypes, setFacilityTypes] = useState<string[]>([]);
  
  // Advanced Filters
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'today' | 'upcoming' | 'past'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [sortConfig, setSortConfig] = useState<{ key: 'date' | 'amount' | 'customer'; direction: 'asc' | 'desc' | null }>({ key: 'date', direction: 'desc' });

  useEffect(() => {
    api.get('/facilities').then(res => {
      const types = [...new Set(res.data.map((f: any) => f.facility_type))] as string[];
      setFacilityTypes(types);
    }).catch(() => {});
  }, []);

  const [showModal, setShowModal] = useState(false);
  const [bName, setBName] = useState("");
  const [bPhone, setBPhone] = useState("");
  const [bFacility, setBFacility] = useState("cricket");
  const [bDate, setBDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [bSlots, setBSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [bPaidAmount, setBPaidAmount] = useState<number>(0);
  const [bPayMode, setBPayMode] = useState<"upi" | "cash">("cash");

  // Mark as Paid Dialog
  const [payOpen, setPayOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<any>(null);
  const [payMode, setPayMode] = useState<"upi" | "cash">("cash");

  useEffect(() => {
    if (!showModal) return;
    const loadSlots = async () => {
      try {
        const res = await api.get(`/slots?date=${bDate}&facility_type=${bFacility}`);
        const available = res.data.filter((s: any) => s.is_available && !s.is_booked);
        setBSlots(available);
      } catch (e) {
        toast.error('Failed to load slots for selected date/facility');
      }
    };
    loadSlots();
  }, [bDate, bFacility, showModal]);

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !bName || !bPhone) return toast.error("Fill all fields");
    try {
      await api.post('/bookings', {
        name: bName,
        phone: bPhone,
        slot_id: selectedSlot,
        paid_amount: Number(bPaidAmount) || 0,
        is_manual: true,
        payment_method: bPayMode
      });
      toast.success("Booking created!");
      setShowModal(false);
      setBPaidAmount(0); // Reset
      setBName(""); setBPhone(""); setSelectedSlot(""); // Full reset
      fetchBookings();
    } catch (e: any) {
      toast.error(e.response?.data?.error || "Failed to create booking");
    }
  };

  const fetchBookings = async () => {
    try {
      const res = await api.get('/bookings');
      const mapped = res.data.map((b: any) => ({
        id: b.id,
        customerName: b.customer_name,
        phone: b.phone,
        facility: b.facility_type || "cricket",
        date: format(new Date(b.date), 'yyyy-MM-dd'),
        startTime: b.start_time ? formatTime12Hour(b.start_time) : "",
        endTime: b.end_time ? formatTime12Hour(b.end_time) : "",
        rawStatus: b.status,
        paymentStatus: b.payment_status,
        amount: Number(b.total_amount),
        paidAmount: Number(b.paid_amount || 0),
        remainingAmount: Number(b.remaining_amount || 0),
        paymentMode: b.payment_mode,
        get status() {
          if (this.rawStatus === 'cancelled') return 'cancelled';
          try {
            const slotEnd = parse(`${this.date} ${this.endTime}`, 'yyyy-MM-dd h:mm a', new Date());
            if (isAfter(new Date(), slotEnd)) return 'completed';
          } catch (e) {}
          return this.rawStatus;
        }
      }));
      setBookings(mapped);
    } catch (e) {
      toast.error('Failed to load bookings');
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  useSocket('booking_updated', fetchBookings);

  const handleSort = (key: 'date' | 'amount' | 'customer') => {
    setSortConfig(current => ({
      key,
      direction: current.key === key ? (current.direction === 'asc' ? 'desc' : 'asc') : 'desc'
    }));
  };

  const filtered = bookings
    .filter((b) => {
      const matchesSearch = b.customerName.toLowerCase().includes(search.toLowerCase()) || 
                           b.id.toLowerCase().includes(search.toLowerCase()) || 
                           b.phone.includes(search);
      
      const matchesFacility = facilityFilter === "all" || b.facility === facilityFilter;
      
      const bDate = startOfDay(new Date(b.date));
      const today = startOfDay(new Date());
      
      const matchesTimeline = timelineFilter === 'all' || 
                             (timelineFilter === 'today' && isSameDay(bDate, today)) ||
                             (timelineFilter === 'upcoming' && isAfter(bDate, today)) ||
                             (timelineFilter === 'past' && b.status === "completed");

      const matchesPayment = paymentFilter === 'all' || b.paymentStatus === paymentFilter;

      return matchesSearch && matchesFacility && matchesTimeline && matchesPayment;
    })
    .sort((a, b) => {
      if (!sortConfig.direction) return 0;
      
      let valA, valB;
      if (sortConfig.key === 'date') {
        const timeA = parse(`${a.date} ${a.startTime}`, 'yyyy-MM-dd h:mm a', new Date());
        const timeB = parse(`${b.date} ${b.startTime}`, 'yyyy-MM-dd h:mm a', new Date());
        valA = timeA.getTime();
        valB = timeB.getTime();
      } else if (sortConfig.key === 'amount') {
        valA = a.amount;
        valB = b.amount;
      } else {
        valA = a.customerName.toLowerCase();
        valB = b.customerName.toLowerCase();
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  const handleCancel = async (id: string) => {
    try {
      await api.patch(`/bookings/${id}/cancel`);
      toast.success(`Booking ${id.substring(0, 8)} cancelled`);
      fetchBookings();
    } catch (e) {
      toast.error('Failed to cancel booking');
    }
  };

  const handleCompletePayment = async () => {
    if (!payTarget) return;
    try {
      await api.patch(`/bookings/${payTarget.id}/pay`, {
        payment_mode: payMode
      });
      toast.success(`Booking ${payTarget.id.substring(0, 8)} marked as paid via ${payMode.toUpperCase()}`);
      setPayOpen(false);
      fetchBookings();
    } catch {
      toast.error('Failed to complete payment');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between gap-3">
          <div className="relative flex-1 sm:w-64 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone, ID..." className="pl-10 bg-card border-border" />
          </div>
          <Button onClick={() => setShowModal(true)} className="bg-gradient-turf text-primary-foreground shadow-turf shrink-0">
            <Plus className="w-4 h-4 mr-2" /> Book Slot
          </Button>
        </div>

        {/* Row 2: Advanced Filters (Refined) */}
        <div className="bg-card/30 rounded-2xl border border-border/50 overflow-hidden">
          <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-border/50">
            {/* Timeline Tabs */}
            <div className="flex items-center p-2 gap-2 min-w-0">
              <div className="flex bg-secondary/20 p-1 rounded-xl w-full sm:w-auto overflow-x-auto scrollbar-hide">
                {['all', 'today', 'upcoming', 'past'].map((t: any) => (
                  <button key={t} onClick={() => setTimelineFilter(t)}
                    className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      timelineFilter === t ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105" : "text-muted-foreground hover:bg-secondary/50"
                    }`}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Filter */}
            <div className="flex items-center p-2 gap-2">
              <div className="flex bg-secondary/20 p-1 rounded-xl w-full sm:w-auto">
                {['all', 'paid', 'pending'].map((p: any) => (
                  <button key={p} onClick={() => setPaymentFilter(p)}
                    className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      paymentFilter === p ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20" : "text-muted-foreground hover:bg-secondary/50"
                    }`}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Facility Filter */}
            <div className="flex items-center p-2 gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide">
              <div className="flex gap-1">
                {["all", ...facilityTypes].map((f) => (
                  <button key={f} onClick={() => setFacilityFilter(f)}
                    className={`px-4 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      facilityFilter === f ? "border-primary bg-primary/10 text-primary" : "border-transparent text-muted-foreground hover:bg-secondary/50"
                    }`}>
                    {f === "all" ? "All Sports" : getFacilityLabel(f)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden lg:block rounded-xl bg-card border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/20">
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">ID</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('customer')}>
                <div className="flex items-center gap-2">
                   Customer {sortConfig.key === 'customer' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                </div>
              </th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium text-center">Event</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('date')}>
                <div className="flex items-center gap-2">
                   Schedule {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                </div>
              </th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Status</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('amount')}>
                <div className="flex items-center gap-2">
                   Payment Details {sortConfig.key === 'amount' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                </div>
              </th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => (
              <tr key={b.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                <td className="px-5 py-3 font-mono text-[10px] text-muted-foreground uppercase">{b.id.substring(0, 8)}</td>
                <td className="px-5 py-3">
                  <p className="font-medium text-foreground">{b.customerName}</p>
                  <p className="text-xs text-muted-foreground">{b.phone}</p>
                </td>
                <td className="px-5 py-3 text-center">
                  <Badge variant="outline" className="text-primary border-primary/20">{getFacilityLabel(b.facility)}</Badge>
                </td>
                <td className="px-5 py-3">
                   <p className="text-foreground font-bold">{b.date}</p>
                   <p className="text-xs text-muted-foreground font-medium uppercase tracking-tight">{b.startTime}–{b.endTime}</p>
                </td>
                <td className="px-5 py-3">
                  <Badge variant={b.status === "completed" ? "default" : b.status === "confirmed" ? "default" : b.status === "cancelled" ? "destructive" : "secondary"}
                    className={b.status === "completed" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : b.status === "confirmed" ? "bg-primary/10 text-primary border-primary/20" : ""}>
                    {b.status === "completed" ? "✓ Completed" : b.status}
                  </Badge>
                </td>
                <td className="px-5 py-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={b.paymentStatus === "paid" ? "text-primary border-primary/20 bg-primary/5" : "text-amber-500 border-amber-500/20 bg-amber-500/5 text-[10px]"}>
                        {b.paymentStatus === 'paid' ? 'Full Payment' : 'Partial / Pending'}
                      </Badge>
                      {b.paymentMode && (
                        <Badge variant="outline" className="text-[9px] uppercase font-bold text-muted-foreground">{b.paymentMode}</Badge>
                      )}
                    </div>
                    <div className="flex flex-col text-[11px]">
                      <span className="text-foreground">Total: ₹{b.amount}</span>
                      <span className="text-emerald-500 font-medium">Paid: ₹{b.paidAmount}</span>
                      {b.remainingAmount > 0 && (
                        <span className="text-amber-500 font-bold">Balance: ₹{b.remainingAmount}</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {b.paymentStatus === 'pending' && b.status !== 'cancelled' && (
                      <Button size="sm" className="bg-primary/10 text-primary hover:bg-primary/20 h-8 px-3 text-xs font-semibold border border-primary/20"
                        onClick={() => { setPayTarget(b); setPayOpen(true); }}>
                        Mark Paid
                      </Button>
                    )}
                    {b.status === "completed" ? (
                      <span className="inline-flex items-center text-xs text-emerald-500 font-medium">
                        <CheckCircle2 className="w-4 h-4 mr-1" /> Done
                      </span>
                    ) : b.status === "cancelled" ? (
                      <span className="text-xs text-muted-foreground block">-</span>
                    ) : (
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2" onClick={() => handleCancel(b.id)}>
                        <XCircle className="w-4 h-4 mr-1" /> Cancel
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-12">No bookings found</p>}
      </div>

      <div className="lg:hidden grid gap-4">
        {filtered.map((b) => (
          <div key={b.id} className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-foreground">{b.customerName}</p>
                <p className="text-xs text-muted-foreground">{b.phone}</p>
              </div>
              <Badge variant={b.status === "completed" ? "default" : b.status === "confirmed" ? "default" : b.status === "cancelled" ? "destructive" : "secondary"}
                className={b.status === "completed" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : b.status === "confirmed" ? "bg-primary/10 text-primary border-primary/20" : ""}>
                {b.status === "completed" ? "✓ Completed" : b.status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs border-y border-border/50 py-3">
              <div className="space-y-1">
                <p className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Schedule</p>
                <p className="text-foreground font-bold">{b.date}</p>
                <p className="text-foreground font-semibold">
                  {b.startTime} – {b.endTime}
                </p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Financials</p>
                <p className="font-bold text-lg text-foreground">₹{b.amount}</p>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="outline" className={`text-[10px] ${b.paymentStatus === "paid" ? "text-primary border-primary/20" : "text-amber-500 border-amber-500/20"}`}>
                    {b.paymentStatus === 'paid' ? 'PAID' : `DUE: ₹${b.remainingAmount}`}
                  </Badge>
                  {b.paymentMode && (
                    <Badge variant="outline" className="text-[9px] uppercase font-bold text-muted-foreground">{b.paymentMode}</Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-[10px] text-primary border-primary/20">
                {getFacilityLabel(b.facility)}
              </Badge>
              <div className="flex items-center gap-2">
                {b.paymentStatus === 'pending' && b.status !== 'cancelled' && (
                  <Button size="sm" className="bg-primary/10 text-primary hover:bg-primary/20 h-7 px-3 text-[10px] font-bold"
                    onClick={() => { setPayTarget(b); setPayOpen(true); }}>
                    Mark Paid
                  </Button>
                )}
                <div className="h-4 w-[1px] bg-border mx-1" />
                {b.status === "completed" ? (
                  <span className="inline-flex items-center text-xs text-emerald-500 font-medium">
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Done
                  </span>
                ) : b.status === "cancelled" ? (
                  <span className="text-xs text-muted-foreground">Cancelled</span>
                ) : (
                  <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 h-8 px-2 text-xs" onClick={() => handleCancel(b.id)}>
                    <XCircle className="w-4 h-4 mr-1" /> Cancel
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-12">No bookings found</p>}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-turf">
            <h3 className="font-heading font-semibold text-lg text-foreground mb-4">Create Manual Booking</h3>
            <form onSubmit={handleCreateBooking} className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Customer Name</label>
                <Input value={bName} onChange={e => setBName(e.target.value)} required className="bg-background" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Phone Number</label>
                <Input value={bPhone} onChange={e => setBPhone(e.target.value)} required className="bg-background" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm text-muted-foreground block mb-1">Event Type</label>
                  <select value={bFacility} onChange={e => setBFacility(e.target.value)} className="w-full border border-border bg-background rounded-md h-10 px-3 text-sm">
                    {facilityTypes.map(ft => (
                      <option key={ft} value={ft}>{ft.charAt(0).toUpperCase() + ft.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-sm text-muted-foreground block mb-1">Date</label>
                  <DatePicker 
                    date={bDate} 
                    setDate={(d) => setBDate(d ? format(d, 'yyyy-MM-dd') : '')}
                    className="bg-background h-10 w-full"
                    placeholder="Booking Date"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Available Slot</label>
                <select value={selectedSlot} onChange={e => setSelectedSlot(e.target.value)} required className="w-full border border-border bg-background rounded-md h-10 px-3 text-sm">
                  <option value="">Select a slot...</option>
                  {bSlots.map(s => (
                    <option key={s.id} value={s.id}>
                      {formatTime12Hour(s.start_time)} - {formatTime12Hour(s.end_time)} {s.facility_name ? `(${s.facility_name})` : ''}
                    </option>
                  ))}
                </select>
                {bSlots.length === 0 && <p className="text-[10px] text-destructive mt-1">No slots available for this date/facility.</p>}
              </div>

              <div>
                <label className="text-sm text-muted-foreground block mb-1">Advance Amount Paid (₹)</label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="number" value={bPaidAmount} onChange={e => setBPaidAmount(Number(e.target.value))} className="w-full h-10 pl-10 bg-background border border-border rounded-md text-sm" placeholder="0.00" />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 italic">Balance will be calculated automatically.</p>
              </div>

              {Number(bPaidAmount) > 0 && (
                <div>
                  <label className="text-sm text-muted-foreground block mb-2">Payment Method</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setBPayMode("cash")}
                      className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border-2 transition-all ${bPayMode === "cash"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-transparent text-muted-foreground hover:border-border/80"
                        }`}>
                      <Banknote className="w-4 h-4" />
                      <span className="font-semibold text-sm">Cash</span>
                    </button>
                    <button type="button" onClick={() => setBPayMode("upi")}
                      className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border-2 transition-all ${bPayMode === "upi"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-transparent text-muted-foreground hover:border-border/80"
                        }`}>
                      <Smartphone className="w-4 h-4" />
                      <span className="font-semibold text-sm">UPI</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit" className="flex-1 bg-gradient-turf text-primary-foreground font-semibold">Confirm Booking</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Settle Remaining Balance</DialogTitle>
          </DialogHeader>
          {payTarget && (
            <div className="space-y-4 py-4">
              <div className="rounded-lg bg-muted/40 border border-border p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Booking ID</span>
                  <span className="text-foreground font-mono uppercase text-xs">{payTarget.id.substring(0, 8)}</span>
                </div>
                <div className="flex justify-between text-sm text-amber-500 font-bold">
                  <span>Balance Due</span>
                  <span>₹{payTarget.remainingAmount}</span>
                </div>

                <div className="border-t border-border pt-4 space-y-3">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Payment Mode</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setPayMode("cash")}
                      className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${payMode === "cash"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-transparent text-muted-foreground hover:border-border/80"
                        }`}>
                      <Banknote className="w-4 h-4" />
                      <span className="font-semibold text-sm">Cash</span>
                    </button>
                    <button onClick={() => setPayMode("upi")}
                      className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${payMode === "upi"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-transparent text-muted-foreground hover:border-border/80"
                        }`}>
                      <Smartphone className="w-4 h-4" />
                      <span className="font-semibold text-sm">UPI</span>
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground text-center italic">
                Marking this as paid will confirm the full payment of ₹{payTarget.remainingAmount} via {payMode.toUpperCase()}
              </p>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setPayOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleCompletePayment} className="flex-1 bg-gradient-turf text-primary-foreground shadow-turf">
              Settle & Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
