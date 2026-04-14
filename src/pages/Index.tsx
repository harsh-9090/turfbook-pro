import Navbar from "@/components/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import FacilitiesSection from "@/components/landing/FacilitiesSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import PricingSection from "@/components/landing/PricingSection";
import GallerySection from "@/components/landing/GallerySection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import FooterSection from "@/components/landing/FooterSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <FacilitiesSection />
      <FeaturesSection />
      <PricingSection />
      <GallerySection />
      <TestimonialsSection />
      <FooterSection />
    </div>
  );
};

export default Index;
