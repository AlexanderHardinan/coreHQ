import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  isSessionTokenValid,
  ORDER_ME_SESSION_COOKIE,
} from "@/lib/auth/session";

import LoginForm from "./login-form";

export default async function LoginPage() {
  const cookieStore = await cookies();

  const sessionToken =
    cookieStore.get(
      ORDER_ME_SESSION_COOKIE
    )?.value;

  if (
    isSessionTokenValid(
      sessionToken
    )
  ) {
    redirect("/");
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "32px 20px",
        background: "#f7f8fa",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "460px",
        }}
      >
        <LoginForm />
      </section>
    </main>
  );
}