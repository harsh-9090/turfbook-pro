import { useState } from "react";
import { useNavigate, Link, Outlet, useLocation } from "react-router-dom";
import logoImage from "@/assets/logo.png";
import { LayoutDashboard, Calendar, CalendarDays, Settings, LogOut, BarChart3, Menu, X, Layers, Clock, Timer, DollarSign, Image as LucideImage, MessageSquare, Sun, Moon, Trophy, Megaphone, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";

const sidebarLinks = [
  { name: "Dashboard", path: "/admin", icon: LayoutDashboard },
  { name: "Calendar", path: "/admin/calendar", icon: CalendarDays },
  { name: "Bookings", path: "/admin/bookings", icon: Calendar },
  { name: "Daily Slots", path: "/admin/slots", icon: Settings },
  { name: "Live Tables", path: "/admin/tables", icon: Timer },
  { name: "Weekly Schedule", path: "/admin/schedules", icon: Clock },
  { name: "Sports Events", path: "/admin/facilities", icon: Layers },
  { name: "Tournaments", path: "/admin/tournaments", icon: Trophy },
  { name: "Pricing Plans", path: "/admin/pricing", icon: DollarSign },
  { name: "Gallery", path: "/admin/gallery", icon: LucideImage },
  { name: "Testimonials", path: "/admin/testimonials", icon: MessageSquare },
  { name: "Ad Studio", path: "/admin/ads", icon: Megaphone },
  { name: "Analytics", path: "/admin/analytics", icon: BarChart3 },
  { name: "Audit Logs", path: "/admin/audit-logs", icon: Shield },
  { name: "Settings Hub", path: "/admin/settings", icon: Settings },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen bg-background flex">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 lg:translate-x-0 lg:static ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center gap-2 px-6 h-16 border-b border-border min-w-0 overflow-hidden">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-white/5 border border-white/10 shrink-0">
            <img src={logoImage} alt="Logo" className="w-full h-full object-cover scale-110" />
          </div>
          <span className="font-heading font-bold text-foreground truncate">Akola Sports Arena <span className="text-primary text-xs">Admin</span></span>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden ml-auto text-muted-foreground shrink-0"><X size={20} /></button>
        </div>
        <nav className="p-4 space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 64px - 60px)' }}>
          {sidebarLinks.map((link) => (
            <Link key={link.path} to={link.path} onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${location.pathname === link.path ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}>
              <link.icon className="w-4 h-4" />{link.name}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-4 left-4 right-4">
          <Button variant="ghost" onClick={handleLogout} className="w-full justify-start text-muted-foreground hover:text-destructive">
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-40 bg-background/80 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        <header className="h-16 border-b border-border flex items-center px-4 lg:px-8 gap-4">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-muted-foreground"><Menu size={20} /></button>
          <h2 className="font-heading font-semibold text-foreground">
            {sidebarLinks.find((l) => l.path === location.pathname)?.name || "Dashboard"}
          </h2>
          <button
            onClick={toggleTheme}
            className="ml-auto w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </header>
        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
