import Navbar from "@/components/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import InteractiveFacilities from "@/components/landing/InteractiveFacilities";
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
      <InteractiveFacilities />
      <FeaturesSection />
      <PricingSection />
      <GallerySection />
      <TestimonialsSection />
      <FooterSection />
    </div>
  );
};

export default Index;
