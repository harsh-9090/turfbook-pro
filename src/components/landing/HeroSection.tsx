import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Star, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import heroImage from "@/assets/hero-arena.jpg";
import logoImage from "@/assets/logo.png";

const floatingParticles = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  size: Math.random() * 4 + 2,
  x: Math.random() * 100,
  y: Math.random() * 100,
  duration: Math.random() * 8 + 6,
  delay: Math.random() * 5,
}));

export default function HeroSection() {
  const isMobile = useIsMobile();

  return (
    <section className="relative min-h-[100svh] md:min-h-screen flex items-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Akola Sports Arena premium sports facility"
          className="w-full h-full object-cover"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/45 to-background/80 md:from-background/60 md:via-background/40 md:to-background/70" />
      </div>

      {/* Heavy decorative animations — desktop only for performance */}
      {!isMobile && (
        <>
          <motion.div
            className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/40 rounded-full blur-[80px] will-change-transform"
            animate={{ x: [0, 60, 0], y: [0, -40, 0], scale: [1, 1.2, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-1/4 right-0 w-80 h-80 bg-accent/35 rounded-full blur-[70px] will-change-transform"
            animate={{ x: [0, -60, 0], y: [0, 50, 0], scale: [1, 1.3, 1] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/25 rounded-full blur-[100px] will-change-transform"
            animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />

          <div className="absolute inset-0 z-[1] pointer-events-none">
            {floatingParticles.map((p) => (
              <motion.div
                key={p.id}
                className="absolute rounded-full bg-primary/60 will-change-transform"
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

          <div
            className="absolute inset-0 z-[1] opacity-[0.07] pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
              backgroundSize: "60px 60px",
            }}
          />
        </>
      )}

      {/* Mobile: lightweight static glow accents */}
      {isMobile && (
        <>
          <div className="absolute top-1/4 -left-20 w-64 h-64 bg-primary/30 rounded-full blur-[60px] pointer-events-none" />
          <div className="absolute bottom-1/4 -right-16 w-56 h-56 bg-accent/25 rounded-full blur-[60px] pointer-events-none" />
        </>
      )}

      {/* Content */}
      <div className="container mx-auto px-4 lg:px-8 relative z-10 pt-24 pb-16 md:pt-20 md:pb-0">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="mb-4 md:mb-6"
          >
            <img
              src={logoImage}
              alt="Akola Sports Arena logo"
              className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full shadow-turf-lg object-cover mx-auto"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-primary/15 border border-primary/30 mb-4 md:mb-6"
          >
            <Star className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary fill-primary" />
            <span className="text-xs md:text-sm font-semibold tracking-wide text-foreground">
              Cricket • Snooker • Pool
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-heading text-[2.5rem] leading-[1.05] sm:text-5xl lg:text-7xl font-bold tracking-tight mb-5 md:mb-6 hero-text-shadow"
          >
            Your Ultimate
            <br />
            <span className="text-gradient-turf">Sports Arena</span>
          </motion.h1>

          {/* Premium description with accent rules */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center justify-center gap-3 mb-5 md:mb-6 px-4"
          >
            <span className="h-px w-8 sm:w-12 bg-gradient-to-r from-transparent to-primary/60" />
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Play · Compete · Celebrate
            </span>
            <span className="h-px w-8 sm:w-12 bg-gradient-to-l from-transparent to-primary/60" />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="text-[15px] sm:text-lg md:text-xl text-zinc-100/95 max-w-xl mb-7 md:mb-10 mx-auto leading-relaxed font-light px-3"
          >
            Premium cricket turf, pro nets, and an exclusive{" "}
            <span className="font-medium text-foreground">snooker &amp; pool lounge</span>.
            <br className="hidden sm:block" />
            Book in seconds — just show up and play.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-8 md:mb-12 justify-center px-4 sm:px-0"
          >
            <Link to="/book" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-gradient-turf text-primary-foreground font-semibold text-base md:text-lg px-8 shadow-turf hover:opacity-90 transition-opacity group"
              >
                Book a Session
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <a href="#facilities" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto text-base md:text-lg px-8 border-border bg-background/40 hover:bg-secondary"
              >
                View Facilities
              </Button>
            </a>
          </motion.div>

          {/* Stats with divider rules for premium feel */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="grid grid-cols-3 divide-x divide-border/40 max-w-md mx-auto sm:max-w-lg border-y border-border/40 py-4 sm:py-5"
          >
            {[
              { icon: Users, label: "10K+", labelLg: "10,000+", sub: "Sessions" },
              { icon: Star, label: "4.9★", labelLg: "4.9 ★", sub: "Rating" },
              { icon: Clock, label: "6AM–12AM", labelLg: "6AM–12AM", sub: "Open Daily" },
            ].map((stat) => (
              <div
                key={stat.sub}
                className="flex flex-col items-center justify-center gap-1 px-2"
              >
                <p className="font-heading font-bold text-foreground text-sm sm:text-lg md:text-xl">
                  <span className="sm:hidden">{stat.label}</span>
                  <span className="hidden sm:inline">{stat.labelLg}</span>
                </p>
                <p className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground">
                  {stat.sub}
                </p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Smooth transition into next section */}
      <div className="absolute bottom-0 left-0 right-0 h-24 md:h-32 bg-gradient-to-b from-transparent to-background pointer-events-none z-[2]" />
    </section>
  );
}
