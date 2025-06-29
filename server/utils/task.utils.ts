import type { IStorage } from "../storage"; // Adjust path as needed

// Helper para adicionar nomes de usuários às tarefas
export async function addUserNamesToTasks(tasks: any[], storage: IStorage) {
  // Buscar todos os usuários para preencher os nomes
  const users = await storage.getAllUsers();
  
  // Criar mapa de IDs -> nomes de usuários para busca rápida
  const userMap = users.reduce((acc: Record<number, string>, user: { id: number, username: string }) => {
    acc[user.id] = user.username;
    return acc;
  }, {});
  
  // Adicionar nomes de usuários às tarefas
  return tasks.map(task => ({
    ...task,
    assignedToName: userMap[task.assignedToId] || 'Usuário não encontrado',
    assignedByName: userMap[task.assignedById] || 'Usuário não encontrado'
  }));
} 