import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.onboarded = (user as { onboarded: boolean }).onboarded;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { onboarded: boolean }).onboarded =
          token.onboarded as boolean;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;
      const publicRoutes = ["/login"];

      if (publicRoutes.includes(pathname)) {
        if (isLoggedIn) return Response.redirect(new URL("/dashboard", nextUrl));
        return true;
      }

      if (!isLoggedIn) return false;

      if (pathname.startsWith("/onboarding") && auth?.user && (auth.user as { onboarded?: boolean }).onboarded) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      if (
        !pathname.startsWith("/onboarding") &&
        auth?.user &&
        !(auth.user as { onboarded?: boolean }).onboarded &&
        !pathname.startsWith("/api")
      ) {
        return Response.redirect(new URL("/onboarding", nextUrl));
      }

      return true;
    },
  },
};
