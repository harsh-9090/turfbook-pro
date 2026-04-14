import { motion } from "framer-motion";
import { Check, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Weekday",
    subtitle: "Mon – Fri (6AM – 5PM)",
    price: "₹800",
    unit: "/hour",
    features: ["Standard lighting", "Changing rooms access", "Free parking", "Drinking water"],
    popular: false,
  },
  {
    name: "Evening & Weekend",
    subtitle: "Mon–Fri (5PM+) & Sat–Sun",
    price: "₹1,200",
    unit: "/hour",
    features: ["LED flood lights", "Changing rooms access", "Free parking", "Drinking water", "Bibs provided", "Priority support"],
    popular: true,
  },
  {
    name: "Tournament",
    subtitle: "Full day / Half day",
    price: "₹8,000",
    unit: "/half day",
    features: ["Full day: ₹15,000", "Dedicated coordinator", "Score tracking", "Referee available", "Refreshments", "Trophy included"],
    popular: false,
  },
];

export default function PricingSection() {
  return (
    <section id="pricing" className="py-20 lg:py-32 relative">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-primary font-semibold mb-2 uppercase tracking-wider text-sm">Pricing</p>
          <h2 className="font-heading text-3xl lg:text-5xl font-bold mb-4">
            Simple, <span className="text-gradient-turf">Transparent</span> Pricing
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">No hidden fees. Book a slot and play.</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative rounded-2xl p-6 lg:p-8 border transition-all duration-300 ${
                plan.popular
                  ? "bg-card border-primary/50 shadow-turf-lg scale-[1.02]"
                  : "bg-card border-border hover:border-primary/20"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 bg-gradient-turf text-primary-foreground text-xs font-bold px-4 py-1 rounded-full">
                    <Zap className="w-3 h-3" /> Most Popular
                  </span>
                </div>
              )}
              <h3 className="font-heading font-semibold text-lg text-foreground">{plan.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">{plan.subtitle}</p>
              <div className="mb-6">
                <span className="font-heading text-4xl font-bold text-foreground">{plan.price}</span>
                <span className="text-muted-foreground text-sm">{plan.unit}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/book">
                <Button
                  className={`w-full font-semibold ${
                    plan.popular
                      ? "bg-gradient-turf text-primary-foreground shadow-turf hover:opacity-90"
                      : "bg-secondary text-secondary-foreground hover:bg-surface-hover"
                  }`}
                >
                  Book Now
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
