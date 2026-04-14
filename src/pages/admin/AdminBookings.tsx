import { useState } from "react";
import { mockBookings, type Booking } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>(mockBookings);
  const [search, setSearch] = useState("");

  const filtered = bookings.filter(
    (b) =>
      b.customerName.toLowerCase().includes(search.toLowerCase()) ||
      b.id.toLowerCase().includes(search.toLowerCase()) ||
      b.date.includes(search)
  );

  const handleCancel = (id: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: "cancelled" as const, paymentStatus: "refunded" as const } : b))
    );
    toast.success(`Booking ${id} cancelled`);
  };

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, ID, or date..." className="pl-10 bg-card border-border" />
      </div>

      <div className="rounded-xl bg-card border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">ID</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Customer</th>
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
                <td className="px-5 py-3 text-foreground">{b.date}</td>
                <td className="px-5 py-3 text-foreground">{b.startTime}–{b.endTime}</td>
                <td className="px-5 py-3">
                  <Badge variant={b.status === "confirmed" ? "default" : b.status === "cancelled" ? "destructive" : "secondary"}
                    className={b.status === "confirmed" ? "bg-primary/10 text-primary border-primary/20" : ""}>
                    {b.status}
                  </Badge>
                </td>
                <td className="px-5 py-3">
                  <Badge variant="outline" className={b.paymentStatus === "paid" ? "text-primary border-primary/20" : b.paymentStatus === "refunded" ? "text-destructive border-destructive/20" : ""}>
                    {b.paymentStatus}
                  </Badge>
                </td>
                <td className="px-5 py-3 font-semibold text-foreground">₹{b.amount}</td>
                <td className="px-5 py-3">
                  {b.status !== "cancelled" && (
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
    </div>
  );
}
