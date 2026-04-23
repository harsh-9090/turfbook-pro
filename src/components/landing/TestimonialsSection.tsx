import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, MessageSquare, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import api from "@/lib/api";

interface Testimonial {
  id: string;
  name: string;
  role: string;
  text: string;
  rating: number;
}

export default function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const directionRef = useRef<number>(1);

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);

  useEffect(() => {
    api.get("/testimonials")
      .then(res => setTestimonials(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Ping-pong auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || testimonials.length === 0 || isPaused) return;

    const speed = 0.5; // pixels per frame
    let animId: number;

    const scroll = () => {
      if (!el) return;
      el.scrollLeft += speed * directionRef.current;

      // Reverse direction if we hit the right or left edge
      if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 1) {
        directionRef.current = -1;
      } else if (el.scrollLeft <= 0) {
        directionRef.current = 1;
      }

      animId = requestAnimationFrame(scroll);
    };

    animId = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(animId);
  }, [testimonials, isPaused]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !text) return toast.error("Please fill in your name and review");

    setIsSubmitting(true);
    try {
      await api.post("/testimonials", { name, role, text, rating });
      setIsSuccess(true);
      setTimeout(() => {
        setIsModalOpen(false);
        setIsSuccess(false);
        setName(""); setRole(""); setText(""); setRating(5);
      }, 3000);
    } catch {
      toast.error("Failed to submit review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // No duplicate items needed anymore
  const displayItems = testimonials;

  return (
    <section className="py-20 lg:py-32 relative bg-card/50 overflow-hidden">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-primary font-semibold mb-2 uppercase tracking-wider text-sm">Testimonials</p>
          <h2 className="font-heading text-3xl lg:text-5xl font-bold mb-4">
            What Players <span className="text-gradient-turf">Say</span>
          </h2>
          <Button 
            onClick={() => setIsModalOpen(true)}
            variant="outline" 
            className="mt-4 border-primary/20 hover:bg-primary/5 text-primary"
          >
            <MessageSquare className="w-4 h-4 mr-2" /> Write a Review
          </Button>
        </motion.div>
      </div>

      {/* Horizontal auto-scrolling marquee with ping-pong effect */}
      <div
        ref={scrollRef}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
        className="flex gap-6 overflow-x-auto px-4 pb-2 snap-x touch-pan-x mx-auto w-max max-w-full"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {displayItems.map((t, i) => (
          <div key={`${t.id}-${i}`}
            className="snap-center flex-shrink-0 w-[320px] p-6 rounded-2xl bg-card border border-border hover:border-primary/20 transition-all">
            <div className="flex gap-1 mb-4">
              {Array.from({ length: 5 }).map((_, j) => (
                <Star key={j} className={`w-4 h-4 ${j < t.rating ? "text-accent fill-accent" : "text-muted-foreground"}`} />
              ))}
            </div>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed line-clamp-4">"{t.text}"</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-turf flex items-center justify-center text-primary-foreground font-bold text-sm">
                {t.name[0]}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.role || "Player"}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Submission Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <AnimatePresence mode="wait">
            {isSuccess ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="py-12 flex flex-col items-center text-center space-y-4"
              >
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Review Submitted!</h3>
                  <p className="text-muted-foreground mt-2">Thank you! Your feedback will be visible once approved.</p>
                </div>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <DialogHeader>
                  <DialogTitle>Share Your Experience</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                  <div className="flex justify-center mb-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button key={s} type="button" onClick={() => setRating(s)} className="p-1">
                          <Star className={`w-6 h-6 transition-colors ${s <= rating ? "text-accent fill-accent" : "text-muted-foreground/30"}`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Your Name *</Label>
                      <Input value={name} onChange={e => setName(e.target.value)} placeholder="Rahul" required />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Sport / Role</Label>
                      <Input value={role} onChange={e => setRole(e.target.value)} placeholder="Cricket" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Your Review *</Label>
                    <textarea 
                      value={text} 
                      onChange={e => setText(e.target.value)} 
                      placeholder="Tell us about the turf quality, lighting, or staff..."
                      className="w-full min-h-[100px] bg-background border border-input rounded-md px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      required
                    />
                  </div>

                  <DialogFooter className="pt-2">
                    <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting} className="bg-gradient-turf text-primary-foreground shadow-turf">
                      {isSubmitting ? "Submitting..." : "Submit Review"}
                    </Button>
                  </DialogFooter>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </section>
  );
}
