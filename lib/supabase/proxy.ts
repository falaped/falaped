import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // If the env vars are not set, skip proxy check. You can remove this
  // once you setup the project.
  if (!hasEnvVars) {
    return supabaseResponse;
  }

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Validate session with the server (getUser) so that deleted/invalid users
  // are not treated as logged in. getClaims() only reads the JWT from the cookie
  // and would still show the user as logged in after deletion from auth.users.
  const { data } = await supabase.auth.getUser();
  const user = data?.user;

  const pathname = request.nextUrl.pathname;

  // books.falaped.com.br serve o app de livros na raiz: "/" → /books, "/{id}" → /books/{id}.
  // Auth e API seguem os mesmos paths; "/dashboard" não existe nesse host e volta à raiz.
  // Landing pública (lead + capa grátis) vive em app/books/lp: na raiz para visitante,
  // e nos aliases /criar e /privacidade; o pediatra logado continua vendo a lista na raiz.
  const isBooksHost = (request.headers.get("host") ?? "").startsWith("books.");
  const homePath = isBooksHost ? "/" : "/dashboard";
  const LP_ALIASES = ["/criar", "/privacidade"];
  // Também públicos em qualquer host (localhost: /books/lp, /books/lp/criar, /api/books/lead/*).
  const isBooksPublic =
    pathname.startsWith("/books/lp") ||
    pathname.startsWith("/api/books/lead") ||
    (isBooksHost && (LP_ALIASES.includes(pathname) || pathname.startsWith("/lp") || (pathname === "/" && !user)));
  if (isBooksHost) {
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/books/lp")) {
      const url = request.nextUrl.clone();
      url.pathname = pathname.startsWith("/books/lp") ? pathname.slice("/books/lp".length) || "/" : "/";
      return NextResponse.redirect(url);
    }
    if (!pathname.startsWith("/auth") && !pathname.startsWith("/api") && !pathname.startsWith("/books")) {
      const url = request.nextUrl.clone();
      url.pathname =
        pathname === "/"
          ? user
            ? "/books"
            : "/books/lp"
          : LP_ALIASES.includes(pathname)
            ? `/books/lp${pathname}`
            : `/books${pathname}`;
      const rewriteResponse = NextResponse.rewrite(url, { request });
      supabaseResponse.cookies.getAll().forEach((cookie) =>
        rewriteResponse.cookies.set(cookie.name, cookie.value, {
          path: cookie.path,
          domain: cookie.domain,
          maxAge: cookie.maxAge,
          expires: cookie.expires,
          httpOnly: cookie.httpOnly,
          secure: cookie.secure,
          sameSite: cookie.sameSite,
        }),
      );
      supabaseResponse = rewriteResponse;
    }
  }

  const isAuthRoute =
    pathname === "/auth/login" ||
    pathname === "/auth/sign-up" ||
    pathname === "/auth/forgot-password" ||
    pathname === "/auth/sign-up-success" ||
    pathname === "/auth/error" ||
    pathname === "/auth/update-password";
  const isHomePage = pathname === "/";

  // Authenticated user: redirect away from auth screens and home to dashboard
  if (user && ((isHomePage && !isBooksHost) || isAuthRoute)) {
    const url = request.nextUrl.clone();
    url.pathname = homePath;
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) =>
      redirectResponse.cookies.set(cookie.name, cookie.value, {
        path: cookie.path,
        domain: cookie.domain,
        maxAge: cookie.maxAge,
        expires: cookie.expires,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite,
      }),
    );
    return redirectResponse;
  }

  // Unauthenticated user: redirect protected routes to login
  if (!user && (!isHomePage || isBooksHost) && !pathname.startsWith("/auth") && !isBooksPublic) {
    await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) =>
      redirectResponse.cookies.set(cookie.name, cookie.value, {
        path: cookie.path,
        domain: cookie.domain,
        maxAge: cookie.maxAge,
        expires: cookie.expires,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite,
      }),
    );
    return redirectResponse;
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
