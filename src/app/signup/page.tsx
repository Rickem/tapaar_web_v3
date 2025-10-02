import AuthLayout from "@/components/auth/auth-layout";
import SignUpForm from "@/components/auth/signup-form";
import { Suspense } from "react";

export default function SignUpPage() {
  return (
    <AuthLayout>
      <Suspense fallback={<div>Loading...</div>}>
        <SignUpForm />
      </Suspense>
    </AuthLayout>
  );
}
