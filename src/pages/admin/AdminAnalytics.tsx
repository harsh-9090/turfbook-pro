import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from "recharts";
import { revenueData, peakHoursData } from "@/lib/mock-data";

export default function AdminAnalytics() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-card border border-border p-6">
        <h3 className="font-heading font-semibold text-foreground mb-4">Weekly Revenue by Facility</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={revenueData}>
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "hsl(220 10% 55%)", fontSize: 12 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(220 10% 55%)", fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ background: "hsl(220 18% 10%)", border: "1px solid hsl(220 16% 18%)", borderRadius: "0.5rem", color: "hsl(0 0% 95%)" }} formatter={(value: number) => [`₹${value.toLocaleString()}`]} />
            <Legend />
            <Bar dataKey="cricket" name="Cricket" fill="hsl(142 76% 36%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="snooker" name="Snooker" fill="hsl(84 80% 55%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="pool" name="Pool" fill="hsl(200 80% 50%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl bg-card border border-border p-6">
        <h3 className="font-heading font-semibold text-foreground mb-4">Peak Booking Hours (All Facilities)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={peakHoursData}>
            <defs>
              <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(142 76% 36%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(142 76% 36%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: "hsl(220 10% 55%)", fontSize: 11 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(220 10% 55%)", fontSize: 12 }} />
            <Tooltip contentStyle={{ background: "hsl(220 18% 10%)", border: "1px solid hsl(220 16% 18%)", borderRadius: "0.5rem", color: "hsl(0 0% 95%)" }} />
            <Area type="monotone" dataKey="bookings" stroke="hsl(142 76% 36%)" strokeWidth={2} fill="url(#colorBookings)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
