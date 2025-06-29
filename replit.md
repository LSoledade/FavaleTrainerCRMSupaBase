# Replit.md - CRM Favale Pink

## Overview

This is a comprehensive CRM system for Favale Pink Personal Training, built with a modern full-stack architecture. The application manages leads, tasks, sessions, and integrates with WhatsApp for customer communication. It features a React frontend with TypeScript, Express.js backend, and PostgreSQL database with Drizzle ORM.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Library**: shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with custom theme (pink/purple branding)
- **State Management**: React Query (TanStack Query) for server state, React Context for local state
- **Routing**: Wouter for client-side routing
- **Forms**: React Hook Form with Zod validation
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js 20 with Express.js
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Authentication**: Passport.js with local strategy and express-session
- **API Design**: RESTful endpoints with organized controller/route structure
- **Validation**: Zod schemas for request/response validation

### Database Design
- **Primary Database**: PostgreSQL (Neon serverless)
- **Schema Management**: Drizzle migrations and schema definitions
- **Connection**: Connection pooling with @neondatabase/serverless

## Key Components

### Core Entities
1. **Users**: Admin/user roles with authentication
2. **Leads**: Customer lead management with status tracking
3. **Tasks**: Task management with assignment and comments
4. **Sessions**: Training session scheduling and tracking
5. **Trainers**: Trainer/instructor management
6. **WhatsApp Messages**: Communication history with leads

### Authentication & Authorization
- Session-based authentication with secure cookie handling
- Role-based access control (admin/user)
- Password hashing with scrypt
- Audit logging for security events

### Lead Management System
- CRUD operations with batch processing capabilities
- Import/export functionality (CSV, JSON, Excel)
- Advanced filtering and search
- Tag system for categorization
- Phone number normalization and duplicate detection

### Task Management
- Kanban-style task board
- Task assignment and delegation
- Comment system for collaboration
- Priority and status tracking
- User name resolution for display

### WhatsApp Integration
- Evolution API integration for message sending
- Message templates and media support
- Webhook handling for incoming messages
- Connection status monitoring
- Test mode for development

## Data Flow

### Request Flow
1. Client requests pass through authentication middleware
2. Route handlers validate input with Zod schemas
3. Controllers process business logic
4. Storage layer handles database operations
5. Responses include audit logging for sensitive operations

### State Management
- Server state managed by React Query
- Local UI state in React components
- Context providers for shared state (LeadContext, WhatsappContext, TaskContext)
- Form state managed by React Hook Form

### Database Operations
- Connection pooling for performance
- Prepared statements via Drizzle ORM
- Transaction support for batch operations
- Audit logging for data changes

## External Dependencies

### Required Services
- **PostgreSQL Database**: Neon serverless database
- **Evolution API**: WhatsApp message integration

### Optional Services
- **Weather API**: Dashboard weather widget
- **SendGrid**: Email notifications (configured but not fully implemented)
- **Google Calendar**: Session scheduling integration (infrastructure present)

### Development Dependencies
- **Vite**: Frontend build tool and development server
- **ESBuild**: Backend bundling for production
- **TypeScript**: Static type checking
- **Tailwind CSS**: Utility-first styling

## Deployment Strategy

### Development Environment
- Replit-based development with hot reload
- Environment variables loaded from .env
- Development database with seed data
- CORS configured for local development

### Production Deployment
- Docker containerization with multi-stage builds
- Node.js 20 Alpine base image
- Environment validation on startup
- Health check endpoints
- Graceful shutdown handling
- Security headers and CORS configuration

### Build Process
1. Frontend assets built with Vite to `dist/public`
2. Backend bundled with ESBuild to `dist/index.js`
3. Dependencies installed and pruned for production
4. Non-root user for security

### Configuration Management
- Environment-based configuration
- Required vs optional environment variables
- Production-specific security settings
- Logging configuration by environment

## User Preferences

Preferred communication style: Simple, everyday language.

## Changelog

Changelog:
- June 26, 2025. Initial setup
- June 27, 2025. Implemented comprehensive teacher management and class scheduling system:
  - Added professor role support to users table with extended fields (address, specialty, bio, hourlyRate)
  - Created agendamentos_recorrentes table for recurring appointment management
  - Created aulas table for individual class instances
  - Built professor management interface with create/edit dialogs
  - Implemented calendar view using react-big-calendar with Portuguese localization
  - Added recurring appointment scheduling with weekly/daily/monthly patterns
  - Created API endpoints for professor CRUD and class management
  - Added sample professors and students for testing functionality
  - Enhanced calendar display with complete appointment information:
    - Calendar shows service name, student name, and professor name in each event
    - Created detailed appointment view dialog with full information display
    - Added professor and student details in appointment tooltips
    - Implemented separate dialogs for creation (multi-date) and viewing (details)
    - Calendar events show status-based color coding
    - Integrated edit and delete functionality from details dialog