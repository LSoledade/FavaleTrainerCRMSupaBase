import type { Request, Response } from "express";
import { storage } from "../storage"; // Adjust path as needed
import { sql } from 'drizzle-orm';

export const getStats = async (req: Request, res: Response) => {
  try {
    // Buscar todos os leads e alunos
    const allLeadsPromise = storage.getLeads();
    // Assuming getStudents() exists and returns Student data (or similar)
    // If `getStudents` isn't implemented in storage, we might need to fetch leads with status 'Aluno'
    const studentsPromise = storage.getStudents ? storage.getStudents() : storage.getLeads().then(leads => leads.filter(l => l.status === 'Aluno'));

    const [allLeads, alunos] = await Promise.all([allLeadsPromise, studentsPromise]);

    // Calcular taxa de conversão (Alunos / Leads Totais)
    const conversionRate = allLeads.length > 0 ? (alunos.length / allLeads.length) * 100 : 0;

    // Calcular crescimento mensal (simulado)
    // Ideally, this would query leads based on creation date
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const leadsLastMonth = allLeads.filter(lead => new Date(lead.entryDate) >= oneMonthAgo).length;
    const leadsBeforeLastMonth = allLeads.length - leadsLastMonth;
    const monthlyGrowth = leadsBeforeLastMonth > 0 ? ((leadsLastMonth - leadsBeforeLastMonth) / leadsBeforeLastMonth) * 100 : (leadsLastMonth > 0 ? 100 : 0);

    // Agrupar leads por origem, estado e campanha (se disponíveis)
    const leadsBySource = allLeads.reduce((acc, lead) => {
      const source = lead.source || 'Desconhecido';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const leadsByState = allLeads.reduce((acc, lead) => {
      const state = lead.state || 'Desconhecido';
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Example assuming campaign is stored directly on lead; adjust if needed
    const leadsByCampaign = allLeads.reduce((acc, lead) => {
      const campaign = lead.campaign || 'Nenhuma';
      acc[campaign] = (acc[campaign] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calcular estatísticas gerais
    const stats = {
      totalLeads: allLeads.length,
      totalStudents: alunos.length,
      // Mock session counts based on student numbers - replace with real data when available
      totalActiveSessions: Math.round(alunos.length * 1.6),
      totalCompletedSessions: Math.round(alunos.length * 3.8),
      sessionsPerStudent: alunos.length > 0 ? ((Math.round(alunos.length * 1.6) + Math.round(alunos.length * 3.8)) / alunos.length).toFixed(1) : "0.0", // Approximate
      conversionRate: conversionRate.toFixed(1),
      monthlyGrowth: monthlyGrowth.toFixed(1),
      leadsBySource,
      leadsByState,
      leadsByCampaign,
      totalLeadsByCampaign: Object.values(leadsByCampaign).reduce((a, b) => a + b, 0)
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ message: "Erro ao buscar estatísticas" });
  }
}; 