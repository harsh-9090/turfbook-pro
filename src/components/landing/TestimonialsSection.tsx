import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  { name: "Rahul Sharma", role: "Cricket Enthusiast", text: "The batting nets are top-notch! Perfect pitch, great lighting, and the bowling machine is a game-changer. We book every weekend.", rating: 5 },
  { name: "Priya Patel", role: "Snooker Regular", text: "Best snooker tables in the city. The lounge atmosphere is premium and the staff is super friendly. Love hanging out here.", rating: 5 },
  { name: "Amit Kumar", role: "Pool Player", text: "Clean tables, good cues, and the vibe is amazing. The online booking makes it so easy — no more waiting!", rating: 5 },
  { name: "Sneha Reddy", role: "Team Captain", text: "We hosted our corporate cricket tournament here. The facilities are professional and the management was very supportive.", rating: 4 },
];

export default function TestimonialsSection() {
  return (
    <section className="py-20 lg:py-32 relative bg-card/50">
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
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {testimonials.map((t, i) => (
            <motion.div key={t.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="p-6 rounded-2xl bg-card border border-border">
              <div className="flex gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} className={`w-4 h-4 ${j < t.rating ? "text-accent fill-accent" : "text-muted-foreground"}`} />
                ))}
              </div>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-turf flex items-center justify-center text-primary-foreground font-bold text-sm">{t.name[0]}</div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
