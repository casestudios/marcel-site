import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import ProblemStatement from "@/components/ProblemStatement";
import ProductDemo from "@/components/ProductDemo";
import HowItWorks from "@/components/HowItWorks";
import UseCases from "@/components/UseCases";
import Testimonials from "@/components/Testimonials";
import Metrics from "@/components/Metrics";
import Industries from "@/components/Industries";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Nav />
      <Hero />
      <ProblemStatement />
      <ProductDemo />
      <HowItWorks />
      <UseCases />
      <Testimonials />
      <Metrics />
      <Industries />
      <CTA />
      <Footer />
    </>
  );
}
