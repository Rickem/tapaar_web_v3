"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import {
    ArrowLeft,
    Eye,
    EyeOff,
    Loader2,
    Mail,
    KeyRound,
    ShieldCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

// Step 1: Email schema
const emailSchema = z.object({
    email: z.string().email({ message: "Adresse email invalide." }),
});

// Step 2: OTP schema
const otpSchema = z.object({
    otp: z.string().length(6, { message: "Le code doit contenir 6 chiffres." }),
});

// Step 3: New password schema
const passwordSchema = z
    .object({
        password: z.string().min(6, {
            message: "Le mot de passe doit contenir au moins 6 caractères.",
        }),
        confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Les mots de passe ne correspondent pas.",
        path: ["confirmPassword"],
    });

type Step = 1 | 2 | 3;

export default function ResetPasswordFlow() {
    const [step, setStep] = useState<Step>(1);
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    // Cooldown timer
    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
        return () => clearTimeout(timer);
    }, [cooldown]);

    // Step 1 form
    const emailForm = useForm<z.infer<typeof emailSchema>>({
        resolver: zodResolver(emailSchema),
        defaultValues: { email: "" },
    });

    // Step 2 form
    const otpForm = useForm<z.infer<typeof otpSchema>>({
        resolver: zodResolver(otpSchema),
        defaultValues: { otp: "" },
    });

    // Step 3 form
    const passwordForm = useForm<z.infer<typeof passwordSchema>>({
        resolver: zodResolver(passwordSchema),
        defaultValues: { password: "", confirmPassword: "" },
    });

    // Step 1: Send OTP
    async function handleSendOtp(values: z.infer<typeof emailSchema>) {
        setIsLoading(true);
        try {
            const res = await fetch("/api/auth/send-reset-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: values.email }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Une erreur est survenue.");
            }

            setEmail(values.email);
            setCooldown(60);
            setStep(2);
            toast({
                title: "Code envoyé !",
                description: "Un code de vérification a été envoyé à votre email.",
            });
        } catch (error: any) {
            toast({
                title: "Erreur",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }

    // Step 2: Verify OTP (just store it, actual verification happens in step 3)
    async function handleVerifyOtp(values: z.infer<typeof otpSchema>) {
        setOtp(values.otp);
        setStep(3);
    }

    // Resend OTP
    async function handleResendOtp() {
        if (cooldown > 0) return;

        setIsResending(true);
        try {
            const res = await fetch("/api/auth/send-reset-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Une erreur est survenue.");
            }

            setCooldown(60);
            toast({
                title: "Code renvoyé !",
                description: "Un nouveau code a été envoyé à votre email.",
            });
        } catch (error: any) {
            toast({
                title: "Erreur",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsResending(false);
        }
    }

    // Step 3: Reset password
    async function handleResetPassword(values: z.infer<typeof passwordSchema>) {
        setIsLoading(true);
        try {
            const res = await fetch("/api/auth/verify-reset-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    otp,
                    newPassword: values.password,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Une erreur est survenue.");
            }

            toast({
                title: "Mot de passe mis à jour !",
                description:
                    "Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.",
            });
            router.push("/login");
        } catch (error: any) {
            // If OTP error, go back to step 2
            if (
                error.message.includes("code") ||
                error.message.includes("expiré")
            ) {
                setStep(2);
                otpForm.reset();
            }
            toast({
                title: "Erreur",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }

    const stepConfig = {
        1: {
            icon: Mail,
            title: "Mot de passe oublié ?",
            description:
                "Entrez votre adresse e-mail pour recevoir un code de réinitialisation.",
        },
        2: {
            icon: KeyRound,
            title: "Vérification",
            description: `Un code à 6 chiffres a été envoyé à ${email}.`,
        },
        3: {
            icon: ShieldCheck,
            title: "Nouveau mot de passe",
            description: "Choisissez un nouveau mot de passe pour votre compte.",
        },
    };

    const { icon: StepIcon, title, description } = stepConfig[step];

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-center mb-4">
                    <div className="p-3 bg-primary/10 rounded-full">
                        <StepIcon className="h-8 w-8 text-primary" />
                    </div>
                </div>
                <CardTitle className="text-2xl font-bold text-center">
                    {title}
                </CardTitle>
                <CardDescription className="text-center text-muted-foreground">
                    {description}
                </CardDescription>
                {/* Step indicator */}
                <div className="flex justify-center gap-2 pt-4">
                    {[1, 2, 3].map((s) => (
                        <div
                            key={s}
                            className={`h-1.5 rounded-full transition-all ${s === step
                                ? "w-8 bg-primary"
                                : s < step
                                    ? "w-4 bg-primary/40"
                                    : "w-4 bg-muted"
                                }`}
                        />
                    ))}
                </div>
            </CardHeader>
            <CardContent>
                {/* Step 1: Email */}
                {step === 1 && (
                    <Form {...emailForm}>
                        <form
                            onSubmit={emailForm.handleSubmit(handleSendOtp)}
                            className="space-y-4"
                        >
                            <FormField
                                control={emailForm.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input placeholder="votre@email.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button
                                type="submit"
                                className="w-full font-bold"
                                disabled={isLoading}
                            >
                                {isLoading && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Envoyer le code
                            </Button>
                        </form>
                    </Form>
                )}

                {/* Step 2: OTP */}
                {step === 2 && (
                    <Form {...otpForm}>
                        <form
                            onSubmit={otpForm.handleSubmit(handleVerifyOtp)}
                            className="space-y-4"
                        >
                            <FormField
                                control={otpForm.control}
                                name="otp"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-center block">
                                            Code de vérification
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="123456"
                                                maxLength={6}
                                                {...field}
                                                className="text-center text-2xl tracking-[0.5em] font-bold h-14"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button
                                type="submit"
                                className="w-full font-bold"
                                disabled={isLoading}
                            >
                                Continuer
                            </Button>
                        </form>
                    </Form>
                )}

                {/* Step 3: New password */}
                {step === 3 && (
                    <Form {...passwordForm}>
                        <form
                            onSubmit={passwordForm.handleSubmit(handleResetPassword)}
                            className="space-y-4"
                        >
                            <FormField
                                control={passwordForm.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nouveau mot de passe</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="********"
                                                    {...field}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="absolute top-1/2 right-2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:bg-transparent hover:text-foreground"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                >
                                                    {showPassword ? (
                                                        <EyeOff size={16} />
                                                    ) : (
                                                        <Eye size={16} />
                                                    )}
                                                </Button>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={passwordForm.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Confirmer le mot de passe</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    placeholder="********"
                                                    {...field}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="absolute top-1/2 right-2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:bg-transparent hover:text-foreground"
                                                    onClick={() =>
                                                        setShowConfirmPassword(!showConfirmPassword)
                                                    }
                                                >
                                                    {showConfirmPassword ? (
                                                        <EyeOff size={16} />
                                                    ) : (
                                                        <Eye size={16} />
                                                    )}
                                                </Button>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button
                                type="submit"
                                className="w-full font-bold"
                                disabled={isLoading}
                            >
                                {isLoading && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Réinitialiser le mot de passe
                            </Button>
                        </form>
                    </Form>
                )}

                {/* Resend OTP (Step 2 only) */}
                {step === 2 && (
                    <div className="mt-4 text-center text-sm">
                        <p className="text-muted-foreground">
                            Vous n'avez pas reçu de code ?
                        </p>
                        <Button
                            variant="link"
                            className="font-bold text-primary p-0 h-auto mt-1"
                            onClick={handleResendOtp}
                            disabled={isResending || cooldown > 0}
                        >
                            {isResending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Envoi en cours...
                                </>
                            ) : cooldown > 0 ? (
                                `Renvoyer dans ${cooldown}s`
                            ) : (
                                "Renvoyer le code"
                            )}
                        </Button>
                    </div>
                )}

                {/* Back to step 1 (Step 2 only) */}
                {step === 2 && (
                    <div className="mt-2 text-center">
                        <Button
                            variant="link"
                            className="text-muted-foreground p-0 h-auto text-sm"
                            onClick={() => {
                                setStep(1);
                                otpForm.reset();
                            }}
                        >
                            <ArrowLeft className="mr-1 h-3 w-3" />
                            Changer d'email
                        </Button>
                    </div>
                )}

                {/* Back to login */}
                <div className="mt-6 text-center text-sm">
                    <Link
                        href="/login"
                        className="underline text-muted-foreground hover:text-primary"
                    >
                        Retour à la connexion
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}
