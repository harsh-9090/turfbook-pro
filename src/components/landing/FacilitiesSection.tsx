import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import cricketImg from "@/assets/cricket-turf.jpg";
import snookerImg from "@/assets/snooker-room.jpg";
import poolImg from "@/assets/pool-room.jpg";

const facilities = [
  {
    title: "Cricket Turf",
    subtitle: "Professional Practice Nets",
    description: "Premium synthetic turf with multiple batting lanes, bowling machines, and professional-grade LED floodlights. Perfect for team practice, coaching sessions, and friendly matches.",
    image: cricketImg,
    features: ["3 Batting Lanes", "Bowling Machine", "LED Floodlights", "Stumps & Gear"],
    cta: "cricket",
  },
  {
    title: "Snooker Lounge",
    subtitle: "Championship Tables",
    description: "Full-size championship snooker tables in a premium, climate-controlled lounge. Enjoy the classic game in a relaxed, upscale atmosphere with comfortable seating.",
    image: snookerImg,
    features: ["Full-Size Tables", "Premium Cues", "Scoreboard", "Lounge Seating"],
    cta: "snooker",
  },
  {
    title: "Pool Tables",
    subtitle: "Modern Billiards Experience",
    description: "High-quality pool tables with professional felt, perfect lighting, and a modern vibe. Great for casual games, competitions, and a fun night out with friends.",
    image: poolImg,
    features: ["Tournament Tables", "Quality Cues", "LED Lighting", "Music System"],
    cta: "pool",
  },
];

export default function FacilitiesSection() {
  return (
    <section id="facilities" className="py-20 lg:py-32 relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-[120px]" />
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-primary font-semibold mb-2 uppercase tracking-wider text-sm">Our Facilities</p>
          <h2 className="font-heading text-3xl lg:text-5xl font-bold mb-4">
            Three Sports, <span className="text-gradient-turf">One Arena</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            From cricket nets to the snooker lounge — everything you need for the perfect sports experience.
          </p>
        </motion.div>

        <div className="space-y-16">
          {facilities.map((facility, i) => (
            <motion.div
              key={facility.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className={`flex flex-col ${i % 2 === 1 ? "lg:flex-row-reverse" : "lg:flex-row"} gap-8 items-center`}
            >
              <div className="flex-1 w-full">
                <div className="overflow-hidden rounded-2xl border border-border">
                  <img
                    src={facility.image}
                    alt={facility.title}
                    loading="lazy"
                    width={800}
                    height={600}
                    className="w-full h-[280px] lg:h-[360px] object-cover hover:scale-105 transition-transform duration-700"
                  />
                </div>
              </div>
              <div className="flex-1 w-full">
                <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-1">{facility.subtitle}</p>
                <h3 className="font-heading text-2xl lg:text-3xl font-bold text-foreground mb-3">{facility.title}</h3>
                <p className="text-muted-foreground leading-relaxed mb-5">{facility.description}</p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {facility.features.map((f) => (
                    <span key={f} className="px-3 py-1.5 text-xs font-medium rounded-full bg-primary/10 text-primary border border-primary/20">
                      {f}
                    </span>
                  ))}
                </div>
                <Link to={`/book?facility=${facility.cta}`}>
                  <Button className="bg-gradient-turf text-primary-foreground font-semibold shadow-turf hover:opacity-90 group">
                    Book {facility.title}
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
