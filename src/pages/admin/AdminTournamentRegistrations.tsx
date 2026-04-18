import { useState, useEffect } from "react";
import { ArrowLeft, Users, CheckCircle2, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/api";
import { format } from "date-fns";
import { Tournament } from "./AdminTournaments";
import { io, Socket } from "socket.io-client";

interface Registration {
  id: string;
  tournament_id: string;
  team_name: string;
  captain_name: string;
  phone: string;
  payment_status: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  created_at: string;
}

export default function AdminTournamentRegistrations({ tournament, onBack }: { tournament: Tournament, onBack: () => void }) {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRegistrations = async () => {
    try {
      const res = await api.get(`/tournaments/${tournament.id}/registrations`);
      setRegistrations(res.data);
    } catch {
      toast.error("Failed to load registrations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();

    // Listen for real-time registration success updates
    const socket: Socket = io(import.meta.env.VITE_API_URL || "http://localhost:5000");
    socket.on("tournament_registration_success", () => {
      fetchRegistrations(); // Refresh the list
    });

    return () => {
      socket.disconnect();
    };
  }, [tournament.id]);

  const paidCount = registrations.filter(r => r.payment_status === 'paid' || r.payment_status === 'completed').length;

  const handleDeleteRegistration = (regId: string, teamName: string) => {
    toast(`Remove team ${teamName}?`, {
      description: "This will permanently delete their registration.",
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            await api.delete(`/tournaments/registrations/${regId}`);
            toast.success("Team registration removed");
            fetchRegistrations();
          } catch {
            toast.error("Failed to remove team");
          }
        }
      },
      cancel: { label: "Cancel", onClick: () => {} }
    });
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
      <div className="flex justify-between items-center bg-card p-6 rounded-2xl border border-border">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-heading font-bold flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" /> {tournament.name} Registrations
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              <span className="text-foreground font-bold">{paidCount}</span> / {tournament.max_teams} Slots Filled
            </p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading specific registrations...</div>
        ) : registrations.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No teams registered yet.</div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/50 text-muted-foreground font-bold">
                  <tr>
                    <th className="px-6 py-4">Registration Date</th>
                    <th className="px-6 py-4">Team Name</th>
                    <th className="px-6 py-4">Captain</th>
                    <th className="px-6 py-4">Contact</th>
                    <th className="px-6 py-4">Payment Status</th>
                    <th className="px-6 py-4">Order Ref</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((r) => (
                    <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                        {format(new Date(r.created_at), "dd MMM yyyy, hh:mm a")}
                      </td>
                      <td className="px-6 py-4 font-bold text-base">{r.team_name}</td>
                      <td className="px-6 py-4 text-foreground">{r.captain_name}</td>
                      <td className="px-6 py-4 font-mono text-muted-foreground">{r.phone}</td>
                      <td className="px-6 py-4">
                        {r.payment_status === 'paid' || r.payment_status === 'completed' ? (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full w-fit">
                            <CheckCircle2 className="w-3.5 h-3.5" /> PAID
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full w-fit">
                            <Clock className="w-3.5 h-3.5" /> PENDING
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-[10px] font-mono text-muted-foreground truncate w-32" title={r.razorpay_payment_id || r.razorpay_order_id || "-"}>
                          {r.razorpay_payment_id || r.razorpay_order_id || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive" 
                          onClick={() => handleDeleteRegistration(r.id, r.team_name)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="flex flex-col gap-4 p-4 md:hidden">
              {registrations.map((r) => (
                <div key={r.id} className="border border-border bg-muted/20 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 pr-2">
                      <div className="font-bold text-base text-foreground line-clamp-1">{r.team_name}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 flex flex-wrap gap-x-2 gap-y-1">
                        <span>{format(new Date(r.created_at), "dd MMM yyyy")}</span>
                        <span>{format(new Date(r.created_at), "hh:mm a")}</span>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0" 
                      onClick={() => handleDeleteRegistration(r.id, r.team_name)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  
                  <div className="space-y-1.5 bg-background border border-border p-3 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Captain</span> 
                      <span className="font-medium text-foreground">{r.captain_name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Phone</span> 
                      <span className="font-mono text-[13px]">{r.phone}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2">
                    {r.payment_status === 'paid' || r.payment_status === 'completed' ? (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded uppercase">
                        <CheckCircle2 className="w-3 h-3" /> Paid
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded uppercase">
                        <Clock className="w-3 h-3" /> Pending
                      </div>
                    )}
                    <div className="text-[10px] font-mono text-muted-foreground truncate max-w-[120px]" title={r.razorpay_payment_id || r.razorpay_order_id || "-"}>
                      Ref: {r.razorpay_payment_id || r.razorpay_order_id || "-"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
