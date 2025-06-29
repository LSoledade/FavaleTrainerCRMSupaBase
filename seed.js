import { db } from './server/db.js';
import { leads } from './shared/schema.js';

async function seedDatabase() {
  console.log('Seeding database with test data...');
  
  // Sample leads data
  const testLeads = [
    {
      entryDate: new Date('2023-01-15'),
      name: 'Ana Silva',
      email: 'ana.silva@example.com',
      phone: '(11) 98765-4321',
      state: 'SP',
      campaign: 'Instagram',
      tags: ['Interessado', 'Emagrecimento'],
      source: 'Favale',
      status: 'Lead',
      notes: 'Interessada em perder peso',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      entryDate: new Date('2023-02-10'),
      name: 'Bruno Santos',
      email: 'bruno.santos@example.com',
      phone: '(21) 99876-5432',
      state: 'RJ',
      campaign: 'Facebook',
      tags: ['Hipertrofia', 'Suplementação'],
      source: 'Pink',
      status: 'Lead',
      notes: 'Quer ganhar massa muscular',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      entryDate: new Date('2023-03-05'),
      name: 'Carolina Oliveira',
      email: 'carol.oliveira@example.com',
      phone: '(31) 97654-3210',
      state: 'MG',
      campaign: 'Indicação',
      tags: ['Reabilitação', 'Personalizado'],
      source: 'Favale',
      status: 'Aluno',
      notes: 'Em recuperação de lesão no joelho',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      entryDate: new Date('2023-04-20'),
      name: 'Daniel Lima',
      email: 'daniel.lima@example.com',
      phone: '(41) 98765-1234',
      state: 'PR',
      campaign: 'Site',
      tags: ['Iniciante', 'Emagrecimento'],
      source: 'Pink',
      status: 'Aluno',
      notes: 'Nunca treinou antes',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      entryDate: new Date('2023-05-15'),
      name: 'Fernanda Souza',
      email: 'fernanda.souza@example.com',
      phone: '(51) 99876-5678',
      state: 'RS',
      campaign: 'Email',
      tags: ['Preparação', 'Competição'],
      source: 'Favale',
      status: 'Lead',
      notes: 'Interessada em preparação para competição',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      entryDate: new Date('2023-06-10'),
      name: 'Gabriel Costa',
      email: 'gabriel.costa@example.com',
      phone: '(71) 98765-9876',
      state: 'BA',
      campaign: 'Instagram',
      tags: ['Fitness', 'Nutrição'],
      source: 'Pink',
      status: 'Lead',
      notes: 'Quer melhorar condicionamento físico',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      entryDate: new Date('2023-07-01'),
      name: 'Juliana Martins',
      email: 'juliana.martins@example.com',
      phone: '(81) 99876-4567',
      state: 'PE',
      campaign: 'Facebook',
      tags: ['Hiit', 'Emagrecimento'],
      source: 'Favale',
      status: 'Aluno',
      notes: 'Prefere treinos intensos',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      entryDate: new Date('2023-08-15'),
      name: 'Lucas Pereira',
      email: 'lucas.pereira@example.com',
      phone: '(85) 98765-7654',
      state: 'CE',
      campaign: 'Site',
      tags: ['Musculação', 'Nutrição'],
      source: 'Pink',
      status: 'Lead',
      notes: 'Quer orientação nutricional',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      entryDate: new Date('2023-09-20'),
      name: 'Mariana Castro',
      email: 'mariana.castro@example.com',
      phone: '(91) 99876-3456',
      state: 'PA',
      campaign: 'Email',
      tags: ['Pilates', 'Flexibilidade'],
      source: 'Favale',
      status: 'Aluno',
      notes: 'Focada em melhorar postura',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      entryDate: new Date('2023-10-10'),
      name: 'Rafael Almeida',
      email: 'rafael.almeida@example.com',
      phone: '(62) 98765-8765',
      state: 'GO',
      campaign: 'Indicação',
      tags: ['CrossFit', 'Condicionamento'],
      source: 'Pink',
      status: 'Lead',
      notes: 'Praticante de CrossFit há 2 anos',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  try {
    // Inserir os leads de teste
    await db.insert(leads).values(testLeads);
    console.log('Database seeded successfully with 10 sample leads');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    process.exit(0);
  }
}

seedDatabase();
