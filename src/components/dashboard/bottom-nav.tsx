"use client";

import { cn } from "@/lib/utils";
import { Home, Repeat, Users, ClipboardList, Store } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/community", icon: Users, label: "Communauté" },
  { href: "/transactions", icon: Repeat, label: "Transactions" },
  { href: "/dashboard", icon: Home, label: "Accueil" },
  { href: "/tasks", icon: ClipboardList, label: "Tâches" },
  { href: "/market", icon: Store, label: "Market" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 h-20 bg-card/95 backdrop-blur-sm border-t rounded-t-3xl shadow-[0_-5px_15px_-3px_rgba(0,0,0,0.05)]">
      <nav className="flex h-full items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              href={item.href}
              key={item.label}
              className={cn(
                "flex flex-col items-center justify-center transition-colors p-2 rounded-full w-14 h-14",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-primary hover:bg-primary/5"
              )}
            >
              <item.icon className="h-7 w-7" />
              <span className="sr-only">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
