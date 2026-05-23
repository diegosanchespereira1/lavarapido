import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE = "lr_dev_auth";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/login")) {
    return NextResponse.next();
  }

  const staticBypass = [
    "/favicon.ico",
    "/apple-touch-icon.png",
    "/manifest.json",
    "/robots.txt",
  ];
  if (staticBypass.includes(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE)?.value;
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.ico|.*\\.png).*)"],
};
