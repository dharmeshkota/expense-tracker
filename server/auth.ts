import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Express } from 'express';
import prisma from './db.js';

export function setupAuth(app: Express) {
  const googleClientId = process.env.AUTH_GOOGLE_ID;
  const googleClientSecret = process.env.AUTH_GOOGLE_SECRET;
  const appUrl = process.env.APP_URL || 'http://localhost:3000';

  if (!process.env.APP_URL) {
    console.warn('APP_URL environment variable is not set. OAuth redirects may fail.');
  }

  if (!googleClientId || !googleClientSecret) {
    console.error('CRITICAL: AUTH_GOOGLE_ID or AUTH_GOOGLE_SECRET is missing. Google Login will not work.');
  } else {
    passport.use(new GoogleStrategy({
      clientID: googleClientId,
      clientSecret: googleClientSecret,
      callbackURL: `${appUrl}/auth/google/callback`,
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
  }

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

  app.get('/api/auth/google/url', (req, res) => {
    try {
      if (!googleClientId) {
        return res.status(500).json({ 
          error: 'AUTH_GOOGLE_ID is missing in environment variables. Please set it in your Vercel dashboard.' 
        });
      }
      const redirectUri = `${appUrl}/auth/google/callback`;
      const params = new URLSearchParams({
        client_id: googleClientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'profile email',
        access_type: 'offline',
        prompt: 'consent',
      });
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
      res.json({ url: authUrl });
    } catch (error) {
      console.error('Error generating auth URL:', error);
      res.status(500).json({ error: 'Internal Server Error' });
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
