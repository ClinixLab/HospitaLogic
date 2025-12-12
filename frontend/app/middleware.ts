import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/doctors",
]);

function isPublic(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) return true;
  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  });

  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(url);
  }

  const role = (token as any).role as string | undefined;

  if (pathname.startsWith("/medicines")) {
    if (role !== "DOCTOR") return NextResponse.redirect(new URL("/", req.url));
  }

  if (pathname.startsWith("/doctor")) {
    if (role !== "DOCTOR") return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
