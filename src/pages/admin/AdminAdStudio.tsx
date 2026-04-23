import { useState, useEffect, useRef } from "react";
import { format, addDays } from "date-fns";
import * as htmlToImage from "html-to-image";
import { Download, Loader2, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/api";

export default function AdminAdStudio() {
  const [selectedDate, setSelectedDate] = useState<Date>(addDays(new Date(), 1)); // Default to tomorrow
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSlots();
  }, [selectedDate]);

  const fetchSlots = async () => {
    setLoading(true);
    try {
      const formattedDate = format(selectedDate, "yyyy-MM-dd");
      const res = await api.get(`/slots?date=${formattedDate}&facility_type=cricket`);

      const available = res.data.filter((s: any) => s.is_available);

      // Group by start time to handle multiple lanes seamlessly
      const grouped: Record<string, number> = {};
      available.forEach((s: any) => {
        const time = `${s.start_time.substring(0, 5)} - ${s.end_time.substring(0, 5)}`;
        grouped[time] = (grouped[time] || 0) + 1;
      });

      // Convert to array of unique time ranges
      setSlots(Object.keys(grouped).sort());
    } catch {
      toast.error("Failed to load slots");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!captureRef.current) return;
    setIsGenerating(true);
    try {
      // Temporarily ensure high quality capture params
      const dataUrl = await htmlToImage.toPng(captureRef.current, {
        quality: 1,
        pixelRatio: 1, // keeping ratio accurate to 1080x1920 standard
        cacheBust: true,
      });
      const link = document.createElement("a");
      link.download = `available-slots-${format(selectedDate, "yyyy-MM-dd")}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Ad downloaded successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate image.");
    } finally {
      setIsGenerating(false);
    }
  };

  const formatToAMPM = (timeStr: string) => {
    const [start, end] = timeStr.split(" - ");
    const startHour = parseInt(start.split(":")[0]);
    const endHour = parseInt(end.split(":")[0]);

    const formatHour = (h: number) => {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const hr = h % 12 || 12;
      return `${hr} ${ampm}`;
    };

    return `${formatHour(startHour)} - ${formatHour(endHour)}`;
  };

  // Support up to 18 slots (6 rows of 3)
  const displaySlots = slots.slice(0, 18);

  const getGridConfig = (count: number) => {
    if (count <= 6) return { cols: "grid-cols-2", gap: "gap-10", py: "py-10", text: "text-[50px]" };
    if (count <= 10) return { cols: "grid-cols-2", gap: "gap-8", py: "py-6", text: "text-[45px]" };
    // 11 to 18 slots
    return { cols: "grid-cols-3 max-w-[1000px]", gap: "gap-6", py: "py-5 px-3", text: "text-[32px]" };
  };

  const gridStyles = getGridConfig(displaySlots.length);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold flex items-center gap-2">
            <Megaphone className="w-8 h-8 text-primary" /> Ad Studio
          </h1>
          <p className="text-muted-foreground mt-1 text-sm lg:text-base">Automatically generate Instagram Story ad graphics for available Cricket Turf slots.</p>
        </div>
        <Button onClick={handleDownload} disabled={isGenerating || slots.length === 0} className="bg-gradient-turf text-primary-foreground font-bold h-12 px-6 shadow-turf hover:opacity-90 transition-all rounded-full w-full sm:w-auto">
          {isGenerating ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Download className="w-5 h-5 mr-2" />}
          Download Story (PNG)
        </Button>
      </div>

      <div className="flex gap-4 items-center bg-card p-2 rounded-2xl border border-border w-fit">
        <Button variant={selectedDate.getDate() === new Date().getDate() ? "default" : "ghost"} onClick={() => setSelectedDate(new Date())} className="rounded-xl">Today</Button>
        <Button variant={selectedDate.getDate() === addDays(new Date(), 1).getDate() ? "default" : "ghost"} onClick={() => setSelectedDate(addDays(new Date(), 1))} className="rounded-xl">Tomorrow</Button>
        <Button variant={selectedDate.getDate() === addDays(new Date(), 2).getDate() ? "default" : "ghost"} onClick={() => setSelectedDate(addDays(new Date(), 2))} className="rounded-xl">Day After</Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr,500px] gap-8">
        <div>
          {loading ? (
            <div className="p-8 text-center text-muted-foreground bg-card rounded-2xl border border-border"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />Loading availability...</div>
          ) : slots.length === 0 ? (
            <div className="p-8 text-center bg-card border border-border rounded-2xl">
              <p className="text-2xl font-bold text-foreground mb-2">Turf is Fully Booked! 🏏</p>
              <p className="text-muted-foreground">No available slots to advertise for {format(selectedDate, "MMM do")}.</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="font-bold text-xl mb-4 text-foreground">{slots.length} available slot(s) for {format(selectedDate, "EEEE")}</h3>
              {slots.length > 18 && (
                <p className="text-xs text-amber-500 mb-4 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                  Note: Found {slots.length} slots, but only the first 18 will visibly fit into the Instagram story template.
                </p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {displaySlots.map(s => (
                  <div key={s} className="bg-muted p-3 border border-border rounded-xl text-center text-sm font-semibold">{formatToAMPM(s)}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 1080x1920 Preview Canvas - Scaled down for UI */}
        <div className="bg-neutral-900 border border-border rounded-2xl p-4 overflow-hidden flex justify-center items-center h-[700px] relative">
          <p className="absolute top-4 left-4 text-xs font-bold text-muted-foreground z-20 uppercase tracking-widest bg-black/50 px-2 py-1 rounded">Scale Preview</p>

          {/* Transforming the 1080x1920 canvas to fit inside the preview container */}
          <div className="w-[1080px] h-[1920px] shrink-0 origin-center" style={{ transform: 'scale(0.32)' }}>

            {/* THIS IS THE ACTUAL ELEMENT CAPTURED BY htmlToImage */}
            <div ref={captureRef} className="w-[1080px] h-[1920px] bg-black flex flex-col justify-between overflow-hidden relative">
              {/* Background Design */}
              <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=3532&auto=format&fit=crop')] bg-cover bg-center" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-[#081f13] to-[#041109] mix-blend-multiply opacity-80" />
              <div className="absolute inset-0 bg-gradient-to-b from-[#10b981]/10 via-transparent to-transparent" />

              {/* Content */}
              <div className="relative z-10 p-20 flex flex-col h-full">
                <div className="text-center mt-20">
                  <p className="text-[#10b981] font-bold text-4xl uppercase tracking-widest mb-6">Akola Sports Arena</p>
                  <h1 className="text-[140px] font-black text-white leading-none uppercase font-heading italic tracking-tighter">Game<br />On.</h1>
                  <div className="w-32 h-3 bg-[#10b981] mx-auto mt-12 mb-16 rounded-full shadow-[0_0_30px_rgba(16,185,129,0.8)]" />

                  <p className="text-white text-5xl font-bold mb-6 tracking-wide">CRICKET TURF</p>
                  <div className="bg-[#10b981] text-black inline-block px-10 py-5 rounded-[2rem] text-5xl font-black uppercase tracking-wider shadow-[0_0_50px_rgba(16,185,129,0.4)]">
                    {selectedDate.getDate() === new Date().getDate() ? "Open Today" : format(selectedDate, "EEEE, MMM do")}
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-center items-center mt-12">
                  {displaySlots.length > 0 ? (
                    <div className="w-full">
                      <h2 className="text-[#10b981] text-[55px] font-black text-center mb-12 uppercase tracking-widest text-shadow-sm">Available Slots</h2>
                      <div className={`grid ${gridStyles.cols} ${gridStyles.gap} w-full max-w-4xl mx-auto`}>
                        {displaySlots.map(s => (
                          <div key={s} className={`bg-white/5 backdrop-blur-md border-[3px] border-[#10b981]/50 text-white rounded-3xl ${gridStyles.py} text-center font-bold ${gridStyles.text} shadow-[0_0_30px_rgba(16,185,129,0.1)]`}>
                            {formatToAMPM(s)}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-white text-7xl font-black text-center uppercase border-[6px] border-[#10b981] p-24 rounded-[4rem] rotate-[-5deg] bg-black/50 backdrop-blur-md">
                      Fully<br />Booked!
                    </div>
                  )}
                </div>

                <div className="mt-auto text-center mb-16 bg-black/40 backdrop-blur-md border border-white/10 rounded-[3rem] py-12 px-8">
                  <p className="text-white/80 text-4xl font-medium mb-6">Book instantly via Website</p>
                  <p className="text-[#10b981] text-[42px] font-black tracking-widest flex justify-center items-center gap-4">
                    ⚽ www.akolasportsarena.vercel.app
                  </p>
                </div>
              </div>
            </div>
            {/* END CAPTURE */}

          </div>
        </div>
      </div>
    </div>
  );
}
