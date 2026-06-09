import { NextAuthOptions } from 'next-auth';
import AzureADProvider from 'next-auth/providers/azure-ad';

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID,
      authorization: {
        params: {
          scope: 'openid profile email offline_access Mail.ReadWrite Mail.Send Calendars.Read',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.microsoftId = profile?.sub;
        token.tenantId = account.tenantId;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.user.microsoftId = token.microsoftId as string;
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: { strategy: 'jwt' },
};

declare module 'next-auth' {
  interface Session {
    accessToken: string;
    user: {
      microsoftId: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
