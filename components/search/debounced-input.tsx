"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

export function DebouncedInput({
  initialValue,
  delay = 400,
  placeholder,
  onDebouncedChange
}: {
  initialValue: string;
  delay?: number;
  placeholder?: string;
  onDebouncedChange: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const [changedByUser, setChangedByUser] = useState(false);

  useEffect(() => {
    setValue(initialValue);
    setChangedByUser(false);
  }, [initialValue]);

  useEffect(() => {
    if (!changedByUser) return;
    const timer = setTimeout(() => onDebouncedChange(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay, onDebouncedChange, changedByUser]);

  return (
    <Input
      value={value}
      placeholder={placeholder}
      onChange={(e) => {
        setChangedByUser(true);
        setValue(e.target.value);
      }}
    />
  );
}
