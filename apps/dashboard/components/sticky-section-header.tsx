"use client";

import Link from "next/link";
import React from "react";

interface StickySectionHeaderProps {
  left?: React.ReactNode;
  title?: React.ReactNode;
  right?: React.ReactNode;
}

export function StickySectionHeader({ left, title, right }: StickySectionHeaderProps) {
  return (
    <div className="sticky top-0 z-10 shrink-0 bg-background border-b border-border px-6 py-2 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
      <div className="min-w-0">{left}</div>
      <h1 className="md:text-md font-semibold tracking-tight text-center truncate">{title}</h1>
      <div className="justify-self-end">{right}</div>
    </div>
  );
}

export default StickySectionHeader;
