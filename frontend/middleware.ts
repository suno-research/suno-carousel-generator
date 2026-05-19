import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: { signIn: '/login' },
});

export const config = {
  // Protege tudo, exceto rotas públicas:
  // - /login (página de login)
  // - /api/auth/* (NextAuth)
  // - /_next/* (assets do Next)
  // - /suno-logo.svg, favicon, etc (estáticos)
  matcher: ['/((?!login|api/auth|_next/static|_next/image|favicon|.*\\.svg).*)'],
};
