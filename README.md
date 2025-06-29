
# CRM Favale Pink - Sistema de Gestão de Leads e Tarefas

Um CRM completo desenvolvido em React + TypeScript para gestão de leads, tarefas e comunicação via WhatsApp.

## 🚀 Funcionalidades

### 📊 Dashboard
- KPIs em tempo real (leads, estudantes, tarefas)
- Gráficos de leads por origem e estado
- Timeline de atividades
- Widget meteorológico
- Saudação personalizada

### 👥 Gestão de Leads
- CRUD completo de leads
- Importação/exportação em massa (CSV, JSON, Excel)
- Filtros avançados e busca
- Sistema de tags
- Operações em lote
- Histórico de atividades

### ✅ Sistema de Tarefas
- Visualização Kanban e lista
- Delegação de tarefas
- Sistema de comentários
- Diferentes prioridades e status
- Filtros e ordenação
- Notificações

### 💬 Integração WhatsApp
- Envio de mensagens via Evolution API
- Templates de mensagem
- Histórico de conversas
- Notificações de mudança de status

### 👨‍💼 Gestão de Usuários
- Sistema de autenticação
- Perfis de usuário (admin/user)
- Logs de auditoria
- Configurações de segurança

### 📅 Agendamentos
- Calendário de sessões
- Gestão de horários
- Relatórios de agendamentos

## 🛠️ Tecnologias

### Frontend
- **React 18** com TypeScript
- **Vite** para build e desenvolvimento
- **Tailwind CSS** para estilização
- **Radix UI** para componentes
- **React Query** para estado do servidor
- **Wouter** para roteamento
- **React Hook Form** para formulários
- **Recharts** para gráficos

### Backend
- **Node.js** com Express
- **TypeScript**
- **SQLite** com Drizzle ORM
- **Zod** para validação
- **JWT** para autenticação
- **Evolution API** para WhatsApp
- **OpenWeatherMap API** para clima

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+
- npm ou yarn

### Instalação
```bash
# Instalar dependências
npm install

# Configurar banco de dados
npm run setup-db

# Iniciar servidor de desenvolvimento
npm run dev
```

### Configuração
1. Configure as variáveis de ambiente necessárias
2. Configure a integração WhatsApp (Evolution API)
3. Configure a API de clima (OpenWeatherMap)

## 📱 Funcionalidades por Módulo

### Dashboard
- ✅ KPIs em tempo real
- ✅ Gráficos interativos
- ✅ Widget de clima
- ✅ Atividades recentes

### Leads
- ✅ CRUD completo
- ✅ Importação CSV/Excel
- ✅ Exportação múltiplos formatos
- ✅ Filtros avançados
- ✅ Tags dinâmicas
- ✅ Operações em lote

### Tarefas
- ✅ Board Kanban
- ✅ Delegação
- ✅ Comentários
- ✅ Anexos
- ✅ Prioridades
- ✅ Filtros

### WhatsApp
- ✅ Envio de mensagens
- ✅ Templates
- ✅ Histórico
- ✅ Configuração API

### Usuários
- ✅ Autenticação JWT
- ✅ Perfis de acesso
- ✅ Logs de auditoria
- ✅ Configurações

## 🔒 Segurança

- Autenticação JWT
- Validação de dados com Zod
- Logs de auditoria
- Middleware de proteção de rotas
- Tratamento de erros centralizado

## 📈 Performance

- Lazy loading de componentes
- Otimização de queries
- Cache inteligente
- Paginação eficiente
- Compressão de assets

## 🧪 Testes

O sistema está pronto para testes com:
- Dados de exemplo pré-carregados
- Interface responsiva
- Tratamento de erros robusto
- Validações completas

## 📝 Próximos Passos

- [ ] Testes automatizados
- [ ] Notificações push
- [ ] Relatórios avançados
- [ ] Integração com calendário
- [ ] API móvel

## 🎯 Status do MVP

**✅ PRONTO PARA TESTES**

O CRM está totalmente funcional como MVP com todas as funcionalidades principais implementadas e testadas.
