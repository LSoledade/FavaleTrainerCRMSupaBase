import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seedTrainers() {
  try {
    console.log('🌱 Iniciando seed dos professores...');

    // Professores Favale
    const favaleTrainers = [
      { name: 'André Silva', email: 'andre.silva@favale.com' },
      { name: 'Matheus Barbosa', email: 'matheus.barbosa@favale.com' },
      { name: 'Marcus', email: 'marcus@favale.com' },
      { name: 'Marcos', email: 'marcos@favale.com' },
      { name: 'Marco Soares', email: 'marco.soares@favale.com' },
      { name: 'Marco', email: 'marco@favale.com' },
      { name: 'Lucia Silva', email: 'lucia.silva@favale.com' },
      { name: 'Juliana', email: 'juliana@favale.com' },
      { name: 'Wagner', email: 'wagner@favale.com' },
      { name: 'Gabriel', email: 'gabriel@favale.com' },
      { name: 'Douglas', email: 'douglas@favale.com' },
      { name: 'Caio', email: 'caio@favale.com' }
    ];

    // Professores Pink
    const pinkTrainers = [
      { name: 'Thais', email: 'thais@pink.com' },
      { name: 'Thaina Caputt', email: 'thaina.caputt@pink.com' },
      { name: 'Tayna', email: 'tayna@pink.com' },
      { name: 'Silvia Regina', email: 'silvia.regina@pink.com' },
      { name: 'Samara', email: 'samara@pink.com' },
      { name: 'Alessandra', email: 'alessandra@pink.com' },
      { name: 'Fayola', email: 'fayola@pink.com' },
      { name: 'Erika Pontes', email: 'erika.pontes@pink.com' },
      { name: 'Erika', email: 'erika@pink.com' },
      { name: 'Dart', email: 'dart@pink.com' },
      { name: 'Michelle', email: 'michelle@pink.com' },
      { name: 'Melissa Santana', email: 'melissa.santana@pink.com' },
      { name: 'Cassia', email: 'cassia@pink.com' }
    ];

    // Inserir professores Favale
    for (const trainer of favaleTrainers) {
      const result = await pool.query(
        `INSERT INTO trainers (name, email, source, active, specialties, phone) 
         VALUES ($1, $2, 'Favale', true, ARRAY['Personal Training', 'Musculação'], '+55 11 99999-0000')
         ON CONFLICT (email) DO NOTHING
         RETURNING id`,
        [trainer.name, trainer.email]
      );
      if (result.rows.length > 0) {
        console.log(`✅ Professor Favale criado: ${trainer.name} (ID: ${result.rows[0].id})`);
      } else {
        console.log(`⚠️ Professor Favale já existe: ${trainer.name}`);
      }
    }

    // Inserir professores Pink
    for (const trainer of pinkTrainers) {
      const result = await pool.query(
        `INSERT INTO trainers (name, email, source, active, specialties, phone) 
         VALUES ($1, $2, 'Pink', true, ARRAY['Personal Training', 'Pilates'], '+55 11 99999-0001')
         ON CONFLICT (email) DO NOTHING
         RETURNING id`,
        [trainer.name, trainer.email]
      );
      if (result.rows.length > 0) {
        console.log(`✅ Professor Pink criado: ${trainer.name} (ID: ${result.rows[0].id})`);
      } else {
        console.log(`⚠️ Professor Pink já existe: ${trainer.name}`);
      }
    }

    console.log('🎉 Seed dos professores concluído com sucesso!');
  } catch (error) {
    console.error('❌ Erro no seed dos professores:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

seedTrainers().catch(console.error);