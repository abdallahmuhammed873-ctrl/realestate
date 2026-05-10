export function HeroListingsMarquee({ images }: { images: string[] }) {
  const cleaned = images.filter(Boolean);
  if (cleaned.length === 0) return null;

  const loopImages = cleaned.length > 1 ? [...cleaned, cleaned[0]] : cleaned;
  const shouldAnimate = cleaned.length > 1;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
      <div className={shouldAnimate ? "hero-slider-track flex h-full w-full" : "flex h-full w-full"}>
        {loopImages.map((src, idx) => (
          <div key={`${src}-${idx}`} className="hero-slider-slide relative h-full w-full flex-none">
            <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
          </div>
        ))}
      </div>
    </div>
  );
}
