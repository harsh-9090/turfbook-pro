import { useState, useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { ShieldCheck, XCircle, AlertCircle, RefreshCcw, User, Clock, Wallet, ArrowRightCircle, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import api from "@/lib/api";
import { formatTime12Hour, cn } from "@/lib/utils";

export default function StaffScanner() {
  const [scanResult, setScanResult] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (isScanning && !scannerRef.current) {
      scannerRef.current = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );
      scannerRef.current.render(onScanSuccess, onScanFailure);
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Scanner cleanup failed", err));
        scannerRef.current = null;
      }
    };
  }, [isScanning]);

  async function onScanSuccess(decodedText: string) {
    if (loading) return;
    setLoading(true);
    // Pause scanning after success
    if (scannerRef.current) {
      scannerRef.current.pause();
    }

    try {
      const res = await api.get(`/bookings/verify-qr/${decodedText}`);
      setScanResult(res.data);
      setIsScanning(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Invalid or Expired QR");
      if (scannerRef.current) scannerRef.current.resume();
    } finally {
      setLoading(false);
    }
  }

  function onScanFailure(error: any) {
    // Silently continue scanning
  }

  const handleCheckIn = async () => {
    if (!scanResult) return;
    setLoading(true);
    try {
      await api.patch(`/bookings/${scanResult.booking.id}/check-in`);
      toast.success("Entry Confirmed!");
      resetScanner();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Check-in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleExtend = async () => {
    if (!scanResult) return;
    setLoading(true);
    try {
      const res = await api.post(`/bookings/${scanResult.booking.id}/extend`);
      toast.success(res.data.message || "Booking Extended!");
      // Optionally refresh scan result or reset
      resetScanner();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Extension failed: Next slot might be booked.");
    } finally {
      setLoading(false);
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    setIsScanning(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
         <h2 className="text-2xl font-bold font-heading">Gate <span className="text-primary">Scanner</span></h2>
         {!isScanning && (
           <Button variant="outline" size="sm" onClick={resetScanner}>
              <RefreshCcw className="w-4 h-4 mr-2" /> New Scan
           </Button>
         )}
      </div>

      {isScanning ? (
        <Card className="overflow-hidden border-2 border-primary/20 shadow-xl bg-black">
          <CardContent className="p-0">
             <div id="reader" className="w-full aspect-square" />
          </CardContent>
          <div className="p-4 bg-primary/5 flex items-center justify-center gap-2">
             <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
             <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Point camera at player pass</span>
          </div>
        </Card>
      ) : scanResult && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
           <Card className={cn(
             "border-2",
             scanResult.timing.isExpired ? "border-destructive/50 bg-destructive/5" :
             !scanResult.canCheckIn ? "border-amber-500/50 bg-amber-500/5" :
             "border-emerald-500/50 bg-emerald-500/5"
           )}>
             <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-6">
                   <div className={cn(
                     "w-12 h-12 rounded-full flex items-center justify-center",
                     scanResult.timing.isExpired ? "bg-destructive/20 text-destructive" :
                     !scanResult.canCheckIn ? "bg-amber-500/20 text-amber-500" :
                     "bg-emerald-500/20 text-emerald-500"
                   )}>
                      {scanResult.timing.isExpired ? <XCircle className="w-7 h-7" /> :
                       !scanResult.canCheckIn ? <AlertCircle className="w-7 h-7" /> :
                       <ShieldCheck className="w-7 h-7" />}
                   </div>
                   <div>
                      <h3 className="text-xl font-bold">
                        {scanResult.timing.isExpired ? "Access Denied" :
                         scanResult.booking.checked_in_at ? "Already Entered" :
                         scanResult.timing.isFuture ? "Too Early" : "Access Granted"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {scanResult.timing.isExpired ? "This session has expired." :
                         scanResult.booking.checked_in_at ? "Passenger has already checked in." :
                         scanResult.timing.isFuture ? "The player is early for their slot." : "Valid entry pass found."}
                      </p>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-6 pt-6 border-t border-border/50">
                   <div className="space-y-4">
                      <div className="flex items-start gap-3">
                         <User className="w-4 h-4 text-primary mt-1" />
                         <div>
                            <p className="text-[10px] font-bold uppercase text-muted-foreground">Customer</p>
                            <p className="font-bold">{scanResult.booking.customer_name}</p>
                            <p className="text-xs text-muted-foreground">{scanResult.booking.phone}</p>
                         </div>
                      </div>
                      <div className="flex items-start gap-3">
                         <MapPin className="w-4 h-4 text-primary mt-1" />
                         <div>
                            <p className="text-[10px] font-bold uppercase text-muted-foreground">Venue</p>
                            <p className="font-bold">{scanResult.booking.facility_name} {scanResult.booking.table_number > 0 ? `#${scanResult.booking.table_number}` : ''}</p>
                         </div>
                      </div>
                   </div>
                   <div className="space-y-4">
                      <div className="flex items-start gap-3">
                         <Clock className="w-4 h-4 text-primary mt-1" />
                         <div>
                            <p className="text-[10px] font-bold uppercase text-muted-foreground">Timing</p>
                            <p className="font-bold">{formatTime12Hour(scanResult.booking.start_time)} - {formatTime12Hour(scanResult.booking.end_time)}</p>
                         </div>
                      </div>
                      <div className="flex items-start gap-3">
                         <Wallet className="w-4 h-4 text-primary mt-1" />
                         <div>
                            <p className="text-[10px] font-bold uppercase text-muted-foreground">Payment</p>
                            <Badge variant={scanResult.booking.payment_status === 'paid' ? 'default' : 'destructive'} className="mt-1">
                               {scanResult.booking.payment_status === 'paid' ? 'Full Paid' : `Pending ₹${scanResult.booking.remaining_amount}`}
                            </Badge>
                         </div>
                      </div>
                   </div>
                </div>
             </CardContent>
           </Card>

           <div className="flex flex-col gap-3">
              {scanResult.canCheckIn && (
                 <Button onClick={handleCheckIn} disabled={loading} className="h-14 text-lg font-bold bg-emerald-600 hover:bg-emerald-700 shadow-lg">
                    Confirm Entry <ArrowRightCircle className="ml-2 w-5 h-5" />
                 </Button>
              )}
              {scanResult.booking.payment_status !== 'paid' && (
                 <p className="text-center text-xs text-destructive font-bold animate-pulse">
                    ⚠️ COLLECT ₹{scanResult.booking.remaining_amount} BEFORE ENTRY
                 </p>
              )}
              {!scanResult.timing.isExpired && (
                 <Button variant="secondary" onClick={handleExtend} className="h-12">
                     Extend Booking (+1 Hour)
                 </Button>
              )}
              <Button variant="outline" onClick={resetScanner} className="h-12 rounded-xl">
                 Cancel & Go Back
              </Button>
           </div>
        </div>
      )}
    </div>
  );
}
