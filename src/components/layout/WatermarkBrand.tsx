const LOGO_BLACK = '/brand/Cota%20pro%20logo%20preta%20png.png';
const LOGO_WHITE = '/brand/Cota%20pro%20logo%20branca%20png.png';

export function WatermarkBrand() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center"
      aria-hidden
    >
      <img
        src={LOGO_BLACK}
        alt=""
        className="w-[260px] md:w-[420px] max-w-[70vw] opacity-10 object-contain dark:hidden"
      />
      <img
        src={LOGO_WHITE}
        alt=""
        className="w-[260px] md:w-[420px] max-w-[70vw] opacity-10 object-contain hidden dark:block"
      />
    </div>
  );
}
