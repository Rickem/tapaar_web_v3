import React from "react";
import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="absolute top-8 left-8 flex items-center gap-2 text-foreground">
        <Image
          src="/logo-flat.png"
          alt="Logo"
          width={190}
          height={80}
          className="h-16 w-auto object-contain"
        />
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
