import Link from "next/link";
import Image from "next/image";
import { ThemeSwitcher } from "@/components/theme-switcher";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-svh w-full flex-col items-center justify-center bg-dots-pattern p-6 md:p-10">
      <div className="absolute right-4 top-4">
        <ThemeSwitcher />
      </div>
      <Link
        href="/"
        className="relative z-10 flex items-center justify-center transition-opacity hover:opacity-80"
        aria-label="FALAPED - voltar ao início"
      >
        <Image
          src="/full-logo.svg"
          alt="FALAPED"
          width={240}
          height={60}
          priority
          className="h-auto w-full max-w-[240px] md:max-w-[240px]"
        />
      </Link>
      <div className="relative z-10 mt-8 w-full max-w-sm">{children}</div>
    </div>
  );
}
