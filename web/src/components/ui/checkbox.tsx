"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  onCheckedChange?: (checked: boolean) => void;
  checked?: boolean;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
    return (
      <div className="relative flex items-center justify-center w-5 h-5">
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          className={cn(
            "peer h-5 w-5 shrink-0 appearance-none rounded-md border-2 border-slate-200 bg-white ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 checked:bg-primary checked:border-primary transition-all cursor-pointer",
            className
          )}
          {...props}
        />
        <Check className="pointer-events-none absolute hidden h-3.5 w-3.5 text-white peer-checked:block transition-all" strokeWidth={3} />
      </div>
    )
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
