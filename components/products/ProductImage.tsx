"use client";

import { useState } from "react";
import Image from "next/image";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProductImage({ src, name, className }: {
  src: string | null;
  name: string;
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  return (
    <div className={cn("relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/50 bg-white", className)}>
      {src && failedSrc !== src ? (
        <Image
          src={src}
          alt={name}
          fill
          unoptimized
          sizes="(max-width: 640px) 100vw, 360px"
          className="object-contain p-3"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <div className="flex flex-col items-center gap-2 text-muted-foreground" role="img" aria-label={`Image unavailable for ${name}`}>
          <Package className="h-10 w-10" />
          <span className="text-[10px]">Image unavailable</span>
        </div>
      )}
    </div>
  );
}
