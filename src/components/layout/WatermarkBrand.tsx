const LOGO_BLACK = '/brand/cotapro-logo-dark.svg';
const LOGO_WHITE = '/brand/cotapro-logo-light.svg';

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
