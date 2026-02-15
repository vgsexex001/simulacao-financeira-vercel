import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/((?!api/auth|api/debug-auth|_next/static|_next/image|favicon.ico|manifest.json|icons).*)"],
};
