import { motion } from "framer-motion";
import { Calendar, DollarSign, TrendingUp, Clock, ArrowUpRight } from "lucide-react";
import { facilityLabels } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import { format } from "date-fns";
import { useSocket } from "@/hooks/useSocket";

export default function AdminDashboard() {
  const [statsData, setStatsData] = useState({
    totalBookings: 0,
    dailyRevenue: 0,
    monthlyRevenue: 0,
    upcomingBookings: 0,
  });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const statsRes = await api.get('/admin/stats');
      setStatsData({
        totalBookings: statsRes.data.totalBookings,
        dailyRevenue: statsRes.data.totalRevenue || 0,
        monthlyRevenue: statsRes.data.totalRevenue || 0,
        upcomingBookings: statsRes.data.upcomingBookings,
      });

      const bookingsRes = await api.get('/bookings');
      const mapped = bookingsRes.data.slice(0, 5).map((b: any) => ({
        id: b.id,
        customerName: b.customer_name,
        phone: b.phone,
        facility: "cricket",
        date: format(new Date(b.date), 'yyyy-MM-dd'),
        startTime: b.start_time?.substring(0, 5) || "",
        endTime: b.end_time?.substring(0, 5) || "",
        status: b.status,
        amount: Number(b.amount)
      }));
      setRecentBookings(mapped);
    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useSocket('booking_updated', fetchDashboardData);

  const statCards = [
    { label: "Total Bookings", value: statsData.totalBookings, icon: Calendar, change: "" },
    { label: "Today's Revenue", value: `₹${statsData.dailyRevenue.toLocaleString()}`, icon: DollarSign, change: "" },
    { label: "Total Revenue", value: `₹${statsData.monthlyRevenue.toLocaleString()}`, icon: TrendingUp, change: "" },
    { label: "Upcoming", value: statsData.upcomingBookings, icon: Clock, change: "" },
  ];

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading dashboard...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
        <div className="hidden md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 text-muted-foreground font-medium">ID</th>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium">Customer</th>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium">Sports Event</th>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium">Date</th>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium">Time</th>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium">Status</th>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings.map((b) => (
                <tr key={b.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{b.id}</td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-foreground">{b.customerName}</p>
                    <p className="text-xs text-muted-foreground">{b.phone}</p>
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant="outline" className="text-primary border-primary/20">{facilityLabels[b.facility as keyof typeof facilityLabels] || b.facility}</Badge>
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

        {/* Mobile: Card View */}
        <div className="md:hidden divide-y divide-border/50">
          {recentBookings.map((b) => (
            <div key={b.id} className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-foreground">{b.customerName}</p>
                  <p className="text-xs text-muted-foreground">{b.phone}</p>
                </div>
                <Badge variant={b.status === "confirmed" ? "default" : b.status === "cancelled" ? "destructive" : "secondary"}
                  className={b.status === "confirmed" ? "bg-primary/10 text-primary border-primary/20" : "text-[10px]"}>
                  {b.status}
                </Badge>
              </div>
              <div className="flex justify-between items-center text-xs">
                <div className="space-y-1">
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {b.date}
                  </p>
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {b.startTime}–{b.endTime}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-foreground">₹{b.amount}</p>
                  <p className="text-[10px] lowercase text-muted-foreground">{b.id.substring(0, 8)}...</p>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] text-primary border-primary/20">
                {facilityLabels[b.facility as keyof typeof facilityLabels] || b.facility}
              </Badge>
            </div>
          ))}
          {recentBookings.length === 0 && <p className="p-8 text-center text-muted-foreground">No recent bookings</p>}
        </div>
      </div>
    </div>
  );
}
