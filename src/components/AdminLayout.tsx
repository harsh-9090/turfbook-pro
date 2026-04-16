import { useState } from "react";
import { useNavigate, Link, Outlet, useLocation } from "react-router-dom";
import { LayoutDashboard, Calendar, Settings, LogOut, BarChart3, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const sidebarLinks = [
  { name: "Dashboard", path: "/admin", icon: LayoutDashboard },
  { name: "Bookings", path: "/admin/bookings", icon: Calendar },
  { name: "Slot Management", path: "/admin/slots", icon: Settings },
  { name: "Analytics", path: "/admin/analytics", icon: BarChart3 },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen bg-background flex">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 lg:translate-x-0 lg:static ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center gap-2 px-6 h-16 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-gradient-turf flex items-center justify-center">
            <span className="font-heading font-bold text-primary-foreground text-sm">S</span>
          </div>
          <span className="font-heading font-bold text-foreground">Akola Sports <span className="text-primary text-xs">Admin</span></span>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden ml-auto text-muted-foreground"><X size={20} /></button>
        </div>
        <nav className="p-4 space-y-1">
          {sidebarLinks.map((link) => (
            <Link key={link.path} to={link.path} onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === link.path ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
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

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="h-16 border-b border-border flex items-center px-4 lg:px-8 gap-4">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-muted-foreground"><Menu size={20} /></button>
          <h2 className="font-heading font-semibold text-foreground">
            {sidebarLinks.find((l) => l.path === location.pathname)?.name || "Dashboard"}
          </h2>
        </header>
        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
