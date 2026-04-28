"use client";

const logos = [
  "FANUC",
  "Haas",
  "Mazak",
  "DMG Mori",
  "Okuma",
  "Robodrill",
  "FANUC",
  "Haas",
  "Mazak",
  "DMG Mori",
  "Okuma",
  "Robodrill",
];

export default function LogoCarousel() {
  return (
    <div className="w-full">
      <p className="text-center text-xs uppercase tracking-[0.2em] text-text-secondary mb-6">
        Trusted in shops running
      </p>
      <div className="carousel-mask overflow-hidden">
        <div className="flex animate-scroll-left w-max">
          {logos.map((logo, i) => (
            <div
              key={i}
              className="flex-shrink-0 px-8 md:px-12 flex items-center justify-center"
            >
              <span className="text-text-secondary/40 font-semibold text-lg md:text-xl tracking-wider uppercase whitespace-nowrap">
                {logo}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
