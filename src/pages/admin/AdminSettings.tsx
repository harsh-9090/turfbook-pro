import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Mail, Lock, ShieldAlert, Download, RefreshCcw, LogOut, ShieldCheck, Trash2, AlertTriangle, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import api from "@/lib/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function AdminSettings() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Load current admin info from localStorage or token
    const token = localStorage.getItem("adminToken");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setName(payload.name || "System Admin");
        setEmail(payload.email || "");
      } catch (e) {
        console.error("Token decode failed", e);
      }
    }
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/auth/profile', { name, email });
      toast.success("Profile updated! Please login again if you changed your email.");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return toast.error("New passwords do not match");
    }
    if (newPassword.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }
    setSaving(true);
    try {
      await api.put('/auth/password', { currentPassword, newPassword });
      toast.success("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed; check current password");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin !== confirmPin) {
      return toast.error("PINs do not match");
    }
    if (!/^\d{4}$/.test(newPin)) {
      return toast.error("PIN must be exactly 4 digits");
    }
    setSaving(true);
    try {
      await api.put('/auth/pin', { currentPassword, newPin });
      toast.success("Login PIN updated successfully!");
      setNewPin("");
      setConfirmPin("");
      setCurrentPassword("");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed; check current password");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoutAll = async () => {
    try {
      await api.post('/auth/logout-all');
      toast.success("Logged out from all devices. Logging you out now...");
      setTimeout(() => {
        localStorage.removeItem("adminToken");
        window.location.href = "/admin/login";
      }, 2000);
    } catch {
      toast.error("Failed to perform global logout");
    }
  };

  const handleExportData = async () => {
    try {
      const response = await api.get('/settings/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `akolasports_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      toast.success("Database export successful!");
    } catch {
      toast.error("Failed to export database");
    }
  };

  const handleResetData = async () => {
    if (resetConfirmText !== "DELETE ALL DATA") {
      return toast.error("Please type the confirmation text correctly");
    }
    try {
      await api.post('/settings/reset-data');
      toast.success("Platform data has been completely reset.");
      setResetConfirmText("");
      // Maybe reload to show empty stats
      setTimeout(() => window.location.reload(), 2000);
    } catch {
      toast.error("Data reset failed");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="grid lg:grid-cols-3 gap-8">

        {/* Profile Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-turf flex items-center justify-center mx-auto mb-4 text-primary-foreground text-3xl font-bold">
              {name[0]}
            </div>
            <h3 className="font-heading font-bold text-xl">{name}</h3>
            <p className="text-sm text-muted-foreground">{email}</p>
            <div className="mt-4 flex justify-center">
              <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider rounded-full border border-primary/20">
                System Administrator
              </span>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
            <Button variant="outline" className="w-full justify-start gap-3" onClick={handleExportData}>
              <Download className="w-4 h-4 text-emerald-500" /> Export Database
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3 text-destructive hover:bg-destructive/5" onClick={handleLogoutAll}>
              <LogOut className="w-4 h-4" /> Terminate All Sessions
            </Button>
          </div>
        </div>

        {/* Main Settings Areas */}
        <div className="lg:col-span-2 space-y-8">

          {/* Profile Details */}
          <section className="bg-card border border-border rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-5 h-5 text-primary" />
              <h3 className="font-heading font-bold text-lg">Profile Details</h3>
            </div>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Username</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Admin Name" className="bg-background" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Email Address</label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="admin@example.com" className="bg-background" />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saving} className="bg-primary/10 text-primary hover:bg-primary hover:text-white border-primary/20 transition-all font-bold">
                  {saving ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            </form>
          </section>

          {/* Account Security - Password */}
          <section className="bg-card border border-border rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <h3 className="font-heading font-bold text-lg">Account Security</h3>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Current Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" className="pl-10 bg-background" />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 border-t border-border/50 pt-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">New Password</label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New Password" className="bg-background" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Confirm New</label>
                  <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm New" className="bg-background" />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saving} className="bg-primary/10 text-primary hover:bg-primary hover:text-white border-primary/20 transition-all font-bold">
                  Update Password
                </Button>
              </div>
            </form>
          </section>

          {/* PIN Management */}
          <section className="bg-card border border-border rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <KeyRound className="w-5 h-5 text-primary" />
              <h3 className="font-heading font-bold text-lg">Login PIN Management</h3>
            </div>
            <form onSubmit={handleUpdatePin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Confirm Current Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" className="pl-10 bg-background" />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 border-t border-border/50 pt-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">New 4-Digit PIN</label>
                  <Input
                    type="password"
                    maxLength={4}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, "").substring(0, 4))}
                    placeholder="0000"
                    className="bg-background text-center tracking-[0.5em] font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Confirm New PIN</label>
                  <Input
                    type="password"
                    maxLength={4}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, "").substring(0, 4))}
                    placeholder="0000"
                    className="bg-background text-center tracking-[0.5em] font-bold"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saving} className="bg-primary/10 text-primary hover:bg-primary hover:text-white border-primary/20 transition-all font-bold">
                  Update Login PIN
                </Button>
              </div>
            </form>
          </section>

          {/* Danger Zone */}
          <section className="border-2 border-destructive/20 bg-destructive/5 rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="w-6 h-6 text-destructive" />
              <h3 className="font-heading font-bold text-lg text-destructive">Danger Zone</h3>
            </div>
            <p className="text-sm text-muted-foreground">Destructive actions. Use with extreme caution. No undo available.</p>

            <div className="flex flex-col sm:flex-row gap-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="flex-1 font-bold gap-2">
                    <Trash2 className="w-4 h-4" /> Reset Website Data
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-card border-border border">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="w-5 h-5" /> Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground">
                      This will delete ALL bookings, payments, and non-admin users. Your admin account and turfs will remain safe, but the platform will be reset to a factory state.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="p-4 bg-muted rounded-xl space-y-2">
                    <p className="text-xs font-bold uppercase text-muted-foreground">Type <span className="text-destructive">DELETE ALL DATA</span> to confirm</p>
                    <Input
                      value={resetConfirmText}
                      onChange={(e) => setResetConfirmText(e.target.value)}
                      placeholder="Type confirmation text here"
                      className="bg-background border-destructive/30 focus-visible:ring-destructive"
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-secondary">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleResetData}
                      className="bg-destructive text-white hover:bg-destructive/90"
                      disabled={resetConfirmText !== "DELETE ALL DATA"}
                    >
                      Process Factory Reset
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button variant="outline" className="flex-1 font-bold border-destructive/30 text-destructive hover:bg-destructive hover:text-white" onClick={() => toast.info("Feature coming soon")}>
                Delete Non-Admin Users
              </Button>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
