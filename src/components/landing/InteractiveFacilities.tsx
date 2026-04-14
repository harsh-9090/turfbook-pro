import { Suspense, lazy, useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const PoolScene = lazy(() => import("@/components/3d/PoolScene"));
const SnookerScene = lazy(() => import("@/components/3d/SnookerScene"));
const CricketScene = lazy(() => import("@/components/3d/CricketScene"));

const SceneLoader = () => (
  <div className="w-full h-[400px] lg:h-[500px] rounded-2xl bg-card/50 border border-border flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
      <p className="text-muted-foreground text-sm">Loading 3D Scene...</p>
    </div>
  </div>
);

const facilities = [
  {
    id: "pool",
    title: "Pool Tables",
    subtitle: "Modern Billiards Experience",
    description:
      "Watch the break shot unfold in real-time 3D. High-quality pool tables with professional felt, perfect lighting, and a modern vibe.",
    features: ["Tournament Tables", "Quality Cues", "LED Lighting", "Music System"],
    Scene: PoolScene,
    cta: "pool",
  },
  {
    id: "snooker",
    title: "Snooker Lounge",
    subtitle: "Championship Tables",
    description:
      "Experience the elegance of a perfect pot. Full-size championship snooker tables in a premium, climate-controlled lounge.",
    features: ["Full-Size Tables", "Premium Cues", "Scoreboard", "Lounge Seating"],
    Scene: SnookerScene,
    cta: "snooker",
  },
  {
    id: "cricket",
    title: "Cricket Turf",
    subtitle: "Professional Practice Nets",
    description:
      "Feel the power of a perfect shot. Premium synthetic turf with multiple batting lanes, bowling machines, and professional floodlights.",
    features: ["3 Batting Lanes", "Bowling Machine", "LED Floodlights", "Stumps & Gear"],
    Scene: CricketScene,
    cta: "cricket",
  },
];

function ParallaxSection({
  children,
  index,
}: {
  children: React.ReactNode;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [60, -60]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

  return (
    <motion.div ref={ref} style={{ y, opacity }}>
      {children}
    </motion.div>
  );
}

// Check for mobile/low-perf devices
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

export default function InteractiveFacilities() {
  const isMobile = useIsMobile();

  return (
    <section id="facilities" className="py-20 lg:py-32 relative overflow-hidden">
      {/* Ambient background effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 -right-20 w-[300px] h-[300px] bg-accent/5 rounded-full blur-[100px]" />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-primary font-semibold mb-2 uppercase tracking-wider text-sm">
            Interactive Experience
          </p>
          <h2 className="font-heading text-3xl lg:text-5xl font-bold mb-4">
            Three Sports, <span className="text-gradient-turf">One Arena</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Explore our facilities through immersive 3D animations. Each sport brought to life with realistic physics and stunning visuals.
          </p>
        </motion.div>

        <div className="space-y-24 lg:space-y-32">
          {facilities.map((facility, i) => (
            <ParallaxSection key={facility.id} index={i}>
              <div
                className={`flex flex-col ${
                  i % 2 === 1 ? "lg:flex-row-reverse" : "lg:flex-row"
                } gap-8 lg:gap-12 items-center`}
              >
                {/* 3D Scene */}
                <div className="flex-1 w-full">
                  {!isMobile ? (
                    <Suspense fallback={<SceneLoader />}>
                      <facility.Scene />
                    </Suspense>
                  ) : (
                    <SceneLoader />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 w-full">
                  <motion.div
                    initial={{ opacity: 0, x: i % 2 === 1 ? -30 : 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                  >
                    <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-1">
                      {facility.subtitle}
                    </p>
                    <h3 className="font-heading text-2xl lg:text-4xl font-bold text-foreground mb-4">
                      {facility.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed mb-6 text-lg">
                      {facility.description}
                    </p>
                    <div className="flex flex-wrap gap-2 mb-8">
                      {facility.features.map((f) => (
                        <span
                          key={f}
                          className="px-4 py-2 text-xs font-medium rounded-full bg-primary/10 text-primary border border-primary/20"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                    <Link to={`/book?facility=${facility.cta}`}>
                      <Button className="bg-gradient-turf text-primary-foreground font-semibold shadow-turf hover:opacity-90 group text-base px-6 py-3">
                        Book {facility.title}
                        <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </motion.div>
                </div>
              </div>
            </ParallaxSection>
          ))}
        </div>
      </div>
    </section>
  );
}
