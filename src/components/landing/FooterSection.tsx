import { Link } from "react-router-dom";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import logoImage from "@/assets/logo.png";

export default function FooterSection() {
  return (
    <footer id="contact" className="py-16 border-t border-border">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-turf flex items-center justify-center">
                <span className="font-heading font-bold text-primary-foreground text-lg">S</span>
              </div>
              <span className="font-heading font-bold text-xl text-foreground">
                Akola Sports <span className="text-gradient-turf">Arena</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Premium sports arena with cricket turf, snooker & pool. Book online, show up, and play.
            </p>
          </div>

          <div className="col-span-1">
            <h4 className="font-heading font-semibold text-foreground mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {[
                { name: "Home", path: "/" },
                { name: "Book Now", path: "/book" },
                { name: "Facilities", path: "/#facilities" },
                { name: "Pricing", path: "/#pricing" },
              ].map((link) => (
                <li key={link.name}>
                  <Link to={link.path} className="text-sm text-muted-foreground hover:text-primary transition-colors">{link.name}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-1">
            <h4 className="font-heading font-semibold text-foreground mb-4">Our Sports</h4>
            <ul className="space-y-2">
              {["Cricket Nets", "Snooker Tables", "Pool Tables", "Tournaments"].map((s) => (
                <li key={s} className="text-sm text-muted-foreground">{s}</li>
              ))}
            </ul>
          </div>

          <div className="col-span-2 lg:col-span-1">
            <h4 className="font-heading font-semibold text-foreground mb-4">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                123 Sports Complex, Green Park, Mumbai 400001
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                +91 98765 43210
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4 text-primary flex-shrink-0" />
                hello@akolasportsarena.com
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4 text-primary flex-shrink-0" />
                Mon–Sun: 6:00 AM – 12:00 AM
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-8 text-center">
          <p className="text-sm text-muted-foreground">© 2026 Akola Sports Arena. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
