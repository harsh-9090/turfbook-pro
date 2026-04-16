import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import api from "@/lib/api";

interface GalleryImage {
  id: string;
  cloudinary_url: string;
  alt_text: string;
  span_type: string;
}

export default function GallerySection() {
  const [images, setImages] = useState<GalleryImage[]>([]);

  useEffect(() => {
    api.get("/gallery")
      .then(res => setImages(res.data))
      .catch(() => {});
  }, []);

  if (images.length === 0) return null;

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
              key={img.id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className={`overflow-hidden rounded-2xl ${img.span_type === 'large' ? 'md:col-span-2 md:row-span-2' : ''}`}
            >
              <img src={img.cloudinary_url} alt={img.alt_text} loading="lazy"
                className="w-full h-full object-cover min-h-[160px] hover:scale-105 transition-transform duration-500" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
