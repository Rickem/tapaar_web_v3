import AuthLayout from "@/components/auth/auth-layout";
import SignUpFormClient from "@/components/auth/signup-form-client";
import { Suspense } from "react";

export default function SignUpPage() {
  return (
    <AuthLayout>
      <Suspense fallback={<div>Loading...</div>}>
        <SignUpFormClient />
      </Suspense>
    </AuthLayout>
  );
}
