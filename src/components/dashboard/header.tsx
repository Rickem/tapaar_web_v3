"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useUser } from "@/firebase";
import { User } from "lucide-react";
import Link from "next/link";

interface DashboardHeaderProps {
  username: string;
}

export function DashboardHeader({ username }: DashboardHeaderProps) {
  const { user } = useUser();

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between gap-4 bg-background/80 px-4 backdrop-blur-sm md:px-6 border-b">
      <div className="flex items-center gap-2">
        <Avatar className="h-9 w-9">
          {user?.photoURL && <AvatarImage src={user.photoURL} alt={username} />}
          <AvatarFallback>{username.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="text-xs text-muted-foreground">Bienvenue,</p>
          <p className="text-sm font-semibold">{username}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link href="/profile">
          <Button variant="ghost" size="icon" className="rounded-full">
            <User className="h-5 w-5" />
            <span className="sr-only">Profil</span>
          </Button>
        </Link>
      </div>
    </header>
  );
}
