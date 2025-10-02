"use server";
/**
 * @fileOverview A flow for sending a one-time password (OTP) to a user's email.
 *
 * - sendOtp - A function that handles sending the OTP.
 * - SendOtpInput - The input type for the sendOtp function.
 */

import { ai } from "@/ai/genkit";
import { Resend } from "resend";
import { z } from "zod";

const resend = new Resend(process.env.RESEND_API_KEY);

const SendOtpInputSchema = z.object({
  email: z.string().email(),
  username: z.string(),
});
export type SendOtpInput = z.infer<typeof SendOtpInputSchema>;

const SendOtpOutputSchema = z.object({
  otp: z.string(),
});
export type SendOtpOutput = z.infer<typeof SendOtpOutputSchema>;

// This is the main function that will be called from the client
export async function sendOtp(input: SendOtpInput): Promise<SendOtpOutput> {
  return sendOtpFlow(input);
}

const sendOtpFlow = ai.defineFlow(
  {
    name: "sendOtpFlow",
    inputSchema: SendOtpInputSchema,
    outputSchema: SendOtpOutputSchema,
  },
  async (input) => {
    // 1. Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 2. Send the email using Resend
    try {
      await resend.emails.send({
        from: "Tapaar <onboarding@resend.dev>",
        to: [input.email],
        subject: `Votre code de vérification Tapaar : ${otp}`,
        html: `
          <div style="font-family: Arial, sans-serif; color: #333;">
            <h2>Bonjour ${input.username},</h2>
            <p>Bienvenue chez Tapaar ! Pour finaliser la création de votre compte, veuillez utiliser le code de vérification ci-dessous :</p>
            <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #335ae3;">${otp}</p>
            <p>Ce code expirera dans 10 minutes.</p>
            <p>Si vous n'avez pas demandé ce code, vous pouvez ignorer cet e-mail.</p>
            <hr/>
            <p style="font-size: 12px; color: #999;">L'équipe Tapaar</p>
          </div>
        `,
      });
    } catch (error) {
      console.error("Error sending OTP email:", error);
      // It's important to handle this error properly in a real app
      // For now, we'll re-throw, but this could be a more specific error
      throw new Error("Failed to send OTP email.");
    }

    // 3. Return the generated OTP so it can be saved for verification
    return {
      otp,
    };
  }
);
