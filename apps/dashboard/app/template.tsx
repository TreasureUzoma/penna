"use client";

import dynamic from "next/dynamic";
import { ReactNode } from "react";

const Analytics = dynamic(() => import("supametrics"), {
  ssr: false,
});

export default function Template({ children }: { children: ReactNode }) {
  return (
    <div>
      {children}
      <Analytics
        url="https://supametrics-go-server.onrender.com"
        client="supm_3451b50e5446a3f7d00c964a00ded61d"
      />
    </div>
  );
}
