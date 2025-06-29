import type { Request, Response } from "express";
import { storage } from "../storage"; // Adjust path as needed
import { hashPassword } from "../utils/auth.utils"; // Import the moved function
import { professorValidationSchema } from "../../shared/schema";
import { ZodError } from "zod";

// Lista de usuários
export const getAllUsers = async (_req: Request, res: Response) => {
  try {
    const users = await storage.getAllUsers();
    // Remove password hash before sending to client
    const safeUsers = users.map(({ password, ...user }) => user);
    res.json(safeUsers);
  } catch (error) {
    console.error("Erro ao buscar usuários:", error);
    res.status(500).json({ message: "Erro ao buscar usuários" });
  }
};

// Excluir usuário
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);

    // Prevent self-deletion
    if (userId === req.user?.id) {
      return res.status(400).json({ message: "Não é possível excluir o próprio usuário" });
    }

    const success = await storage.deleteUser(userId);
    if (success) {
      res.status(200).json({ message: "Usuário excluído com sucesso" });
    } else {
      res.status(404).json({ message: "Usuário não encontrado" });
    }
  } catch (error) {
    console.error("Erro ao excluir usuário:", error);
    res.status(500).json({ message: "Erro ao excluir usuário" });
  }
};

// Criar novo usuário
export const createUser = async (req: Request, res: Response) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({ message: "Nome de usuário, senha e perfil são obrigatórios" });
    }

    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ message: "Nome de usuário já existe" });
    }

    const validRoles = ["admin", "marketing", "comercial", "trainer"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: "Perfil inválido" });
    }

    const hashedPassword = await hashPassword(password);
    const user = await storage.createUser({
      username,
      password: hashedPassword,
      role
    });

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    res.status(500).json({ message: "Erro ao criar usuário" });
  }
};

// NOVOS MÉTODOS PARA GESTÃO DE PROFESSORES

// Listar todos os professores
export const getAllProfessors = async (_req: Request, res: Response) => {
  try {
    const professors = await storage.getAllProfessors();
    // Remove password hash before sending to client
    const safeProfessors = professors.map(({ password, ...professor }) => professor);
    res.json(safeProfessors);
  } catch (error) {
    console.error("Erro ao buscar professores:", error);
    res.status(500).json({ message: "Erro ao buscar professores" });
  }
};

// Criar novo professor
export const createProfessor = async (req: Request, res: Response) => {
  try {
    // Validar dados com Zod
    const validatedData = professorValidationSchema.parse(req.body);

    // Verificar se username já existe
    const existingUser = await storage.getUserByUsername(validatedData.username);
    if (existingUser) {
      return res.status(400).json({ message: "Nome de usuário já existe" });
    }

    // Verificar se email já existe (se fornecido)
    if (validatedData.email) {
      const existingEmail = await storage.getUserByEmail(validatedData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "E-mail já existe" });
      }
    }

    // Hash da senha
    const hashedPassword = await hashPassword(validatedData.password);
    
    // Criar professor
    const professor = await storage.createProfessor({
      ...validatedData,
      password: hashedPassword,
      role: "professor" as const,
    });

    // Retornar professor sem senha
    const { password: _, ...professorWithoutPassword } = professor;
    res.status(201).json(professorWithoutPassword);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: "Dados inválidos",
        errors: error.errors.map(err => ({
          field: err.path.join("."),
          message: err.message
        }))
      });
    }
    console.error("Erro ao criar professor:", error);
    res.status(500).json({ message: "Erro ao criar professor" });
  }
};

// Atualizar professor
export const updateProfessor = async (req: Request, res: Response) => {
  try {
    const professorId = parseInt(req.params.id);
    if (isNaN(professorId)) {
      return res.status(400).json({ message: "ID do professor inválido" });
    }

    // Validar dados (sem senha obrigatória)
    const updateSchema = professorValidationSchema.partial().omit({ password: true });
    const validatedData = updateSchema.parse(req.body);

    // Se senha foi fornecida, hash-la
    if (req.body.password) {
      const hashedPassword = await hashPassword(req.body.password);
      (validatedData as any).password = hashedPassword;
    }

    // Verificar se username já existe (se está sendo alterado)
    if (validatedData.username) {
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser && existingUser.id !== professorId) {
        return res.status(400).json({ message: "Nome de usuário já existe" });
      }
    }

    // Verificar se email já existe (se está sendo alterado)
    if (validatedData.email) {
      const existingEmail = await storage.getUserByEmail(validatedData.email);
      if (existingEmail && existingEmail.id !== professorId) {
        return res.status(400).json({ message: "E-mail já existe" });
      }
    }

    const updatedProfessor = await storage.updateProfessor(professorId, validatedData);
    if (!updatedProfessor) {
      return res.status(404).json({ message: "Professor não encontrado" });
    }

    // Retornar professor sem senha
    const { password: _, ...professorWithoutPassword } = updatedProfessor;
    res.json(professorWithoutPassword);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: "Dados inválidos",
        errors: error.errors.map(err => ({
          field: err.path.join("."),
          message: err.message
        }))
      });
    }
    console.error("Erro ao atualizar professor:", error);
    res.status(500).json({ message: "Erro ao atualizar professor" });
  }
};

// Excluir professor
export const deleteProfessor = async (req: Request, res: Response) => {
  try {
    const professorId = parseInt(req.params.id);
    if (isNaN(professorId)) {
      return res.status(400).json({ message: "ID do professor inválido" });
    }

    // Prevenir auto-exclusão
    if (professorId === req.user?.id) {
      return res.status(400).json({ message: "Não é possível excluir o próprio usuário" });
    }

    // Verificar se professor tem aulas agendadas
    const hasScheduledClasses = await storage.hasScheduledClasses(professorId);
    if (hasScheduledClasses) {
      return res.status(400).json({ 
        message: "Não é possível excluir professor com aulas agendadas. Cancele ou reagende as aulas primeiro." 
      });
    }

    const success = await storage.deleteProfessor(professorId);
    if (success) {
      res.status(200).json({ message: "Professor excluído com sucesso" });
    } else {
      res.status(404).json({ message: "Professor não encontrado" });
    }
  } catch (error) {
    console.error("Erro ao excluir professor:", error);
    res.status(500).json({ message: "Erro ao excluir professor" });
  }
}; 