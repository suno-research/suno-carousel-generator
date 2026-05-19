import type { AuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

/**
 * Whitelist por domínio: só permite logar com email @suno.com.br.
 * Pra mudar a lista, edite ALLOWED_DOMAIN ou adicione lógica em `signIn`.
 */
const ALLOWED_DOMAIN = 'suno.com.br';

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          // hd= força o Google a mostrar contas só do domínio (UX), mas a checagem
          // efetiva é feita no callback signIn abaixo.
          hd: ALLOWED_DOMAIN,
          prompt: 'select_account',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      const email = profile?.email?.toLowerCase() || '';
      const allowed = email.endsWith(`@${ALLOWED_DOMAIN}`);
      if (!allowed) {
        console.warn(`[auth] login rejeitado pra ${email} (precisa @${ALLOWED_DOMAIN})`);
      }
      return allowed;
    },
    async session({ session, token }) {
      // Repassa o email pro client
      if (session.user && token.email) {
        session.user.email = token.email;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: { strategy: 'jwt' },
};
