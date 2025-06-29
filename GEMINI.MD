# FavaleTrainerCRM

## Visão Geral do Projeto

O FavaleTrainerCRM é um sistema de CRM (Customer Relationship Management) desenvolvido para auxiliar personal trainers e academias na gestão de seus clientes, agendamentos, leads e outras atividades relacionadas. Ele oferece uma interface de usuário intuitiva construída com React e um backend robusto em Node.js com Express, utilizando PostgreSQL como banco de dados.

## Tecnologias Utilizadas

*   **Frontend:**
    *   React
    *   TypeScript
    *   Vite (para build)
    *   Tailwind CSS (para estilização)
    *   Shadcn/ui (componentes de UI)
    *   React Query (gerenciamento de estado assíncrono)
    *   Wouter (roteamento)
*   **Backend:**
    *   Node.js
    *   Express.js
    *   TypeScript
    *   Drizzle ORM (para interação com o banco de dados)
    *   PostgreSQL (banco de dados, via Supabase)
    *   Passport.js (autenticação)
    *   Google Calendar API (integração de calendário)
    *   SendGrid (serviço de e-mail)
    *   OpenWeather API (serviço de clima)
*   **Outras:**
    *   Drizzle Kit (migrações de banco de dados)
    *   ESBuild (para build do backend)
    *   Cross-env (para variáveis de ambiente)

## Configuração do Ambiente

Antes de iniciar o projeto, você precisará configurar as variáveis de ambiente. Crie um arquivo `.env` na raiz do projeto (na mesma pasta que o `package.json`) e preencha-o com as informações necessárias, baseando-se no arquivo `.env.example`:

```
# Database Configuration (Required)
DATABASE_URL=postgresql://username:password@host:port/database_name

# Server Configuration
NODE_ENV=development
PORT=5000
HOST=0.0.0.0

# CORS Configuration
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Logging Configuration
LOG_LEVEL=info

# Health Check Configuration
HEALTH_CHECK_PATH=/health
SHUTDOWN_TIMEOUT=30000

# WhatsApp Integration (Optional)
EVOLUTION_API_URL=
EVOLUTION_API_TOKEN=
EVOLUTION_API_INSTANCE=

# Email Service (Optional)
SENDGRID_API_KEY=

# Google Calendar Integration (Optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Weather Service (Optional)
OPENWEATHER_API_KEY=

# Session Configuration
SESSION_SECRET=your_secret_key_for_sessions
```

**Observações:**

*   `DATABASE_URL`: Essencial para a conexão com o banco de dados PostgreSQL do Supabase. Certifique-se de que o banco de dados esteja provisionado e acessível.
*   `CORS_ORIGINS`: Se você estiver rodando o frontend em uma porta diferente, adicione a URL aqui. Para desenvolvimento local, `http://localhost:5173` e `http://127.0.0.1:5173` são comuns.
*   As variáveis de integração (WhatsApp, Email, Google Calendar, Weather) são opcionais. Se você não for utilizá-las, pode deixá-las em branco ou removê-las.
*   `SESSION_SECRET`: Uma chave secreta forte é crucial para a segurança das sessões.

## Instalação

Para instalar as dependências do projeto, execute o seguinte comando na raiz do projeto:

```bash
npm install
```

## Banco de Dados

Este projeto utiliza Drizzle ORM para gerenciar o banco de dados PostgreSQL.

### Migrações

Após configurar o `DATABASE_URL` no seu arquivo `.env`, você pode aplicar as migrações do banco de dados com o seguinte comando:

```bash
npm run db:push
```

Este comando sincronizará seu esquema de banco de dados com o definido em `shared/schema.ts`.

## Execução do Projeto

### Modo de Desenvolvimento

Para iniciar o servidor de desenvolvimento (backend e frontend), execute:

```bash
npm run dev
```

Este comando iniciará o servidor backend com `tsx` e o servidor de desenvolvimento do Vite para o frontend. O frontend geralmente estará disponível em `http://localhost:5173` e o backend em `http://localhost:5000` (ou a porta configurada no `.env`).

### Modo de Produção

Para construir e iniciar o projeto em modo de produção:

1.  **Construir o Projeto:**
    ```bash
    npm run build
    ```
    Este comando irá compilar o frontend com Vite e o backend com ESBuild, gerando os arquivos otimizados na pasta `dist`.

2.  **Iniciar o Servidor de Produção:**
    ```bash
    npm run start
    ```
    Este comando iniciará o servidor Node.js a partir dos arquivos compilados na pasta `dist`.

## Estrutura de Pastas

*   `client/`: Contém todo o código-fonte do frontend (aplicação React).
    *   `client/src/components/`: Componentes reutilizáveis do React.
    *   `client/src/pages/`: Páginas principais da aplicação.
    *   `client/src/services/`: Serviços para comunicação com a API.
    *   `client/src/hooks/`: Hooks personalizados do React.
    *   `client/src/context/`: Contextos React para gerenciamento de estado global.
    *   `client/src/lib/`: Utilitários e configurações.
    *   `client/src/assets/`: Ativos estáticos (imagens, etc.).
*   `server/`: Contém todo o código-fonte do backend (aplicação Express).
    *   `server/controllers/`: Lógica de negócio e manipulação de requisições.
    *   `server/routes/`: Definição das rotas da API.
    *   `server/middlewares/`: Middlewares do Express.
    *   `server/utils/`: Funções utilitárias do backend.
    *   `server/migrations/`: Arquivos de migração do Drizzle.
*   `shared/`: Contém código compartilhado entre frontend e backend, como definições de esquema (Drizzle).
*   `drizzle.config.ts`: Configuração do Drizzle ORM.
*   `package.json`: Metadados do projeto e scripts.
*   `tsconfig.json`: Configuração do TypeScript.
*   `vite.config.ts`: Configuração do Vite.
*   `postcss.config.js`, `tailwind.config.ts`: Configurações de estilização.
