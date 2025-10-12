"use client";

import {
  useUser,
  useFirestore,
  useCollection,
  useMemoFirebase,
} from "@/firebase";
import {
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  updateDoc,
  writeBatch,
  query,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Loader2,
  CheckCircle,
  Gift,
  ArrowLeft,
  Star,
  BarChart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Task, UserTask, Wallet } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { useDoc } from "@/firebase/firestore/use-doc";

function StatCard({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4 bg-background rounded-xl",
        className
      )}
    >
      <div className="p-3 bg-muted rounded-lg">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <div>
        <p className="font-bold text-xl">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace("/login");
    }
  }, [user, isUserLoading, router]);

  const tasksQuery = useMemoFirebase(
    () => query(collection(firestore, "tasks")),
    [firestore]
  );
  const { data: tasks, isLoading: isLoadingTasks } =
    useCollection<Task>(tasksQuery);

  const userTasksQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, "users", user.uid, "userTasks");
  }, [user, firestore]);
  const { data: userTasks, isLoading: isLoadingUserTasks } =
    useCollection<UserTask>(userTasksQuery);

  const coinsWalletRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, "users", user.uid, "wallets", "-coins-");
  }, [user, firestore]);
  const { data: coinsWallet, isLoading: isLoadingCoinsWallet } =
    useDoc<Wallet>(coinsWalletRef);

  const completedTaskIds = new Set(userTasks?.map((t) => t.id));

  const handleCompleteTask = async (task: Task) => {
    if (!user) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté.",
        variant: "destructive",
      });
      return;
    }

    setCompletingTaskId(task.id);

    const userTaskRef = doc(firestore, "users", user.uid, "userTasks", task.id);
    const walletRef = doc(firestore, "users", user.uid, "wallets", "-coins-");

    try {
      await runTransaction(firestore, async (transaction) => {
        const userTaskDoc = await transaction.get(userTaskRef);
        if (userTaskDoc.exists()) {
          throw new Error("Tâche déjà accomplie.");
        }

        const walletDoc = await transaction.get(walletRef);
        if (walletDoc.exists()) {
          const currentBalance = walletDoc.data()?.balance || 0;
          transaction.update(walletRef, {
            balance: currentBalance + task.reward,
            updatedAt: serverTimestamp(),
          });
        } else {
          transaction.set(walletRef, {
            balance: task.reward,
            type: "coins_wallet",
            updatedAt: serverTimestamp(),
          });
        }

        transaction.set(userTaskRef, {
          status: "completed",
          rewardGiven: true,
          completedAt: serverTimestamp(),
        });
      });

      toast({
        title: "Tâche accomplie !",
        description: `Vous avez gagné ${task.reward} TapaarPoints !`,
      });
    } catch (error: any) {
      console.error("Error completing task: ", error);
      toast({
        title: "Erreur",
        description:
          error.message || "Impossible d'accomplir la tâche pour le moment.",
        variant: "destructive",
      });
    } finally {
      setCompletingTaskId(null);
    }
  };

  const isLoading =
    isLoadingTasks ||
    isLoadingUserTasks ||
    isUserLoading ||
    isLoadingCoinsWallet;

  if (isLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Chargement des tâches...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-center bg-background/80 px-4 backdrop-blur-sm">
        <h1 className="text-lg font-semibold">Gagner des Points</h1>
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
        <div className="p-4 space-y-6">
          <Card className="rounded-2xl shadow-sm bg-primary/5">
            <CardHeader>
              <CardTitle className="text-xl">Mes Points</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center text-center">
              <p className="text-4xl font-bold text-primary">
                {(coinsWallet?.balance || 0).toLocaleString("fr-FR")}
              </p>
              <p className="text-sm text-muted-foreground">
                Solde de Points de Tâche
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Statistiques</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <StatCard
                icon={CheckCircle}
                label="Tâches accomplies"
                value={userTasks?.length || 0}
              />
              <StatCard
                icon={BarChart}
                label="Tâches disponibles"
                value={tasks?.length || 0}
              />
            </CardContent>
          </Card>

          <h2 className="text-xl font-bold pt-4">Tâches Disponibles</h2>

          {!tasks || tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center h-40 gap-4">
              <Gift className="h-16 w-16 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold">Aucune tâche disponible</h3>
              <p className="text-muted-foreground max-w-xs text-sm">
                Revenez plus tard pour découvrir de nouvelles façons de gagner
                des points.
              </p>
            </div>
          ) : (
            tasks.map((task) => {
              const isCompleted = completedTaskIds.has(task.id);
              const isCompleting = completingTaskId === task.id;

              return (
                <Card
                  key={task.id}
                  className={cn(
                    "rounded-2xl shadow-sm transition-all",
                    isCompleted && "bg-muted/50"
                  )}
                >
                  <CardHeader>
                    <CardTitle className="text-lg">{task.title}</CardTitle>
                    <CardDescription>{task.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-primary font-bold text-lg flex items-center gap-1">
                      <Star className="h-5 w-5" />
                      <span>+ {task.reward} TP</span>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full"
                      disabled={isCompleted || isCompleting}
                      onClick={() => handleCompleteTask(task)}
                    >
                      {isCompleting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : isCompleted ? (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Accomplie
                        </>
                      ) : (
                        "Accomplir la tâche"
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
