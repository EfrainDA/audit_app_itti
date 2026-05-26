import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type RealisticIconTone =
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "neutral"
  | "cyan"
  | "blue"
  | "emerald"

type RealisticIconSize = "sm" | "md" | "lg" | "xl"

const toneClasses: Record<RealisticIconTone, string> = {
  primary: "flat-icon--primary",
  success: "flat-icon--success",
  warning: "flat-icon--warning",
  danger: "flat-icon--danger",
  neutral: "flat-icon--neutral",
  cyan: "flat-icon--cyan",
  blue: "flat-icon--blue",
  emerald: "flat-icon--emerald",
}

const sizeClasses: Record<RealisticIconSize, string> = {
  sm: "h-9 w-9 rounded-md",
  md: "h-11 w-11 rounded-md",
  lg: "h-12 w-12 rounded-md",
  xl: "h-16 w-16 rounded-lg",
}

const iconSizeClasses: Record<RealisticIconSize, string> = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
  xl: "h-8 w-8",
}

type RealisticIconProps = {
  icon: LucideIcon
  tone?: RealisticIconTone
  size?: RealisticIconSize
  className?: string
  iconClassName?: string
}

export function RealisticIcon({
  icon: Icon,
  tone = "primary",
  size = "md",
  className,
  iconClassName,
}: RealisticIconProps) {
  return (
    <span className={cn("flat-icon", toneClasses[tone], sizeClasses[size], className)} aria-hidden="true">
      <Icon className={cn(iconSizeClasses[size], iconClassName)} strokeWidth={1.85} />
    </span>
  )
}
