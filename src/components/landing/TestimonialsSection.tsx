import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  { name: "Rahul Sharma", role: "Regular Player", text: "Best turf in the city! The surface quality is amazing and the booking process is so smooth. We play here every weekend.", rating: 5 },
  { name: "Priya Patel", role: "Team Captain", text: "We hosted our corporate tournament here and it was fantastic. The facilities are top-notch and the staff is very helpful.", rating: 5 },
  { name: "Amit Kumar", role: "Football Enthusiast", text: "Love the LED lights for night games. The turf quality is consistent and the pricing is very fair. Highly recommended!", rating: 5 },
  { name: "Sneha Reddy", role: "Weekend Player", text: "The online booking system is a game-changer. No more calling and waiting. Just pick a slot and pay online!", rating: 4 },
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
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-6 rounded-2xl bg-card border border-border"
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} className={`w-4 h-4 ${j < t.rating ? "text-accent fill-accent" : "text-muted-foreground"}`} />
                ))}
              </div>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-turf flex items-center justify-center text-primary-foreground font-bold text-sm">
                  {t.name[0]}
                </div>
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
