import AuthLayout from "@/components/auth/auth-layout";
import VerifyOtpForm from "@/components/auth/verify-otp-form";
import { Suspense } from "react";

export default function VerifyOtpPage() {
  return (
    <AuthLayout>
      <Suspense fallback={<div>Chargement...</div>}>
        <VerifyOtpForm />
      </Suspense>
    </AuthLayout>
  );
}
