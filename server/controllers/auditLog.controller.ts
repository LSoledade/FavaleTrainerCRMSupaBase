import type { Request, Response } from "express";
import { getRecentAuditLogs } from "../audit-log"; // Adjust path as needed

// Endpoint para obter logs de auditoria
export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    // Default to 100 logs, allow overriding via query param
    const count = parseInt(req.query.count?.toString() || '100'); 
    // Add basic validation for count if needed (e.g., max value, ensure positive)
    const logs = await getRecentAuditLogs(Math.max(1, count)); // Ensure count is at least 1
    res.json(logs);
  } catch (error) {
    console.error('Erro ao buscar logs de auditoria:', error);
    res.status(500).json({ message: "Erro ao buscar logs de auditoria" });
  }
}; 