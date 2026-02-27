import { NextRequest, NextResponse } from "next/server";
import { adminFirestore } from "@/lib/firebase-admin";
import { Resend } from "resend";
import { getOtpEmailHtml } from "@/lib/email-templates";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json(
                { error: "L'adresse email est requise." },
                { status: 400 }
            );
        }

        // Find user by email
        const usersSnapshot = await adminFirestore
            .collection("users")
            .where("email", "==", email)
            .limit(1)
            .get();

        if (usersSnapshot.empty) {
            return NextResponse.json(
                { error: "Aucun compte trouvé avec cet email." },
                { status: 404 }
            );
        }

        const userDoc = usersSnapshot.docs[0];
        const userData = userDoc.data();

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Store OTP with 15-minute expiry
        const expiryTime = new Date(Date.now() + 15 * 60 * 1000);
        await userDoc.ref.update({
            resetCode: otp,
            resetCodeExpiry: expiryTime,
        });

        // Send email via Resend
        const fromEmail = process.env.RESEND_FROM_EMAIL || "Tapaar <noreply@tapaar.com>";

        await resend.emails.send({
            from: fromEmail,
            to: email,
            subject: "Réinitialisation de votre mot de passe - Tapaar",
            html: getOtpEmailHtml(userData.name || userData.username || "Utilisateur", otp),
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error sending reset OTP:", error);
        return NextResponse.json(
            { error: "Une erreur est survenue. Veuillez réessayer." },
            { status: 500 }
        );
    }
}
