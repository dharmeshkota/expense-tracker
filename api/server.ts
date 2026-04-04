import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { setupAuth } from '../server/auth.js';
import { setupRoutes } from '../server/routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// 👇 CRITICAL FOR VERCEL DEPLOYMENT
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: process.env.AUTH_SECRET || 'secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    httpOnly: true,
  }
}));

app.use(passport.initialize());
app.use(passport.session());

setupAuth(app);
setupRoutes(app);

export default app;