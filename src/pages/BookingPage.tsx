import { useState } from "react";
import { format, addDays } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, Clock, User, Phone, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { generateSlots, type Slot } from "@/lib/mock-data";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/landing/FooterSection";
import { toast } from "sonner";

type Step = "date" | "slot" | "details" | "confirm" | "success";

export default function BookingPage() {
  const [step, setStep] = useState<Step>("date");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
    setSlots(generateSlots(date));
    setSelectedSlot(null);
    setStep("slot");
  };

  const handleSlotSelect = (slot: Slot) => {
    if (!slot.isAvailable) return;
    setSelectedSlot(slot);
    setStep("details");
  };

  const handleSubmit = () => {
    if (!name.trim() || !phone.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    setStep("confirm");
  };

  const handleConfirmBooking = () => {
    toast.success("Booking confirmed! Payment link sent to your phone.");
    setStep("success");
  };

  const resetBooking = () => {
    setStep("date");
    setSelectedDate(undefined);
    setSelectedSlot(null);
    setName("");
    setPhone("");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
          {/* Progress */}
          <div className="flex items-center justify-center gap-2 mb-12">
            {(["date", "slot", "details", "confirm"] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  step === s || (["date", "slot", "details", "confirm"].indexOf(step) > i)
                    ? "bg-gradient-turf text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                }`}>
                  {i + 1}
                </div>
                {i < 3 && <div className={`w-8 sm:w-12 h-0.5 ${["date", "slot", "details", "confirm"].indexOf(step) > i ? "bg-primary" : "bg-border"}`} />}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === "date" && (
              <motion.div key="date" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="text-center">
                <h1 className="font-heading text-3xl lg:text-4xl font-bold mb-2">Pick a <span className="text-gradient-turf">Date</span></h1>
                <p className="text-muted-foreground mb-8">Select the date you want to play</p>
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    disabled={(date) => date < new Date() || date > addDays(new Date(), 30)}
                    className="rounded-2xl border border-border bg-card p-4 pointer-events-auto"
                  />
                </div>
              </motion.div>
            )}

            {step === "slot" && (
              <motion.div key="slot" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="text-center mb-8">
                  <h1 className="font-heading text-3xl lg:text-4xl font-bold mb-2">Choose a <span className="text-gradient-turf">Slot</span></h1>
                  <p className="text-muted-foreground">
                    {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}
                    <button onClick={() => setStep("date")} className="ml-2 text-primary hover:underline text-sm">Change</button>
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {slots.map((slot) => (
                    <button
                      key={slot.id}
                      disabled={!slot.isAvailable}
                      onClick={() => handleSlotSelect(slot)}
                      className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                        !slot.isAvailable
                          ? "bg-muted/30 border-border/50 opacity-50 cursor-not-allowed"
                          : selectedSlot?.id === slot.id
                          ? "bg-primary/10 border-primary shadow-turf"
                          : "bg-card border-border hover:border-primary/40 hover:shadow-turf cursor-pointer"
                      }`}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        <span className="text-sm font-semibold text-foreground">{slot.startTime}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{slot.startTime} – {slot.endTime}</p>
                      <p className="text-sm font-bold text-primary mt-1">₹{slot.price}</p>
                      {!slot.isAvailable && <p className="text-xs text-destructive mt-1">Booked</p>}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

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
                      <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" className="pl-10 bg-card border-border" />
                    </div>
                  </div>
                  <Button onClick={handleSubmit} className="w-full bg-gradient-turf text-primary-foreground font-semibold shadow-turf hover:opacity-90">
                    Review Booking <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === "confirm" && selectedSlot && selectedDate && (
              <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-md mx-auto">
                <div className="text-center mb-8">
                  <h1 className="font-heading text-3xl font-bold mb-2">Confirm <span className="text-gradient-turf">Booking</span></h1>
                </div>
                <div className="rounded-2xl bg-card border border-border p-6 space-y-4 mb-6">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Date</span><span className="text-foreground font-medium">{format(selectedDate, "PPP")}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Time</span><span className="text-foreground font-medium">{selectedSlot.startTime} – {selectedSlot.endTime}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Name</span><span className="text-foreground font-medium">{name}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Phone</span><span className="text-foreground font-medium">{phone}</span></div>
                  <div className="border-t border-border pt-4 flex justify-between">
                    <span className="font-semibold text-foreground">Total</span>
                    <span className="font-heading text-2xl font-bold text-primary">₹{selectedSlot.price}</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep("details")} className="flex-1">Back</Button>
                  <Button onClick={handleConfirmBooking} className="flex-1 bg-gradient-turf text-primary-foreground font-semibold shadow-turf hover:opacity-90">
                    Pay & Confirm
                  </Button>
                </div>
              </motion.div>
            )}

            {step === "success" && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md mx-auto">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6 glow-turf">
                  <CheckCircle2 className="w-10 h-10 text-primary" />
                </div>
                <h1 className="font-heading text-3xl font-bold mb-2">Booking <span className="text-gradient-turf">Confirmed!</span></h1>
                <p className="text-muted-foreground mb-8">Your slot has been booked successfully. You'll receive a confirmation on WhatsApp shortly.</p>
                <Button onClick={resetBooking} className="bg-gradient-turf text-primary-foreground font-semibold shadow-turf hover:opacity-90">
                  Book Another Slot
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
