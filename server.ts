import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieSession from 'cookie-session';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { setupAuth } from './server/auth.js';
import { setupRoutes } from './server/routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.set('trust proxy', true);

// ---> 1. VERCEL CACHE FIX <---
// Force Vercel to NEVER strip the Set-Cookie headers
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  next();
});

app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.use(cookieSession({
  name: 'expense-session',
  keys: [process.env.AUTH_SECRET || 'secret'],
  maxAge: 7 * 24 * 60 * 60 * 1000,
  // ---> 2. SECURE FIX <---
  // Removed `secure: true`. Vercel enforces HTTPS natively, but removing this 
  // prevents cookie-session from silently dropping cookies due to proxy confusion.
  sameSite: 'lax',
  httpOnly: true,
}));

// ---> PASSPORT COOKIE-SESSION FIX <---
app.use((req: any, res, next) => {
  if (req.session && !req.session.regenerate) {
    req.session.regenerate = (cb: any) => {
      cb();
    };
  }
  if (req.session && !req.session.save) {
    req.session.save = (cb: any) => {
      cb();
    };
  }
  next();
});

app.use(passport.initialize());
app.use(passport.session());

setupAuth(app);
setupRoutes(app);

// LOCAL DEVELOPMENT: Use Vite middleware
if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

export default app;