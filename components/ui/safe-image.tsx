import Image from "next/image"

type SafeImageProps = {
  src: string
  alt: string
  className?: string
}

export function SafeImage({ src, alt, className }: SafeImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={128}
      height={128}
      sizes="128px"
      unoptimized
      className={className}
    />
  )
}
