import { useState, useEffect } from "react";
import { Users, AlertTriangle, CheckCircle2, Clock, MapPin, User, LogIn } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import api from "@/lib/api";
import { formatTime12Hour, cn } from "@/lib/utils";
import { useSocket } from "@/hooks/useSocket";

export default function LivePresence() {
  const [presence, setPresence] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPresence = async () => {
    try {
      const res = await api.get('/bookings/live-presence');
      setPresence(res.data);
    } catch (err) {
      console.error("Failed to fetch presence", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPresence();
  }, []);

  useSocket('booking_updated', fetchPresence);

  const currentlyIn = presence.filter(b => b.checked_in_at !== null);
  const waitingFor = presence.filter(b => b.checked_in_at === null);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
         <Card className="bg-emerald-500/10 border-emerald-500/20">
            <CardContent className="p-4 flex items-center gap-4">
               <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600">
                  <Users className="w-5 h-5" />
               </div>
               <div>
                  <p className="text-[10px] font-bold uppercase text-emerald-600/70 tracking-widest">Active Now</p>
                  <p className="text-2xl font-bold text-emerald-700">{currentlyIn.length}</p>
               </div>
            </CardContent>
         </Card>
         <Card className="bg-amber-500/10 border-amber-500/20">
            <CardContent className="p-4 flex items-center gap-4">
               <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-600">
                  <Clock className="w-5 h-5" />
               </div>
               <div>
                  <p className="text-[10px] font-bold uppercase text-amber-600/70 tracking-widest">Expected</p>
                  <p className="text-2xl font-bold text-amber-700">{waitingFor.length}</p>
               </div>
            </CardContent>
         </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
         {/* Currently Inside */}
         <Card>
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
               <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Currently Playing
               </CardTitle>
               <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600">{currentlyIn.length}</Badge>
            </CardHeader>
            <CardContent className="p-0">
               <ScrollArea className="h-[300px]">
                  <div className="divide-y divide-border">
                     {currentlyIn.length > 0 ? currentlyIn.map(b => (
                        <div key={b.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                 <User className="w-4 h-4" />
                              </div>
                              <div>
                                 <p className="text-sm font-bold leading-none mb-1">{b.customer_name}</p>
                                 <p className="text-[10px] text-muted-foreground uppercase">{b.facility_name} {b.table_number > 0 ? `#${b.table_number}` : ''}</p>
                              </div>
                           </div>
                           <div className="text-right">
                              <p className="text-xs font-bold text-emerald-600 flex items-center justify-end gap-1">
                                 <LogIn className="w-3 h-3" /> {formatTime12Hour(new Date(b.checked_in_at).toTimeString())}
                              </p>
                              <p className="text-[10px] text-muted-foreground">Ends at {formatTime12Hour(b.end_time)}</p>
                           </div>
                        </div>
                     )) : (
                        <div className="p-12 text-center text-muted-foreground">
                           <p className="text-sm">No active sessions right now.</p>
                        </div>
                     )}
                  </div>
               </ScrollArea>
            </CardContent>
         </Card>

         {/* Waiting/No-shows */}
         <Card>
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
               <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" /> Waiting / No-shows
               </CardTitle>
               <Badge variant="secondary" className="bg-amber-500/10 text-amber-600">{waitingFor.length}</Badge>
            </CardHeader>
            <CardContent className="p-0">
               <ScrollArea className="h-[300px]">
                  <div className="divide-y divide-border">
                     {waitingFor.length > 0 ? waitingFor.map(b => (
                        <div key={b.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                                 <User className="w-4 h-4" />
                              </div>
                              <div>
                                 <p className="text-sm font-bold leading-none mb-1">{b.customer_name}</p>
                                 <p className="text-[10px] text-muted-foreground uppercase">{b.facility_name} {b.table_number > 0 ? `#${b.table_number}` : ''}</p>
                              </div>
                           </div>
                           <div className="text-right">
                              <p className="text-xs font-bold text-amber-600">
                                 Starts {formatTime12Hour(b.start_time)}
                              </p>
                              <p className="text-[10px] text-muted-foreground">Expires {formatTime12Hour(b.end_time)}</p>
                           </div>
                        </div>
                     )) : (
                        <div className="p-12 text-center text-muted-foreground">
                           <p className="text-sm">Everyone has checked in!</p>
                        </div>
                     )}
                  </div>
               </ScrollArea>
            </CardContent>
         </Card>
      </div>
    </div>
  );
}
