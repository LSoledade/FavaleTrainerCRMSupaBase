import type { Request, Response, NextFunction } from "express";

// Middleware para checar autenticação sem exigir admin
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Não autenticado" });
  }
  next();
}

// Middleware para checar se é administrador
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    // Check authentication first, as isAdmin implies isAuthenticated
    return res.status(401).json({ message: "Não autenticado" });
  }
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Acesso negado" });
  }
  next();
} 