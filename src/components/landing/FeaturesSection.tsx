import { motion } from "framer-motion";
import { Lightbulb, Car, Droplets, Shield, Wifi, Shirt } from "lucide-react";

const features = [
  { icon: Lightbulb, title: "LED Flood Lights", desc: "Professional-grade lighting for night games with zero dark spots." },
  { icon: Car, title: "Free Parking", desc: "Spacious parking area for 30+ vehicles right next to the turf." },
  { icon: Droplets, title: "Premium Turf", desc: "FIFA-quality synthetic grass with shock-absorbing underpad." },
  { icon: Shield, title: "Safety Nets", desc: "Full perimeter netting to keep the ball in and players safe." },
  { icon: Wifi, title: "Free Wi-Fi", desc: "High-speed connectivity throughout the facility." },
  { icon: Shirt, title: "Changing Rooms", desc: "Clean, modern changing rooms with lockers and showers." },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="py-20 lg:py-32 relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-[120px]" />
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-primary font-semibold mb-2 uppercase tracking-wider text-sm">Why Choose Us</p>
          <h2 className="font-heading text-3xl lg:text-5xl font-bold mb-4">
            World-Class <span className="text-gradient-turf">Facilities</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">Everything you need for the perfect game, all in one place.</p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all duration-300 hover:shadow-turf"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-gradient-turf transition-colors duration-300">
                <feature.icon className="w-6 h-6 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
              </div>
              <h3 className="font-heading font-semibold text-lg mb-2 text-foreground">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
