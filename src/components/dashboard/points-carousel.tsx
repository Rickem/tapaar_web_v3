"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { ArrowRight, Award, Gift, UserPlus } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const carouselItems = [
  {
    title: "Passez au niveau supérieur",
    description: "Débloquez plus d'avantages en améliorant votre compte.",
    icon: Award,
    href: "/community",
    bgColor: "bg-purple-50 dark:bg-purple-900/30",
    textColor: "text-purple-600 dark:text-purple-300",
    iconColor: "text-purple-500",
  },
  {
    title: "Accomplissez des tâches",
    description: "Gagnez des points en effectuant des actions simples.",
    icon: Gift,
    href: "/tasks",
    bgColor: "bg-green-50 dark:bg-green-900/30",
    textColor: "text-green-600 dark:text-green-300",
    iconColor: "text-green-500",
  },
  {
    title: "Parrainez vos amis",
    description:
      "Invitez des amis et recevez des récompenses pour chaque filleul.",
    icon: UserPlus,
    href: "/community",
    bgColor: "bg-sky-50 dark:bg-sky-900/30",
    textColor: "text-sky-600 dark:text-sky-300",
    iconColor: "text-sky-500",
  },
];

export function PointsCarousel() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Gagnez plus de points</h2>
        <p className="text-sm text-muted-foreground">
          Explorez ces options pour augmenter votre solde.
        </p>
      </div>
      <Carousel opts={{ loop: true, align: "start" }} className="w-full">
        <CarouselContent className="-ml-2">
          {carouselItems.map((item, index) => (
            <CarouselItem key={index} className="pl-2 basis-4/5 md:basis-1/3">
              <Link href={item.href}>
                <Card
                  className={cn(
                    "overflow-hidden rounded-2xl h-full group",
                    item.bgColor
                  )}
                >
                  <CardContent className="p-4 flex flex-col justify-between h-full">
                    <div className="flex items-start gap-4">
                      <div
                        className={cn(
                          "p-2 rounded-lg bg-white",
                          item.iconColor
                        )}
                      >
                        <item.icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className={cn("font-bold", item.textColor)}>
                          {item.title}
                        </h3>
                        <p
                          className={cn(
                            "text-sm mt-1",
                            item.textColor,
                            "opacity-80"
                          )}
                        >
                          {item.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end items-center mt-4">
                      <ArrowRight
                        className={cn(
                          "h-5 w-5 transition-transform group-hover:translate-x-1",
                          item.textColor
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  );
}
