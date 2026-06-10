import Image from "next/image";

export function PageBanner({
  src,
  alt,
  title,
  subtitle,
}: {
  src: string;
  alt: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <section className="mb-6 overflow-hidden rounded-[32px] border border-white/10 bg-black/20 shadow-[0_10px_30px_rgba(0,0,0,0.22)]">
      <div className="relative aspect-[16/5] min-h-[180px] w-full md:min-h-[240px]">
        <Image src={src} alt={alt} fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-[#071327]/88 via-[#071327]/58 to-[#071327]/28" />
        <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
          <h2 className="text-3xl font-bold md:text-4xl">{title}</h2>
          {subtitle ? <p className="mt-2 text-white/80">{subtitle}</p> : null}
        </div>
      </div>
    </section>
  );
}