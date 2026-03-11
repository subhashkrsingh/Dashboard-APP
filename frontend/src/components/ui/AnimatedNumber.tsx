import { animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface AnimatedNumberProps {
  value: number | null | undefined;
  format: (value: number) => string;
  placeholder?: string;
  className?: string;
}

export function AnimatedNumber({
  value,
  format,
  placeholder = "--",
  className
}: AnimatedNumberProps) {
  const initialValue = Number.isFinite(value) ? Number(value) : null;
  const [displayValue, setDisplayValue] = useState<number | null>(initialValue);
  const previousValueRef = useRef<number | null>(initialValue);

  useEffect(() => {
    const nextValue = Number.isFinite(value) ? Number(value) : null;

    if (nextValue === null) {
      previousValueRef.current = null;
      setDisplayValue(null);
      return;
    }

    const startValue = Number.isFinite(previousValueRef.current)
      ? Number(previousValueRef.current)
      : nextValue;

    const controls = animate(startValue, nextValue, {
      duration: 0.55,
      ease: "easeOut",
      onUpdate: latest => setDisplayValue(latest)
    });

    previousValueRef.current = nextValue;
    return () => controls.stop();
  }, [value]);

  return (
    <span className={className}>
      {Number.isFinite(displayValue) ? format(Number(displayValue)) : placeholder}
    </span>
  );
}
