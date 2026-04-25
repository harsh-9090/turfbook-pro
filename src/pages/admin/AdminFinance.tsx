import { useState, useEffect } from "react";
import api from "@/lib/api";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, Legend 
} from "recharts";
import { 
  ArrowUpRight, ArrowDownRight, IndianRupee, Banknote, 
  Smartphone, Globe, TrendingUp, Filter, Calendar, 
  Building2, Wallet2, Package
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];
const PAYMENT_COLORS = {
  cash: "#10b981", // Emerald
  upi: "#3b82f6",  // Blue
  online: "#8b5cf6" // Violet
};

export default function AdminFinance() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFinance = async () => {
      try {
        const res = await api.get("/analytics/finance");
        setData(res.data);
      } catch (e) {
        console.error("Failed to fetch finance data", e);
      } finally {
        setLoading(false);
      }
    };
    fetchFinance();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const { summary, facilities, trends } = data;

  const pieData = [
    { name: "Cash", value: summary.cash, color: PAYMENT_COLORS.cash },
    { name: "UPI (Manual)", value: summary.upi, color: PAYMENT_COLORS.upi },
    { name: "Online", value: summary.online, color: PAYMENT_COLORS.online },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold tracking-tight text-foreground">Financial Command Center</h1>
        <p className="text-muted-foreground mt-1">Real-time revenue tracking and performance analytics for Akola Sports Arena.</p>
      </div>

      {/* Top Level Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card/50 border-border/50 shadow-sm overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
             <IndianRupee className="w-12 h-12" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-bold tracking-wider">Total Revenue</CardDescription>
            <CardTitle className="text-2xl">₹{summary.totalRevenue.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs text-muted-foreground">
               <TrendingUp className="w-3 h-3 mr-1 text-emerald-500" />
               <span>Gross volume processed</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50 shadow-sm overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
             <Banknote className="w-12 h-12" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-bold tracking-wider text-emerald-500">Cash in Hand</CardDescription>
            <CardTitle className="text-2xl">₹{summary.cash.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs text-muted-foreground">
               <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
               <span>Physical cash at counter</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50 shadow-sm overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
             <Wallet2 className="w-12 h-12" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-bold tracking-wider text-amber-500">Pending Dues</CardDescription>
            <CardTitle className="text-2xl">₹{summary.pendingDues.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs text-muted-foreground">
               <div className="w-2 h-2 rounded-full bg-amber-500 mr-2 animate-pulse" />
               <span>Payments currently due</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50 shadow-sm overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
             <Package className="w-12 h-12" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-bold tracking-wider text-primary">Net Earnings</CardDescription>
            <CardTitle className="text-2xl">₹{summary.netRevenue.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs text-muted-foreground">
               <span>After platform fees (₹{summary.fees})</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Trend Area Chart */}
        <Card className="lg:col-span-2 bg-card/40 border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              14-Day Revenue Trend
            </CardTitle>
            <CardDescription>Visualizing daily income across all facilities.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: 'currentColor', opacity: 0.5, fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: 'currentColor', opacity: 0.5, fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  itemStyle={{ color: 'hsl(var(--primary))' }}
                />
                <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorAmount)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Split Pie Chart */}
        <Card className="bg-card/40 border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Payment Methods</CardTitle>
            <CardDescription>Manual vs Automated breakdown.</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px] flex flex-col justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-4 mt-2">
               {pieData.map(d => (
                 <div key={d.name} className="flex items-center text-xs">
                    <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: d.color }} />
                    <span className="text-muted-foreground">{d.name}: ₹{d.value}</span>
                 </div>
               ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Facility Performance Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card/40 border-border/50">
           <CardHeader>
              <CardTitle className="text-lg">Revenue by Facility</CardTitle>
              <CardDescription>Comparison of income across different sports.</CardDescription>
           </CardHeader>
           <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={facilities}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="type" axisLine={false} tickLine={false} tick={{fill: 'currentColor', opacity: 0.5, fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: 'currentColor', opacity: 0.5, fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
           </CardContent>
        </Card>

        {/* Detailed Breakdown List */}
        <Card className="bg-card/40 border-border/50">
           <CardHeader>
              <CardTitle className="text-lg">Performance Metrics</CardTitle>
              <CardDescription>Detailed stats per facility type.</CardDescription>
           </CardHeader>
           <CardContent>
              <div className="space-y-4">
                 {facilities.map((f: any, idx: number) => (
                   <div key={f.type} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-secondary/10">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                            {idx + 1}
                         </div>
                         <div>
                            <p className="font-bold capitalize">{f.type}</p>
                            <p className="text-xs text-muted-foreground">{f.bookings} Bookings completed</p>
                         </div>
                      </div>
                      <div className="text-right">
                         <p className="font-bold text-foreground">₹{f.revenue.toLocaleString()}</p>
                         <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Top Performing</p>
                      </div>
                   </div>
                 ))}
                 {facilities.length === 0 && <p className="text-center text-muted-foreground py-8">No data available.</p>}
              </div>
           </CardContent>
        </Card>
      </div>
    </div>
  );
}
