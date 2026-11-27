import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/siyanie-round.webp"
      alt=""
      width={360}
      height={360}
      sizes="56px"
      className={cn("h-12 w-12 shrink-0 object-contain", className)}
    />
  );
}
