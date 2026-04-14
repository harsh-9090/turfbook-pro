import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === "admin@turfzone.com" && password === "admin123") {
      localStorage.setItem("adminToken", "demo-jwt-token");
      toast.success("Welcome back, Admin!");
      navigate("/admin");
    } else {
      toast.error("Invalid credentials. Try admin@turfzone.com / admin123");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-turf flex items-center justify-center mx-auto mb-4">
            <span className="font-heading font-bold text-primary-foreground text-2xl">T</span>
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Admin Login</h1>
          <p className="text-sm text-muted-foreground mt-1">TurfZone Management Panel</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 rounded-2xl bg-card border border-border p-6">
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@turfzone.com" type="email" className="pl-10 bg-background border-border" />
            </div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" type="password" className="pl-10 bg-background border-border" />
            </div>
          </div>
          <Button type="submit" className="w-full bg-gradient-turf text-primary-foreground font-semibold shadow-turf hover:opacity-90">
            Sign In
          </Button>
          <p className="text-xs text-muted-foreground text-center">Demo: admin@turfzone.com / admin123</p>
        </form>
      </motion.div>
    </div>
  );
}
