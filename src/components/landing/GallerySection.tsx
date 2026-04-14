import { motion } from "framer-motion";
import gallery1 from "@/assets/turf-gallery-1.jpg";
import gallery2 from "@/assets/turf-gallery-2.jpg";
import gallery3 from "@/assets/turf-gallery-3.jpg";
import heroImg from "@/assets/hero-turf.jpg";

const images = [
  { src: heroImg, alt: "Aerial view of the turf", span: "md:col-span-2 md:row-span-2" },
  { src: gallery1, alt: "Evening game at the turf", span: "" },
  { src: gallery2, alt: "Premium turf surface quality", span: "" },
  { src: gallery3, alt: "Modern changing facilities", span: "md:col-span-2" },
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
            See Our <span className="text-gradient-turf">Arena</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {images.map((img, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`overflow-hidden rounded-2xl ${img.span}`}
            >
              <img
                src={img.src}
                alt={img.alt}
                loading="lazy"
                className="w-full h-full object-cover min-h-[200px] hover:scale-105 transition-transform duration-500"
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
