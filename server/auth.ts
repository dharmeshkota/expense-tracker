import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Express } from 'express';
import prisma from './db';

export function setupAuth(app: Express) {
  passport.use(new GoogleStrategy({
    clientID: process.env.AUTH_GOOGLE_ID!,
    clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    callbackURL: `${process.env.APP_URL}/auth/google/callback`,
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const user = await prisma.user.upsert({
        where: { email: profile.emails?.[0].value },
        update: {
          name: profile.displayName,
          image: profile.photos?.[0].value,
        },
        create: {
          email: profile.emails?.[0].value,
          name: profile.displayName,
          image: profile.photos?.[0].value,
        },
      });
      return done(null, user);
    } catch (error) {
      return done(error as Error);
    }
  }));

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

  app.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    }
  );

  app.get('/api/auth/me', (req: any, res) => {
    res.json(req.user || null);
  });

  app.post('/api/auth/logout', (req: any, res) => {
    req.logout((err: any) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
  });
}
