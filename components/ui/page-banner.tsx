import Image from "next/image";

export function PageBanner({
  src,
  alt,
  title,
  subtitle,
  contain = false,
  height = "normal",
}: {
  src: string;
  alt: string;
  title: string;
  subtitle?: string;
  contain?: boolean;
  height?: "small" | "normal";
}) {
  return (
    <section className="mb-6 overflow-hidden rounded-[32px] border border-white/10 bg-black/20 shadow-[0_10px_30px_rgba(0,0,0,0.22)]">
      <div
        className={`relative w-full bg-[#071327] ${
          height === "small" ? "h-[170px] md:h-[210px]" : "h-[280px] md:h-[350px]"
        }`}
      >
        <Image
          src={src}
          alt={alt}
          fill
          priority
          className={contain ? "object-contain" : "object-cover object-top"}
        />

        {/* Gradient întunecat jos și stânga pentru lizibilitate text */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#071327]/90 via-[#071327]/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#071327]/60 via-transparent to-transparent" />

        {/* Text centrat vertical și orizontal */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <h2 className="text-3xl font-bold md:text-4xl drop-shadow-lg">{title}</h2>
          {subtitle ? (
            <p className="mt-2 text-white/75 text-sm md:text-base drop-shadow">{subtitle}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
