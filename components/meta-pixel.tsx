"use client";

import Script from "next/script";
import { useEffect } from "react";

/**
 * ID do Pixel do Meta. Lido direto de `process.env` (o Next inlina as
 * `NEXT_PUBLIC_*` no bundle) em vez de `lib/env.ts`: aquele schema roda
 * `safeParse(process.env)`, que no browser recebe um objeto vazio e explode.
 */
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

/**
 * Script base do Pixel do Meta. Sem `NEXT_PUBLIC_META_PIXEL_ID` configurado não
 * renderiza nada — dev e preview seguem limpos, sem sujar os dados da campanha.
 */
export function MetaPixel() {
  if (!PIXEL_ID) return null;
  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${PIXEL_ID}');fbq('track','PageView');`}
    </Script>
  );
}

/**
 * Dispara um evento de conversão no Pixel ao montar. Usado na tela de cadastro
 * concluído, que é o que a campanha de beta testers compra.
 */
export function MetaPixelEvent({ name }: { name: string }) {
  useEffect(() => {
    if (!PIXEL_ID) return;
    const fbq = (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq;
    fbq?.("track", name);
  }, [name]);
  return null;
}
