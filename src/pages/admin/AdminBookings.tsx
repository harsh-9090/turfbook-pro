import { useState, useEffect } from "react";
import { facilityLabels } from "@/lib/mock-data";
import api from "@/lib/api";
import { useSocket } from "@/hooks/useSocket";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, XCircle, Plus, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { parse, isAfter } from "date-fns";

export default function AdminBookings() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [facilityFilter, setFacilityFilter] = useState<string>("all");

  const [showModal, setShowModal] = useState(false);
  const [bName, setBName] = useState("");
  const [bPhone, setBPhone] = useState("");
  const [bFacility, setBFacility] = useState("cricket");
  const [bDate, setBDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [bSlots, setBSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");

  useEffect(() => {
    if(!showModal) return;
    const loadSlots = async () => {
      try {
        const res = await api.get(`/slots?date=${bDate}&facility_type=${bFacility}`);
        const available = res.data.filter((s: any) => s.is_available);
        setBSlots(available);
      } catch (e) {
        toast.error('Failed to load slots for selected date/facility');
      }
    };
    loadSlots();
  }, [bDate, bFacility, showModal]);

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!selectedSlot || !bName || !bPhone) return toast.error("Fill all fields");
    try {
      await api.post('/bookings', { name: bName, phone: bPhone, slot_id: selectedSlot });
      toast.success("Booking created!");
      setShowModal(false);
      fetchBookings();
    } catch(e: any) {
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
        startTime: b.start_time?.substring(0, 5) || "",
        endTime: b.end_time?.substring(0, 5) || "",
        rawStatus: b.status,
        paymentStatus: b.payment_method === 'online' ? b.payment_status : 'pending',
        amount: Number(b.amount),
        get status() {
          if (this.rawStatus === 'cancelled') return 'cancelled';
          try {
            const slotEnd = parse(`${this.date} ${this.endTime}`, 'yyyy-MM-dd HH:mm', new Date());
            if (isAfter(new Date(), slotEnd)) return 'completed';
          } catch {}
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

  const filtered = bookings.filter((b) => {
    const matchesSearch = b.customerName.toLowerCase().includes(search.toLowerCase()) || b.id.toLowerCase().includes(search.toLowerCase()) || b.date.includes(search);
    const matchesFacility = facilityFilter === "all" || b.facility === facilityFilter;
    return matchesSearch && matchesFacility;
  });

  const handleCancel = async (id: string) => {
    try {
      await api.patch(`/bookings/${id}/cancel`);
      toast.success(`Booking ${id} cancelled`);
      fetchBookings();
    } catch (e) {
      toast.error('Failed to cancel booking');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, ID, date..." className="pl-10 bg-card border-border" />
          </div>
          <div className="flex gap-2">
            {["all", "cricket", "snooker", "pool"].map((f) => (
              <Button key={f} size="sm" variant={facilityFilter === f ? "default" : "outline"}
                onClick={() => setFacilityFilter(f)}
                className={facilityFilter === f ? "bg-gradient-turf text-primary-foreground" : ""}>
                {f === "all" ? "All" : facilityLabels[f as keyof typeof facilityLabels]}
              </Button>
            ))}
          </div>
        </div>
        <Button onClick={() => setShowModal(true)} className="bg-gradient-turf text-primary-foreground shadow-turf shrink-0">
          <Plus className="w-4 h-4 mr-2" /> Book Slot
        </Button>
      </div>

      <div className="rounded-xl bg-card border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">ID</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Customer</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Sports Event</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Date</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Time</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Status</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Payment</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Amount</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => (
              <tr key={b.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{b.id}</td>
                <td className="px-5 py-3">
                  <p className="font-medium text-foreground">{b.customerName}</p>
                  <p className="text-xs text-muted-foreground">{b.phone}</p>
                </td>
                <td className="px-5 py-3">
                  <Badge variant="outline" className="text-primary border-primary/20">{facilityLabels[b.facility]}</Badge>
                </td>
                <td className="px-5 py-3 text-foreground">{b.date}</td>
                <td className="px-5 py-3 text-foreground">{b.startTime}–{b.endTime}</td>
                <td className="px-5 py-3">
                  <Badge variant={b.status === "completed" ? "default" : b.status === "confirmed" ? "default" : b.status === "cancelled" ? "destructive" : "secondary"}
                    className={b.status === "completed" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : b.status === "confirmed" ? "bg-primary/10 text-primary border-primary/20" : ""}>
                    {b.status === "completed" ? "✓ Completed" : b.status}
                  </Badge>
                </td>
                <td className="px-5 py-3">
                  <Badge variant="outline" className={b.paymentStatus === "paid" ? "text-primary border-primary/20" : b.paymentStatus === "refunded" ? "text-destructive border-destructive/20" : ""}>
                    {b.paymentStatus}
                  </Badge>
                </td>
                <td className="px-5 py-3 font-semibold text-foreground">₹{b.amount}</td>
                <td className="px-5 py-3">
                  {b.status === "completed" ? (
                    <span className="inline-flex items-center text-xs text-emerald-500 font-medium">
                      <CheckCircle2 className="w-4 h-4 mr-1" /> Done
                    </span>
                  ) : b.status === "cancelled" ? (
                    <span className="text-xs text-muted-foreground">—</span>
                  ) : (
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleCancel(b.id)}>
                      <XCircle className="w-4 h-4 mr-1" /> Cancel
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">No bookings found</p>}
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
                    <option value="cricket">Cricket</option>
                    <option value="snooker">Snooker</option>
                    <option value="pool">Pool</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-sm text-muted-foreground block mb-1">Date</label>
                  <Input type="date" value={bDate} onChange={e => setBDate(e.target.value)} required className="bg-background h-10" />
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Available Slot</label>
                <select value={selectedSlot} onChange={e => setSelectedSlot(e.target.value)} required className="w-full border border-border bg-background rounded-md h-10 px-3 text-sm">
                  <option value="">Select a slot...</option>
                  {bSlots.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.start_time.substring(0,5)} - {s.end_time.substring(0,5)} {s.facility_name ? `(${s.facility_name})` : ''}
                    </option>
                  ))}
                </select>
                {bSlots.length === 0 && <p className="text-[10px] text-destructive mt-1">No slots available for this date/facility.</p>}
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit" className="flex-1 bg-gradient-turf text-primary-foreground font-semibold">Confirm Booking</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
