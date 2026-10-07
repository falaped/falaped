import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme-switcher";

/** Modelo "Entrada" do Guia de design: sem menu, logo empilhada acima de um cartão central. */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-svh w-full flex-col items-center justify-center bg-background px-4 py-10">
      <div className="absolute right-4 top-4">
        <ThemeSwitcher />
      </div>
      <Link
        href="/"
        className="rounded-lg transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background focus-visible:outline-none"
        aria-label="Falaped, voltar ao início"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/falaped-logo.svg" alt="Falaped" className="h-16 w-auto dark:hidden" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/falaped-logo-dark.svg" alt="Falaped" className="hidden h-16 w-auto dark:block" />
      </Link>
      <main className="mt-8 w-full max-w-[440px]">{children}</main>
    </div>
  );
}
