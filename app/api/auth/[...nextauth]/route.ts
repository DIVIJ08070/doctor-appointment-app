// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

const BACKEND_BASE_URL = "https://medify-service-production.up.railway.app";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        name: { label: "Name", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Use POST /v1/auth for both login and register
        const body = credentials.name
          ? { email: credentials.email, password: credentials.password, name: credentials.name }
          : { email: credentials.email, password: credentials.password };

        const res = await fetch(`${BACKEND_BASE_URL}/v1/auth`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.message || data.error || "Authentication failed");

        // Handle different response formats
        const jwt = data.jwt || data.token || data.access_token;
        const userData = data.user || data.data?.user || data;
        
        if (jwt && (userData || data.email)) {
          return {
            id: userData?.id || userData?._id || data.id || data._id,
            email: userData?.email || data.email,
            name: userData?.name || data.name || credentials.name || credentials.email.split("@")[0],
            jwt: jwt,
            roles: data.roles || userData?.roles || [],
          };
        }
        return null;
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user, account }) {
      // When user first signs in
      if (user) {
        token.jwt = (user as any).jwt;
        token.roles = (user as any).roles || [];
        token.email = user.email;
        token.name = user.name;
      }
      
      // If Google OAuth and no JWT yet, try to register/login with backend
      if (account?.provider === "google" && !token.jwt && account.id_token) {
        try {
          // Backend expects google_id which is the Google ID token
          const res = await fetch(`${BACKEND_BASE_URL}/v1/auth`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              google_id: account.id_token,
            }),
          });

          const responseText = await res.text();
          let data;
          try {
            data = JSON.parse(responseText);
          } catch (e) {
            console.error("❌ Failed to parse backend response:", responseText);
            return token;
          }

          if (res.ok) {
            const jwt = data.jwt || data.token || data.access_token;
            
            if (jwt) {
              token.jwt = jwt;
              token.roles = data.roles || data.user?.roles || [];
              console.log("✅ Successfully got JWT from backend for Google user");
            } else {
              console.warn("⚠️ Backend returned OK but no JWT in response:", data);
            }
          } else {
            console.error("❌ Backend auth failed for Google user. Status:", res.status);
            console.error("Response:", data);
            // If backend doesn't support OAuth, token.jwt will remain undefined
            // API calls will fail, but at least we tried
          }
        } catch (error) {
          console.error("Failed to get JWT from backend for Google user:", error);
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      // Ensure JWT is passed from token to session
      if (token.jwt) {
        session.jwt = token.jwt as string;
      }
      if (session.user) {
        (session.user as any).roles = (token.roles ?? []) as string[];
      }
        return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});

export { handler as GET, handler as POST };