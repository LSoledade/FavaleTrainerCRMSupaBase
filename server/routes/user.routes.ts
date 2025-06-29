import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { 
  getAllProfessors, 
  createProfessor, 
  updateProfessor, 
  deleteProfessor 
} from "../controllers/user.controller";

const router = Router();

// Aplicar middleware de autenticação a todas as rotas
router.use(isAuthenticated);

// ROTAS PARA GESTÃO DE PROFESSORES
router.get("/professors", getAllProfessors);
router.post("/professors", createProfessor);
router.put("/professors/:id", updateProfessor);
router.delete("/professors/:id", deleteProfessor);

export default router;