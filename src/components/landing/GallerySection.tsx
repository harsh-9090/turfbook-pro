import { motion } from "framer-motion";
import cricketImg from "@/assets/cricket-turf.jpg";
import snookerImg from "@/assets/snooker-room.jpg";
import poolImg from "@/assets/pool-room.jpg";
import heroImg from "@/assets/hero-arena.jpg";
import gallery1 from "@/assets/turf-gallery-1.jpg";
import gallery2 from "@/assets/turf-gallery-2.jpg";

const images = [
  { src: heroImg, alt: "Akola Sports Arena cricket nets aerial view", span: "md:col-span-2 md:row-span-2" },
  { src: cricketImg, alt: "Professional cricket practice nets", span: "" },
  { src: snookerImg, alt: "Premium snooker lounge", span: "" },
  { src: poolImg, alt: "Modern pool tables", span: "" },
  { src: gallery1, alt: "Evening game at the arena", span: "" },
];

export default function GallerySection() {
  return (
    <section id="gallery" className="py-20 lg:py-32 relative">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-primary font-semibold mb-2 uppercase tracking-wider text-sm">Gallery</p>
          <h2 className="font-heading text-3xl lg:text-5xl font-bold mb-4">
            Inside <span className="text-gradient-turf">Akola Sports Arena</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-5xl mx-auto">
          {images.map((img, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className={`overflow-hidden rounded-2xl ${img.span}`}
            >
              <img src={img.src} alt={img.alt} loading="lazy"
                className="w-full h-full object-cover min-h-[160px] hover:scale-105 transition-transform duration-500" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
