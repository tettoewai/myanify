import { getImageProxyUrl } from "@/lib/image-proxy";
import { ImgHTMLAttributes } from "react";

interface ImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string  | undefined;
  alt: string;
}

export function Image({ src, ...props }: ImageProps) {
  return <img src={getImageProxyUrl(src)} {...props} />;
}

