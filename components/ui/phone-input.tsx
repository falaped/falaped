"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { formatBrazilianPhone } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export interface PhoneInputProps
  extends Omit<React.ComponentProps<typeof Input>, "onChange" | "value"> {
  value?: string;
  onChange?: (value: string) => void;
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value = "", onChange, ...props }, ref) => {
    const formatted = formatBrazilianPhone(value);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const digits = e.target.value.replace(/\D/g, "");
      const formattedValue = formatBrazilianPhone(digits);
      onChange?.(formattedValue);
    };

    return (
      <Input
        ref={ref}
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        placeholder="(00) 00000-0000"
        value={formatted}
        onChange={handleChange}
        maxLength={16}
        className={cn(className)}
        {...props}
      />
    );
  }
);
PhoneInput.displayName = "PhoneInput";

export { PhoneInput };
