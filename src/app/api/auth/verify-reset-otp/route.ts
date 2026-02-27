import { NextRequest, NextResponse } from "next/server";
import { adminFirestore, adminAuth } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
    try {
        const { email, otp, newPassword } = await request.json();

        if (!email || !otp || !newPassword) {
            return NextResponse.json(
                { error: "Tous les champs sont requis." },
                { status: 400 }
            );
        }

        if (newPassword.length < 6) {
            return NextResponse.json(
                { error: "Le mot de passe doit contenir au moins 6 caractères." },
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

        // Verify OTP
        if (!userData.resetCode || userData.resetCode !== otp) {
            return NextResponse.json(
                { error: "Le code de vérification est incorrect." },
                { status: 400 }
            );
        }

        // Check expiry
        const expiry = userData.resetCodeExpiry?.toDate?.()
            ? userData.resetCodeExpiry.toDate()
            : new Date(userData.resetCodeExpiry);

        if (new Date() > expiry) {
            return NextResponse.json(
                { error: "Le code a expiré. Veuillez en demander un nouveau." },
                { status: 400 }
            );
        }

        // Update password via Firebase Admin
        await adminAuth.updateUser(userDoc.id, {
            password: newPassword,
        });

        // Clear reset code
        await userDoc.ref.update({
            resetCode: "",
            resetCodeExpiry: null,
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error verifying reset OTP:", error);
        return NextResponse.json(
            { error: "Une erreur est survenue. Veuillez réessayer." },
            { status: 500 }
        );
    }
}
