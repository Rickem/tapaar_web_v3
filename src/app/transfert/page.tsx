"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  useUser,
  useFirestore,
  useCollection,
  useMemoFirebase,
} from "@/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  User,
  Wallet,
  Loader2,
  Search,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { debounce } from "lodash";
import type { UserProfile } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export default function TransferPage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [recipientQuery, setRecipientQuery] = useState("");
  const [selectedRecipient, setSelectedRecipient] =
    useState<UserProfile | null>(null);
  const [searchedRecipients, setSearchedRecipients] = useState<UserProfile[]>(
    []
  );
  const [isSearching, setIsSearching] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const searchRecipients = useCallback(
    debounce(async (search: string) => {
      if (search.length < 3 || !firestore) {
        setSearchedRecipients([]);
        return;
      }
      setIsSearching(true);
      try {
        const usernameQuery = query(
          collection(firestore, "users"),
          where("username", ">=", search),
          where("username", "<=", search + "\uf8ff"),
          limit(5)
        );
        const phoneQuery = query(
          collection(firestore, "users"),
          where("phone", ">=", search),
          where("phone", "<=", search + "\uf8ff"),
          limit(5)
        );

        const [usernameSnapshot, phoneSnapshot] = await Promise.all([
          getDocs(usernameQuery),
          getDocs(phoneQuery),
        ]);

        const results: { [key: string]: UserProfile } = {};

        usernameSnapshot.forEach((doc) => {
          if (doc.id !== user?.uid)
            results[doc.id] = { id: doc.id, ...doc.data() } as UserProfile;
        });
        phoneSnapshot.forEach((doc) => {
          if (doc.id !== user?.uid)
            results[doc.id] = { id: doc.id, ...doc.data() } as UserProfile;
        });

        setSearchedRecipients(Object.values(results));
      } catch (error) {
        console.error("Error searching recipients:", error);
        toast({
          title: "Erreur de recherche",
          description: "Impossible de rechercher des destinataires.",
          variant: "destructive",
        });
      } finally {
        setIsSearching(false);
      }
    }, 500),
    [firestore, toast, user]
  );

  const handleRecipientQueryChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const query = e.target.value;
    setRecipientQuery(query);
    setSelectedRecipient(null);
    searchRecipients(query);
  };

  const handleSelectRecipient = (recipient: UserProfile) => {
    setSelectedRecipient(recipient);
    setRecipientQuery(recipient.name);
    setSearchedRecipients([]);
  };

  const handleProceed = () => {
    if (!selectedRecipient || !amount) return;

    const params = new URLSearchParams({
      recipientId: selectedRecipient.uid,
      recipientName: selectedRecipient.name,
      recipientUsername: selectedRecipient.username,
      recipientPhoto: selectedRecipient.photoUrl || "",
      amount: amount,
      note: note,
    });

    router.push(`/transfer/confirm?${params.toString()}`);
  };

  return (
    <div className="flex h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="sr-only">Retour</span>
        </Button>
        <h1 className="text-lg font-semibold">Transférer des Points</h1>
        <div className="w-9 h-9"></div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-6">
        <Card className="rounded-xl">
          <CardContent className="p-4 space-y-4">
            <div>
              <label
                htmlFor="recipient"
                className="text-sm font-medium text-muted-foreground"
              >
                Destinataire
              </label>
              <div className="relative">
                <Input
                  id="recipient"
                  type="text"
                  placeholder="Nom d'utilisateur ou téléphone"
                  value={recipientQuery}
                  onChange={handleRecipientQueryChange}
                  className="mt-1 pr-10"
                  autoComplete="off"
                />
                <div className="absolute top-1/2 right-2 -translate-y-1/2 h-7 w-7 flex items-center justify-center">
                  {isSearching ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : selectedRecipient ? (
                    <CheckCircle size={18} className="text-green-500" />
                  ) : (
                    <Search size={18} className="text-muted-foreground" />
                  )}
                </div>
              </div>
              {searchedRecipients.length > 0 && (
                <div className="mt-2 space-y-2 border rounded-lg p-2 bg-muted/50">
                  {searchedRecipients.map((recipient) => (
                    <div
                      key={recipient.uid}
                      onClick={() => handleSelectRecipient(recipient)}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-background cursor-pointer"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={recipient.photoUrl} />
                        <AvatarFallback>
                          {recipient.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-sm">
                          {recipient.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          @{recipient.username}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label
                htmlFor="amount"
                className="text-sm font-medium text-muted-foreground"
              >
                Montant (TP)
              </label>
              <Input
                id="amount"
                type="number"
                placeholder="Ex: 1000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label
                htmlFor="note"
                className="text-sm font-medium text-muted-foreground"
              >
                Note (Optionnel)
              </label>
              <Input
                id="note"
                type="text"
                placeholder="Pour votre loyer"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>
        <Button
          className="w-full font-bold text-lg"
          size="lg"
          onClick={handleProceed}
          disabled={!selectedRecipient || !amount || parseFloat(amount) <= 0}
        >
          Continuer
        </Button>
      </main>
    </div>
  );
}
