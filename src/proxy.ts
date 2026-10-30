import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only (cookie presence). Real session validation happens in the (app) layout.
const PROTECTED = ["/dashboard", "/cv", "/loops", "/matches", "/applications", "/notifications", "/sources", "/settings"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`)) && !req.cookies.has("nc_session")) {
    const url = new URL("/login", req.url);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
