import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, MessageSquare, X, Upload, CheckCircle2, Image as LucideImage } from "lucide-react";
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
  image_urls: string[];
}

export default function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get("/testimonials").then(res => setTestimonials(res.data)).catch(() => {});
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedFiles.length > 5) {
      return toast.error("Maximum 5 images allowed");
    }
    
    const newFiles = [...selectedFiles, ...files];
    setSelectedFiles(newFiles);
    
    const newPreviews = files.map(f => URL.createObjectURL(f));
    setPreviewUrls([...previewUrls, ...newPreviews]);
  };

  const removeFile = (index: number) => {
    const newFiles = [...selectedFiles];
    newFiles.splice(index, 1);
    setSelectedFiles(newFiles);

    const newPreviews = [...previewUrls];
    newPreviews.splice(index, 1);
    setPreviewUrls(newPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !text) return toast.error("Please fill in your name and review");

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("name", name);
    formData.append("role", role);
    formData.append("text", text);
    formData.append("rating", String(rating));
    selectedFiles.forEach(file => {
      formData.append("images", file);
    });

    try {
      await api.post("/testimonials", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setIsSuccess(true);
      setTimeout(() => {
        setIsModalOpen(false);
        setIsSuccess(false);
        setName(""); setRole(""); setText(""); setRating(5); setSelectedFiles([]); setPreviewUrls([]);
      }, 3000);
    } catch {
      toast.error("Failed to submit review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

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

        <div className={`grid gap-6 max-w-6xl mx-auto ${
          testimonials.length === 1 ? "md:grid-cols-1 max-w-md" : 
          testimonials.length === 2 ? "md:grid-cols-2 max-w-3xl" : 
          "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3"
        }`}>
          {testimonials.map((t, i) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="p-6 rounded-2xl bg-card border border-border hover:border-primary/20 transition-all flex flex-col h-full">
              <div className="flex gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} className={`w-4 h-4 ${j < t.rating ? "text-accent fill-accent" : "text-muted-foreground"}`} />
                ))}
              </div>
              
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed flex-grow">"{t.text}"</p>

              {/* Arena Photos Gallery */}
              {t.image_urls && t.image_urls.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {t.image_urls.map((url, idx) => (
                    <div key={idx} className="w-14 h-14 rounded-lg overflow-hidden border border-border">
                      <img src={url} className="w-full h-full object-cover hover:scale-110 transition-transform duration-300" alt="Arena" />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-3 pt-4 border-t border-border/50">
                <div className="w-10 h-10 rounded-full bg-gradient-turf flex items-center justify-center text-primary-foreground font-bold text-sm">
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role || "Player"}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Submission Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
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
                  <p className="text-muted-foreground mt-2">Thank you! Your feedback helps us improve. It will be visible once approved.</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <DialogHeader>
                  <DialogTitle>Share Your Sports Experience</DialogTitle>
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
                      <Label>Sport (e.g. Cricket)</Label>
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

                  <div className="space-y-3">
                    <Label>Arena Photos (Optional, Max 5)</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {previewUrls.map((url, i) => (
                        <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                          <img src={url} className="w-full h-full object-cover" />
                          <button 
                            type="button" 
                            onClick={() => removeFile(i)}
                            className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {previewUrls.length < 5 && (
                        <button 
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="aspect-square rounded-lg border border-dashed border-border flex flex-col items-center justify-center hover:border-primary/50 transition-colors bg-muted/30"
                        >
                          <Upload className="w-5 h-5 text-muted-foreground mb-1" />
                          <span className="text-[10px] text-muted-foreground">Add Photo</span>
                        </button>
                      )}
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileChange} />
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
