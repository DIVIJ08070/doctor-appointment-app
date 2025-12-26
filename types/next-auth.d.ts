// types/next-auth.d.ts
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    jwt?: string;
    roles?: string[];
  }

  interface User {
    jwt?: string;
    roles?: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    jwt?: string;
    roles?: string[];
  }
}