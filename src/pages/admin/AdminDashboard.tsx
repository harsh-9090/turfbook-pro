import { motion } from "framer-motion";
import { Calendar, DollarSign, TrendingUp, Clock, ArrowUpRight } from "lucide-react";
import { stats, mockBookings, facilityLabels } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";

const statCards = [
  { label: "Total Bookings", value: stats.totalBookings, icon: Calendar, change: "+12%" },
  { label: "Today's Revenue", value: `₹${stats.dailyRevenue.toLocaleString()}`, icon: DollarSign, change: "+8%" },
  { label: "Monthly Revenue", value: `₹${stats.monthlyRevenue.toLocaleString()}`, icon: TrendingUp, change: "+15%" },
  { label: "Upcoming", value: stats.upcomingBookings, icon: Clock, change: "" },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-xl bg-card border border-border p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <card.icon className="w-5 h-5 text-primary" />
              </div>
              {card.change && (
                <span className="flex items-center text-xs font-medium text-primary">
                  <ArrowUpRight className="w-3 h-3" />{card.change}
                </span>
              )}
            </div>
            <p className="text-2xl font-heading font-bold text-foreground">{card.value}</p>
            <p className="text-sm text-muted-foreground">{card.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="rounded-xl bg-card border border-border">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-heading font-semibold text-foreground">Recent Bookings</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 text-muted-foreground font-medium">ID</th>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium">Customer</th>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium">Facility</th>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium">Date</th>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium">Time</th>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium">Status</th>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {mockBookings.map((b) => (
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
                    <Badge variant={b.status === "confirmed" ? "default" : b.status === "cancelled" ? "destructive" : "secondary"}
                      className={b.status === "confirmed" ? "bg-primary/10 text-primary border-primary/20" : ""}>
                      {b.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 font-semibold text-foreground">₹{b.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
