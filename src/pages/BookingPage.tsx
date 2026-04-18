import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { format, addDays, startOfDay, parse, isAfter } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, Clock, User, Phone, ArrowRight, CheckCircle2, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { type Slot, type FacilityType, facilityLabels } from "@/lib/mock-data";
import api from "@/lib/api";
import { useSocket } from "@/hooks/useSocket";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/landing/FooterSection";
import { toast } from "sonner";
import cricketImg from "@/assets/cricket-turf.jpg";
import snookerImg from "@/assets/snooker-room.jpg";
import poolImg from "@/assets/pool-room.jpg";

type Step = "facility" | "date" | "slot" | "details" | "confirm" | "success";

const facilityCards: { id: FacilityType; name: string; desc: string; image: string }[] = [
  { id: "cricket", name: "Cricket Turf", desc: "Professional batting lanes with nets & bowling machine", image: cricketImg },
  { id: "snooker", name: "Snooker Table", desc: "Full-size championship tables in AC lounge", image: snookerImg },
  { id: "pool", name: "Pool Table", desc: "Tournament-quality pool tables with great ambiance", image: poolImg },
];

function formatHour(h: number): string {
  if (h === 0 || h === 24) return "12AM";
  if (h === 12) return "12PM";
  return h > 12 ? `${h - 12}PM` : `${h}AM`;
}

export default function BookingPage() {
  const [searchParams] = useSearchParams();
  const preselected = searchParams.get("facility") as FacilityType | null;

  const [step, setStep] = useState<Step>(preselected ? "date" : "facility");
  const [facility, setFacility] = useState<FacilityType>(preselected || "cricket");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [groupedSlots, setGroupedSlots] = useState<{ time: string, price: number, slots: any[], availableSlots: any[], isAvailable: boolean }[]>([]);
  const [selectedSlotGroup, setSelectedSlotGroup] = useState<any | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Table-based state for snooker/pool
  const [allFacilities, setAllFacilities] = useState<any[]>([]);
  const facilityData = allFacilities.find((f: any) => f.facility_type === facility);
  const [isPartialPayment, setIsPartialPayment] = useState(false);
  const [tableStatus, setTableStatus] = useState<any[]>([]);
  const [selectedTableSlot, setSelectedTableSlot] = useState<any | null>(null);

  // Fetch all facilities on mount to get dynamic hours
  useEffect(() => {
    api.get('/facilities').then(res => setAllFacilities(res.data)).catch(() => {});
  }, []);

  const isTableSport = facility === "snooker" || facility === "pool";

  const handleFacilitySelect = async (f: FacilityType) => {
    setFacility(f);
    setStep("date");
  };

  const handleDateSelect = async (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
    try {
      const formattedDate = format(date, "yyyy-MM-dd");
      const response = await api.get(`/slots?date=${formattedDate}&facility_type=${facility}`);

      const groups: Record<string, any[]> = {};
      response.data.forEach((s: any) => {
        const time = s.start_time.substring(0, 5) + " – " + s.end_time.substring(0, 5);
        if (!groups[time]) groups[time] = [];
        groups[time].push(s);
      });

      const mappedGroups = Object.entries(groups).map(([time, arr]) => {
        let availableSlots = arr.filter(s => s.is_available);

        const now = new Date();
        availableSlots = availableSlots.filter(s => {
          const slotDateTime = parse(`${formattedDate} ${s.start_time.substring(0, 5)}`, "yyyy-MM-dd HH:mm", new Date());
          return isAfter(slotDateTime, now);
        });

        return {
          time,
          price: Number(arr[0].price),
          slots: arr,
          availableSlots,
          isAvailable: availableSlots.length > 0
        };
      });

      setGroupedSlots(mappedGroups);
      setSelectedSlotGroup(null);
      setSelectedSlot(null);
      setStep("slot");
    } catch (error) {
      toast.error("Failed to load slots");
    }
  };

  useSocket('booking_updated', () => {
    if (selectedDate && step === "slot") handleDateSelect(selectedDate);
  });

  useSocket('slot_updated', () => {
    if (selectedDate && step === "slot") handleDateSelect(selectedDate);
  });

  const handleGroupSelect = (group: any) => {
    setSelectedSlotGroup(group);
    setSelectedSlot(group.availableSlots[0]);
    setStep("details");
  };

  const handleTableSelect = async (facility_id: string, tableName: string, hourlyRate: number) => {
    // For snooker/pool: user picks an available table, we find/create a slot for it
    const today = format(new Date(), "yyyy-MM-dd");
    try {
      const slotsRes = await api.get(`/slots?date=${today}&turf_id=${facility_id}`);
      const availableSlot = slotsRes.data.find((s: any) => s.is_available);
      if (availableSlot) {
        setSelectedSlot(availableSlot);
        setSelectedTableSlot({ name: tableName, rate: hourlyRate });
        setSelectedDate(new Date());
        setSelectedSlotGroup({ time: 'Walk-in Session', price: hourlyRate });
        setStep("details");
      } else {
        toast.error("No available booking slots for this table today.");
      }
    } catch {
      toast.error("Failed to book this table.");
    }
  };

  const handleSubmit = () => {
    if (!name.trim() || !phone.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    if (phone.length !== 10) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }
    setStep("confirm");
  };

  const handleConfirmBooking = async () => {
    if (!selectedSlot) return;
    setIsSubmitting(true);

    // 1. Create a pending booking
    let bookingId = '';
    try {
      const bookingRes = await api.post('/bookings', {
        name,
        phone,
        slot_id: selectedSlot.id,
        paid_amount: 0 // Will be updated after payment success
      });
      bookingId = bookingRes.data.booking.id;
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Booking initialization failed");
      setIsSubmitting(false);
      return;
    }

    const payAmount = isPartialPayment ? Number(facilityData?.min_booking_amount) : selectedSlotGroup.price;

    // 2. Create Razorpay order
    try {
      const orderRes = await api.post('/payments/create-order', {
        amount: payAmount,
        booking_id: bookingId
      });

      const { order_id, amount: orderAmount, currency, key_id } = orderRes.data;

      // 3. Open Razorpay Checkout
      const options = {
        key: key_id,
        amount: orderAmount,
        currency: currency,
        name: "Akola Sports Arena",
        description: `Booking for ${facilityLabels[facility]}`,
        order_id: order_id,
        handler: async function (response: any) {
          // 4. Verify Signature
          try {
            const verifyRes = await api.post('/payments/verify', {
              booking_id: bookingId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (verifyRes.data.success) {
              toast.success("Payment successful! Booking confirmed.");
              setStep("success");
            } else {
              toast.error("Verification failed. Please contact support.");
            }
          } catch (err) {
            toast.error("Signature verification failed.");
          }
        },
        prefill: {
          name: name,
          contact: phone,
        },
        theme: {
          color: "#10b981", // turf-primary
        },
        modal: {
          ondismiss: function () {
            toast.warning("Payment cancelled. Booking remains pending.");
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
      setIsSubmitting(false); // Reset loading once Razorpay modal opens
    } catch (error: any) {
      console.error("Payment setup error:", error);
      toast.error("Payment initialization failed");
      setIsSubmitting(false);
    }
  };

  const resetBooking = () => {
    setStep("facility");
    setSelectedDate(undefined);
    setSelectedSlot(null);
    setSelectedTableSlot(null);
    setTableStatus([]);
    setName("");
    setPhone("");
  };

  const stepIndex = ["facility", "date", "slot", "details", "confirm"].indexOf(step);
  const stepLabels = ["Sport", "Date", "Slot", "Details", "Confirm"];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
          {/* Progress */}
          {step !== "success" && (
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-10">
              {stepLabels.map((label, i) => (
                <div key={label} className="flex items-center gap-1.5 sm:gap-2">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${stepIndex >= i ? "bg-gradient-turf text-primary-foreground" : "bg-secondary text-muted-foreground"
                      }`}>
                      {i + 1}
                    </div>
                    <span className="text-[10px] text-muted-foreground hidden sm:block">{label}</span>
                  </div>
                  {i < 4 && <div className={`w-6 sm:w-10 h-0.5 mb-4 sm:mb-0 ${stepIndex > i ? "bg-primary" : "bg-border"}`} />}
                </div>
              ))}
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* Step 1: Facility */}
            {step === "facility" && (
              <motion.div key="facility" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="text-center mb-8">
                  <h1 className="font-heading text-3xl lg:text-4xl font-bold mb-2">Choose Your <span className="text-gradient-turf">Sport</span></h1>
                  <p className="text-muted-foreground">What would you like to play today?</p>
                </div>
                <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
                  {facilityCards.map((f) => (
                    <button key={f.id} onClick={() => handleFacilitySelect(f.id)}
                      className="group text-left rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/40 hover:shadow-turf transition-all duration-300">
                      <div className="h-40 overflow-hidden">
                        <img src={f.image} alt={f.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>
                      <div className="p-4">
                        <h3 className="font-heading font-semibold text-foreground mb-1">{f.name}</h3>
                        <p className="text-xs text-muted-foreground mb-2">{f.desc}</p>
                        <span className="text-xs text-primary font-medium">
                          {(() => {
                            const match = allFacilities.find((fac: any) => fac.facility_type === f.id);
                            return match ? `${formatHour(match.opening_hour)} – ${formatHour(match.closing_hour)}` : "";
                          })()}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 2: Date */}
            {step === "date" && (
              <motion.div key="date" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="text-center">
                <button onClick={() => setStep("facility")} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4 transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Change sport
                </button>
                <h1 className="font-heading text-3xl lg:text-4xl font-bold mb-2">Pick a <span className="text-gradient-turf">Date</span></h1>
                <p className="text-muted-foreground mb-8">Booking <span className="text-primary font-medium">{facilityLabels[facility]}</span></p>
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    disabled={(date) => date < startOfDay(new Date()) || date > addDays(new Date(), 30)}
                    className="rounded-2xl border border-border bg-card p-4 pointer-events-auto"
                  />
                </div>
              </motion.div>
            )}

            {/* Step 3: Slot / Table View */}
            {step === "slot" && (
              <motion.div key="slot" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="text-center mb-8">
                  <h1 className="font-heading text-3xl lg:text-4xl font-bold mb-2">Choose a <span className="text-gradient-turf">Slot</span></h1>
                  <p className="text-muted-foreground">
                    <span className="text-primary font-medium">{facilityLabels[facility]}</span> · {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}
                    <button onClick={() => setStep("date")} className="ml-2 text-primary hover:underline text-sm">Change</button>
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {groupedSlots.map((group) => (
                    <button key={group.time} onClick={() => group.isAvailable && handleGroupSelect(group)}
                      disabled={!group.isAvailable}
                      className={`p-4 rounded-xl border text-left transition-all duration-200 ${!group.isAvailable ? "bg-muted/30 border-border/50 opacity-50 cursor-not-allowed"
                          : selectedSlotGroup?.time === group.time ? "bg-primary/10 border-primary shadow-turf"
                            : "bg-card border-border hover:border-primary/40 hover:shadow-turf cursor-pointer"
                        }`}>
                      <div className="flex items-center gap-1 mb-1">
                        <Clock className={`w-3.5 h-3.5 ${group.isAvailable ? "text-primary" : "text-muted-foreground"}`} />
                        <span className={`text-sm font-semibold ${group.isAvailable ? "text-foreground" : "text-muted-foreground"}`}>{group.time.split(' – ')[0]}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{group.time}</p>
                      <p className={`text-sm font-bold mt-1 ${group.isAvailable ? "text-primary" : "text-muted-foreground"}`}>₹{group.price}</p>
                      {group.isAvailable ? (
                        <p className="text-[10px] text-primary/80 mt-1 font-medium">
                          {group.availableSlots.length} {facility === "cricket" ? "lane" : "table"}(s) available
                        </p>
                      ) : (
                        <p className="text-[10px] text-destructive mt-1 font-semibold">Booked Full</p>
                      )}
                    </button>
                  ))}
                  {groupedSlots.length === 0 && (
                    <div className="col-span-full py-12 text-center text-muted-foreground">
                      No slots available on this date for {facilityLabels[facility]}. Try another day!
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 4: Details */}
            {step === "details" && (
              <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-md mx-auto">
                <div className="text-center mb-8">
                  <h1 className="font-heading text-3xl font-bold mb-2">Your <span className="text-gradient-turf">Details</span></h1>
                  <p className="text-muted-foreground">Fill in your details to complete the booking</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" className="pl-10 bg-card border-border" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        value={phone} 
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').substring(0, 10);
                          setPhone(val);
                        }} 
                        placeholder="+91 98765 43210" 
                        className="pl-10 bg-card border-border" 
                        type="tel"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep("slot")} className="flex-1">Back</Button>
                    <Button onClick={handleSubmit} className="flex-1 bg-gradient-turf text-primary-foreground font-semibold shadow-turf hover:opacity-90">
                      Review <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 5: Confirm */}
            {step === "confirm" && selectedSlot && selectedDate && (
              <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-md mx-auto">
                <div className="text-center mb-8">
                  <h1 className="font-heading text-3xl font-bold mb-2">Confirm <span className="text-gradient-turf">Booking</span></h1>
                </div>
                <div className="rounded-2xl bg-card border border-border p-6 space-y-4 mb-6">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Event</span><span className="text-foreground font-medium">{facilityLabels[facility]}</span></div>
                  {selectedTableSlot ? (
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Table</span><span className="text-foreground font-medium">{selectedTableSlot.name}</span></div>
                  ) : (
                    <>
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Date</span><span className="text-foreground font-medium">{format(selectedDate, "PPP")}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Time</span><span className="text-foreground font-medium">{selectedSlotGroup?.time}</span></div>
                    </>
                  )}
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Name</span><span className="text-foreground font-medium">{name}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Phone</span><span className="text-foreground font-medium">{phone}</span></div>

                  <div className="border-t border-border pt-4 space-y-4">
                    <div className="flex justify-between items-baseline">
                      <span className="font-semibold text-foreground">Total Amount</span>
                      <span className="font-heading text-xl font-bold text-foreground">₹{selectedSlotGroup?.price}</span>
                    </div>

                    {facilityData?.min_booking_amount > 0 && facilityData.min_booking_amount < selectedSlotGroup.price && (
                      <div className="space-y-3">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Choose Payment Level</Label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => setIsPartialPayment(false)}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${!isPartialPayment
                                ? "border-primary bg-primary/10 text-primary shadow-turf"
                                : "border-border bg-transparent text-muted-foreground hover:border-border/80"
                              }`}>
                            <span className="text-[10px] font-bold uppercase mb-1">Full Payment</span>
                            <span className="font-bold text-lg">₹{selectedSlotGroup.price}</span>
                          </button>
                          <button
                            onClick={() => setIsPartialPayment(true)}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${isPartialPayment
                                ? "border-primary bg-primary/10 text-primary shadow-turf"
                                : "border-border bg-transparent text-muted-foreground hover:border-border/80"
                              }`}>
                            <span className="text-[10px] font-bold uppercase mb-1">Pay Deposit</span>
                            <span className="font-bold text-lg">₹{facilityData.min_booking_amount}</span>
                          </button>
                        </div>
                        <p className="text-[10px] text-muted-foreground text-center italic">
                          {isPartialPayment
                            ? `You'll need to pay ₹${selectedSlotGroup.price - facilityData.min_booking_amount} extra at the venue.`
                            : "No extra charges at the venue."}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep("details")} className="flex-1">Back</Button>
                  <Button disabled={isSubmitting} onClick={handleConfirmBooking} className="flex-1 bg-gradient-turf text-primary-foreground font-semibold shadow-turf hover:opacity-90 disabled:opacity-70">
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Pay & Confirm"}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Success */}
            {step === "success" && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md mx-auto">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6 glow-turf">
                  <CheckCircle2 className="w-10 h-10 text-primary" />
                </div>
                <h1 className="font-heading text-3xl font-bold mb-2">Booking <span className="text-gradient-turf">Confirmed!</span></h1>
                <p className="text-muted-foreground mb-2">Your <span className="text-primary font-medium">{facilityLabels[facility]}</span> session is booked.</p>
                <p className="text-muted-foreground mb-8 text-sm">You'll receive a confirmation on WhatsApp shortly.</p>
                <Button onClick={resetBooking} className="bg-gradient-turf text-primary-foreground font-semibold shadow-turf hover:opacity-90">
                  Book Another Session
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <FooterSection />
    </div>
  );
}
