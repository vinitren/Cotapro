const LOGO_ICONE_SRC = '/brand/Cota%20pro%20logo%20preta%20png.png';

export function WatermarkBrand() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center"
      aria-hidden
    >
      <img
        src={LOGO_ICONE_SRC}
        alt=""
        className="w-[260px] md:w-[420px] max-w-[70vw] opacity-[0.04] md:opacity-[0.06] object-contain"
      />
    </div>
  );
}
