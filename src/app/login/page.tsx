import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Вход в CRM", robots: { index: false, follow: false } };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md p-6">
        <h1 className="text-2xl font-semibold">Вход в CRM</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Используйте учетную запись, выданную администратором клиники.
        </p>
        <div className="mt-6">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </Card>
    </main>
  );
}
