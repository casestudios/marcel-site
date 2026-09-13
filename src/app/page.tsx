import BlueprintFrame from "@/components/BlueprintFrame";
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Problem from "@/components/Problem";
import Insight from "@/components/Insight";
import HowItWorks from "@/components/HowItWorks";
import Demo from "@/components/Demo";
import SystemArchitecture from "@/components/SystemArchitecture";
import Audience from "@/components/Audience";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import RevealController from "@/components/RevealController";

export default function Home() {
  return (
    <>
      <BlueprintFrame />
      <Nav />
      <main id="main">
        <Hero />
        <Problem />
        <Insight />
        <Demo />
        <HowItWorks />
        <SystemArchitecture />
        <Audience />
        <Contact />
      </main>
      <Footer />
      <RevealController />
    </>
  );
}
