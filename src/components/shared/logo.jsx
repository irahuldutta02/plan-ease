import Image from "next/image";
import { cn } from "@/lib/cn";

/** PlanEase logo mark from /public/logo, optimised by next/image. */
export function Logo({ size = 36, className, priority = false }) {
  return (
    <Image
      src="/logo/logo-mark.png"
      alt="PlanEase"
      width={size}
      height={size}
      priority={priority}
      className={cn("rounded-[22%]", className)}
    />
  );
}
