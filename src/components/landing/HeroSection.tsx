import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Star, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-arena.jpg";
import logoImage from "@/assets/logo.png";

const floatingParticles = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  size: Math.random() * 4 + 2,
  x: Math.random() * 100,
  y: Math.random() * 100,
  duration: Math.random() * 8 + 6,
  delay: Math.random() * 5,
}));

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img src={heroImage} alt="Akola Sports Arena premium sports facility" className="w-full h-full object-cover" width={1920} height={1080} />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background/70" />
        <div className="absolute inset-0 bg-background/20" />
      </div>

      {/* Animated Glowing Orbs */}
      <motion.div
        className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/40 rounded-full blur-[80px]"
        animate={{ x: [0, 60, 0], y: [0, -40, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-1/4 right-0 w-80 h-80 bg-accent/35 rounded-full blur-[70px]"
        animate={{ x: [0, -60, 0], y: [0, 50, 0], scale: [1, 1.3, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/25 rounded-full blur-[100px]"
        animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />

      {/* Floating Particles */}
      <div className="absolute inset-0 z-[1] pointer-events-none">
        {floatingParticles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full bg-primary/60"
            style={{ width: p.size * 1.5, height: p.size * 1.5, left: `${p.x}%`, top: `${p.y}%` }}
            animate={{
              y: [0, -80, 0],
              x: [0, Math.random() > 0.5 ? 30 : -30, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: p.delay,
            }}
          />
        ))}
      </div>

      {/* Subtle Grid Overlay */}
      <div
        className="absolute inset-0 z-[1] opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Content */}
      <div className="container mx-auto px-4 lg:px-8 relative z-10 pt-20">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7 }}
            className="mb-6"
          >
            <motion.img
              src={logoImage}
              alt="Akola Sports Arena logo"
              className="w-24 h-24 sm:w-32 sm:h-32 rounded-full shadow-turf-lg object-cover mx-auto"
              animate={{ boxShadow: ["0 0 20px hsl(var(--primary) / 0.2)", "0 0 40px hsl(var(--primary) / 0.4)", "0 0 20px hsl(var(--primary) / 0.2)"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-turf/20 border border-primary/30 mb-6 backdrop-blur-sm"
          >
            <Star className="w-4 h-4 text-primary fill-primary" />
            <span className="text-sm font-semibold text-foreground">Cricket • Snooker • Pool — All Under One Roof</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-heading text-4xl sm:text-5xl lg:text-7xl font-bold leading-tight mb-6"
          >
            Your Ultimate
            <br />
            <span className="text-gradient-turf">Sports Arena</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl text-zinc-200 max-w-xl mb-8 mx-auto leading-relaxed"
          >
            Premium cricket turf with professional nets, plus exclusive snooker & pool lounge. Book your session in seconds and just show up to play.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 mb-12 justify-center"
          >
            <Link to="/book">
              <Button size="lg" className="bg-gradient-turf text-primary-foreground font-semibold text-lg px-8 shadow-turf hover:opacity-90 transition-opacity group">
                Book a Session
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <a href="#facilities">
              <Button size="lg" variant="outline" className="text-lg px-8 border-border hover:bg-secondary">
                View Facilities
              </Button>
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-wrap gap-8 justify-center"
          >
            {[
              { icon: Users, label: "10,000+", sub: "Sessions Played" },
              { icon: Star, label: "4.9", sub: "Rating" },
              { icon: Clock, label: "6AM–12AM", sub: "Open Daily" },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-heading font-bold text-foreground">{stat.label}</p>
                  <p className="text-sm text-muted-foreground">{stat.sub}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
