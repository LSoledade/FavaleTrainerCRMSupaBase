import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { logAuditEvent, AuditEventType } from "./audit-log";

interface AuthInfo {
  message?: string;
}

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  if (!process.env.SESSION_SECRET) {
    console.warn('ATENÇÃO: SESSION_SECRET não encontrado no ambiente. Utilizando um valor padrão para desenvolvimento.');
  }
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "favale-pink-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true, // Previne acesso ao cookie via JavaScript
      sameSite: "strict", // Proteção contra CSRF
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
    store: storage.sessionStore
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Credenciais inválidas" });
        } else {
          return done(null, user);
        }
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Usuário já existe" });
      }

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });
      
      // Registrar criação de usuário
      logAuditEvent(AuditEventType.USER_CREATED, req, {
        userId: user.id,
        username: user.username,
        role: user.role
      });

      req.login(user, (err: Error | null) => {
        if (err) return next(err);
        
        // Registrar login após registro
        logAuditEvent(AuditEventType.LOGIN_SUCCESS, req, {
          userId: user.id,
          username: user.username,
          registrationLogin: true
        });
        
        return res.status(201).json(user);
      });
    } catch (err) {
      return next(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: Error | null, user: SelectUser | false, info: AuthInfo) => {
      if (err) return next(err);
      
      if (!user) {
        // Registra tentativa de login falha
        logAuditEvent(AuditEventType.LOGIN_FAILURE, req, {
          username: req.body.username,
          reason: info?.message || "Credenciais inválidas"
        });
        return res.status(401).json({ message: info?.message || "Credenciais inválidas" });
      }
      
      req.login(user, (err: Error | null) => {
        if (err) return next(err);
        
        // Registra login bem-sucedido
        logAuditEvent(AuditEventType.LOGIN_SUCCESS, req, {
          userId: user.id,
          username: user.username
        });
        
        return res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    // Capturar informações do usuário antes do logout
    const userId = req.user?.id;
    const username = req.user?.username;
    
    req.logout((err: Error | null) => {
      if (err) return next(err);
      
      // Registrar evento de logout
      if (userId && username) {
        logAuditEvent(AuditEventType.LOGOUT, req, {
          userId,
          username
        });
      }
      
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Não autenticado" });
    res.json(req.user);
  });
}
