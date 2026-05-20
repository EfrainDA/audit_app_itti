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
  primary: "realistic-icon--primary",
  success: "realistic-icon--success",
  warning: "realistic-icon--warning",
  danger: "realistic-icon--danger",
  neutral: "realistic-icon--neutral",
  cyan: "realistic-icon--cyan",
  blue: "realistic-icon--blue",
  emerald: "realistic-icon--emerald",
}

const sizeClasses: Record<RealisticIconSize, string> = {
  sm: "h-9 w-9 rounded-lg",
  md: "h-11 w-11 rounded-xl",
  lg: "h-12 w-12 rounded-xl",
  xl: "h-16 w-16 rounded-2xl",
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
    <span className={cn("realistic-icon", toneClasses[tone], sizeClasses[size], className)} aria-hidden="true">
      <Icon className={cn("relative z-10", iconSizeClasses[size], iconClassName)} strokeWidth={1.75} />
    </span>
  )
}
