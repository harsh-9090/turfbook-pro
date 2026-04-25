import { useState, useEffect } from "react";
import api from "@/lib/api";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, Legend 
} from "recharts";
import { 
  ArrowUpRight, ArrowDownRight, IndianRupee, Banknote, 
  Smartphone, Globe, TrendingUp, Filter, Calendar, 
  Building2, Wallet2, Package, Receipt, Trash2, 
  Plus, Download, AlertCircle, CheckCircle2, Calculator
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogFooter, DialogTrigger, DialogDescription 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];
const PAYMENT_COLORS = {
  cash: "#10b981", // Emerald
  upi: "#3b82f6",  // Blue
  online: "#8b5cf6" // Violet
};

export default function AdminFinance() {
  const [data, setData] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Expense Modal State
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDesc, setExpenseDesc] = useState("");

  // Settle Modal State
  const [settleModalOpen, setSettleModalOpen] = useState(false);

  const fetchFinance = async () => {
    try {
      const [finRes, expRes] = await Promise.all([
        api.get("/analytics/finance"),
        api.get("/expenses")
      ]);
      setData(finRes.data);
      setExpenses(expRes.data);
    } catch (e) {
      console.error("Failed to fetch finance data", e);
      toast.error("Failed to sync financial data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinance();
  }, []);

  const handleAddExpense = async () => {
    if (!expenseCategory || !expenseAmount) return toast.error("Please fill required fields");
    try {
      await api.post("/expenses", {
        category: expenseCategory,
        amount: parseFloat(expenseAmount),
        description: expenseDesc
      });
      toast.success("Expense recorded successfully");
      setExpenseModalOpen(false);
      setExpenseCategory("");
      setExpenseAmount("");
      setExpenseDesc("");
      fetchFinance();
    } catch {
      toast.error("Failed to log expense");
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await api.delete(`/expenses/${id}`);
      toast.success("Expense removed");
      fetchFinance();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleSettlePayments = async () => {
    try {
      const res = await api.post("/analytics/finance/settle");
      toast.success(res.data.message);
      setSettleModalOpen(false);
      fetchFinance();
    } catch {
      toast.error("Settlement failed");
    }
  };

  const exportToCSV = () => {
    if (!data) return;
    const { summary } = data;
    const csvContent = [
      ["Metric", "Value"],
      ["Gross Revenue", summary.totalRevenue],
      ["Net Revenue (Excl Fees)", summary.netRevenue],
      ["Total Expenses", summary.expenses],
      ["Actual Net Profit", summary.netProfit],
      ["Cash in Hand", summary.cash],
      ["Unsettled Cash (Today)", summary.unsettledCash],
      ["Pending Dues", summary.pendingDues],
      ["Revenue Loss (No-Shows)", summary.noShowLoss]
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Akola_Finance_Report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
    <div className="space-y-6 pb-24">
      {/* Header with Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight text-foreground">Financial Command Center</h1>
          <p className="text-muted-foreground mt-1">Operational accounting and automated profit tracking.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={exportToCSV} className="border-border/50 bg-card/50">
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
          
          <Dialog open={expenseModalOpen} onOpenChange={setExpenseModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="border-border/50 bg-card/50">
                <Receipt className="w-4 h-4 mr-2" /> Log Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Log Arena Expense</DialogTitle>
                <DialogDescription>Record costs for accurate net profit calculation.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="category" className="text-right">Category</Label>
                  <Input id="category" placeholder="Electricity, Salary, Repairs..." className="col-span-3" value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)} />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="amount" className="text-right">Amount</Label>
                  <Input id="amount" type="number" placeholder="₹ 0.00" className="col-span-3" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="desc" className="text-right">Notes</Label>
                  <Input id="desc" placeholder="Details (Optional)" className="col-span-3" value={expenseDesc} onChange={e => setExpenseDesc(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddExpense}>Save Expense</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={settleModalOpen} onOpenChange={setSettleModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-turf text-primary-foreground shadow-turf">
                <CheckCircle2 className="w-4 h-4 mr-2" /> Close the Day
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Daily Settle-Up Report</DialogTitle>
                <DialogDescription>Verify cash collection before closing the registry.</DialogDescription>
              </DialogHeader>
              <div className="py-6 space-y-4">
                 <div className="flex flex-col items-center justify-center p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                    <p className="text-xs uppercase tracking-widest font-black text-emerald-500 mb-1">Total Unsettled Cash</p>
                    <p className="text-4xl font-black text-foreground">₹{summary.unsettledCash.toLocaleString()}</p>
                 </div>
                 <div className="space-y-3 text-sm text-muted-foreground bg-secondary/20 p-4 rounded-xl border border-border/50">
                    <p className="flex justify-between"><span>Physical Cash Today</span> <span className="text-foreground font-bold">₹{summary.cash.toLocaleString()}</span></p>
                    <p className="flex justify-between"><span>Unsettled Transactions</span> <span className="text-foreground font-bold">Available Now</span></p>
                 </div>
                 <AlertCircle className="w-5 h-5 text-amber-500 mx-auto" />
                 <p className="text-center text-xs text-muted-foreground px-4">Clicking Settle will mark all pending cash as 'Deposited' and clear the unsettled balance from your dashboard.</p>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setSettleModalOpen(false)}>Not Yet</Button>
                <Button onClick={handleSettlePayments} className="bg-emerald-600 hover:bg-emerald-700">Confirm & Settle</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Top Level Metrics (Primary) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card/50 border-border/50 shadow-sm overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
             <IndianRupee className="w-12 h-12" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-bold tracking-wider">Gross Revenue</CardDescription>
            <CardTitle className="text-2xl">₹{summary.totalRevenue.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs text-muted-foreground">
               <TrendingUp className="w-3 h-3 mr-1 text-emerald-500" />
               <span>Total booking & session volume</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50 shadow-sm overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
             <Calculator className="w-12 h-12" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-bold tracking-wider text-emerald-500">Actual Net Profit</CardDescription>
            <CardTitle className="text-2xl">₹{summary.netProfit.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs text-muted-foreground">
               <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
               <span>Revenue - (Fees + Expenses)</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50 shadow-sm overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
             <AlertCircle className="w-12 h-12" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-bold tracking-wider text-amber-500">Total Expenses</CardDescription>
            <CardTitle className="text-2xl text-destructive/80">₹{summary.expenses.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs text-muted-foreground">
               <div className="w-2 h-2 rounded-full bg-destructive/50 mr-2" />
               <span>Operating costs recorded</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50 shadow-sm overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
             <CheckCircle2 className="w-12 h-12" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-bold tracking-wider text-primary">Unsettled Cash</CardDescription>
            <CardTitle className="text-2xl">₹{summary.unsettledCash.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs text-muted-foreground">
               <span>Awaiting 'Close Day' verification</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Insights Row */}
      <div className="grid gap-4 lg:grid-cols-2">
         <Card className="bg-secondary/10 border-border/30">
            <CardContent className="pt-6">
               <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Revenue Loss (No-Shows)</p>
               <h4 className="text-xl font-bold text-destructive/70">₹{summary.noShowLoss.toLocaleString()}</h4>
               <p className="text-[10px] text-muted-foreground mt-1">From cancelled bookings</p>
            </CardContent>
         </Card>
         <Card className="bg-secondary/10 border-border/30">
            <CardContent className="pt-6">
               <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Platform Fees</p>
               <h4 className="text-xl font-bold">₹{summary.fees.toLocaleString()}</h4>
               <p className="text-[10px] text-muted-foreground mt-1">Total gateway costs</p>
            </CardContent>
         </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 bg-card/40 border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              14-Day Revenue Trend
            </CardTitle>
            <CardDescription>Daily income across all sports.</CardDescription>
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

        <Card className="bg-card/40 border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Payment Methods</CardTitle>
            <CardDescription>Manual vs Online breakdown.</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px] flex flex-col justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} />
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

      {/* Expenses & Facility Performance */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Expenses List */}
        <Card className="bg-card/40 border-border/50">
           <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recent Expenses</CardTitle>
                <CardDescription>Operating costs logged this month.</CardDescription>
              </div>
              <Badge variant="outline" className="font-mono text-destructive">₹{summary.expenses}</Badge>
           </CardHeader>
           <CardContent>
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                 {expenses.map((e: any) => (
                   <div key={e.id} className="group flex items-center justify-between p-3 rounded-xl border border-border/30 bg-secondary/5 hover:bg-secondary/10 transition-colors">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                            <Receipt className="w-4 h-4" />
                         </div>
                         <div>
                            <p className="text-sm font-bold">{e.category}</p>
                            <p className="text-[10px] text-muted-foreground">{format(new Date(e.expense_date), 'MMM dd, yyyy')} • {e.description || 'No notes'}</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-3">
                         <p className="font-bold text-destructive/80">-₹{Number(e.amount).toLocaleString()}</p>
                         <Button size="icon" variant="ghost" onClick={() => handleDeleteExpense(e.id)} className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                         </Button>
                      </div>
                   </div>
                 ))}
                 {expenses.length === 0 && <p className="text-center text-muted-foreground py-12 text-sm">No expenses recorded yet.</p>}
              </div>
           </CardContent>
        </Card>

        <Card className="bg-card/40 border-border/50">
           <CardHeader>
              <CardTitle className="text-lg">Revenue by Facility</CardTitle>
              <CardDescription>Comparison of sport performance.</CardDescription>
           </CardHeader>
           <CardContent className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={facilities}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="type" axisLine={false} tickLine={false} tick={{fill: 'currentColor', opacity: 0.5, fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: 'currentColor', opacity: 0.5, fontSize: 12}} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
           </CardContent>
        </Card>
      </div>
    </div>
  );
}
