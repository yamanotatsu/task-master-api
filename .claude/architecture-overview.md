# Claude Task Master Architecture Overview

## System Architecture

Claude Task Master is a comprehensive project and task management system built with a modern, scalable architecture. The system consists of multiple components working together to provide a robust platform for AI-assisted project management.

## Technology Stack

### Backend
- **Runtime**: Node.js (v20.18.0)
- **Framework**: Express.js
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth + JWT
- **AI Integration**: Multiple AI providers (OpenAI, Anthropic, Google, etc.)
- **Real-time**: WebSockets (planned)

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **UI Components**: Custom components with Radix UI primitives
- **Styling**: Tailwind CSS
- **State Management**: React Query (TanStack Query)
- **Forms**: React Hook Form with Zod validation

### Infrastructure
- **Database Platform**: Supabase
- **Hosting**: Vercel (Frontend), Railway/Heroku (Backend)
- **File Storage**: Supabase Storage
- **Monitoring**: Application logs, Audit trails
- **Security**: Multi-layered security approach

## Core Components

### 1. API Server (`/api`)

The API server is the heart of the backend system:

```
api/
├── index.js              # Main server entry
├── server.js             # Express configuration
├── server-db.js          # Database-connected server
├── config/               # Configuration files
├── db/                   # Database connections
├── middleware/           # Express middleware
├── routes/               # API endpoints
├── schemas/              # Validation schemas
├── services/             # Business logic
└── utils/                # Utility functions
```

Key Features:
- RESTful API design
- Comprehensive input validation
- Role-based access control
- Audit logging
- Rate limiting
- Security middleware

### 2. Frontend Application (`/frontend/task-master-ui`)

Modern Next.js application with:

```
frontend/task-master-ui/
├── app/                  # Next.js App Router pages
├── components/           # React components
├── hooks/               # Custom React hooks
├── lib/                 # Core libraries
├── providers/           # Context providers
└── utils/               # Utility functions
```

Key Features:
- Server-side rendering
- Optimistic updates
- Real-time data synchronization
- Responsive design
- Accessibility compliance

### 3. CLI Tool (`/scripts`)

Command-line interface for local task management:

```
scripts/
├── dev.js               # Development CLI
├── init.js              # Project initialization
└── modules/             # CLI modules
    ├── ai-services-unified.js
    ├── task-manager.js
    └── dependency-manager.js
```

### 4. MCP Server (`/mcp-server`)

Model Context Protocol server for AI integrations:

```
mcp-server/
├── server.js            # MCP server entry
└── src/
    ├── core/            # Core functionality
    ├── tools/           # MCP tools
    └── direct-functions/# Direct function implementations
```

## Data Flow Architecture

### 1. Authentication Flow
```
User → Frontend → API → Supabase Auth → JWT Token → Authorized Requests
```

### 2. Task Management Flow
```
User Action → API Request → Validation → Business Logic → Database → Response
```

### 3. AI Integration Flow
```
User Input → API → AI Service Selection → Provider API → Response Processing → Database
```

## Database Architecture

### Multi-Tenant Design
- Organization-based isolation
- Row Level Security (RLS)
- Hierarchical permissions

### Key Relationships
```
Organizations
    ├── Projects
    │   ├── Tasks
    │   │   ├── Subtasks
    │   │   └── Dependencies
    │   └── AI Sessions
    ├── Members
    └── Invitations
```

## Security Architecture

### Defense in Depth
1. **Network Layer**: CORS, Rate limiting
2. **Application Layer**: Input validation, CSRF protection
3. **Authentication**: JWT tokens, Session management
4. **Authorization**: RBAC, Resource-based permissions
5. **Data Layer**: RLS, Encrypted storage
6. **Audit Layer**: Comprehensive logging

### Security Features
- Multi-factor authentication (planned)
- Brute force protection
- SQL injection prevention
- XSS protection
- CAPTCHA integration
- Security event monitoring

## API Design Principles

### RESTful Conventions
- Resource-based URLs
- Standard HTTP methods
- Consistent response formats
- Proper status codes

### Versioning Strategy
- URL-based versioning (`/api/v1/`)
- Backward compatibility
- Deprecation notices
- Migration guides

## Performance Optimization

### Backend Optimizations
- Database query optimization
- Connection pooling
- Response caching
- Lazy loading
- Batch operations

### Frontend Optimizations
- Code splitting
- Image optimization
- Virtual scrolling
- Debounced searches
- Optimistic updates

## Scalability Considerations

### Horizontal Scaling
- Stateless API design
- Database read replicas
- Load balancing ready
- Microservices architecture (future)

### Vertical Scaling
- Efficient algorithms
- Memory management
- Query optimization
- Caching strategies

## Development Workflow

### Local Development
1. PostgreSQL via Docker/Supabase CLI
2. Node.js backend server
3. Next.js development server
4. Hot module replacement

### Testing Strategy
- Unit tests (Jest)
- Integration tests
- E2E tests (Playwright)
- API testing (Supertest)

### Deployment Pipeline
1. Git push to feature branch
2. Automated tests
3. Code review
4. Merge to main
5. Automated deployment
6. Post-deployment verification

## Monitoring & Observability

### Application Monitoring
- Error tracking
- Performance metrics
- User analytics
- API usage statistics

### Infrastructure Monitoring
- Server health
- Database performance
- Response times
- Error rates

### Audit & Compliance
- Comprehensive audit logs
- Security event tracking
- Compliance reporting
- Data retention policies

## Future Architecture Plans

### Planned Enhancements
1. **Real-time Collaboration**: WebSocket integration
2. **Microservices**: Service decomposition
3. **Event-Driven Architecture**: Message queuing
4. **GraphQL API**: Alternative to REST
5. **Mobile Applications**: React Native apps

### Scalability Roadmap
1. **Caching Layer**: Redis integration
2. **CDN Integration**: Static asset delivery
3. **Search Infrastructure**: Elasticsearch
4. **Data Warehouse**: Analytics platform
5. **ML Pipeline**: Advanced AI features

## Integration Points

### External Services
- **AI Providers**: OpenAI, Anthropic, Google, etc.
- **Email Service**: SendGrid/AWS SES
- **File Storage**: Supabase Storage
- **Analytics**: Google Analytics, Mixpanel
- **Monitoring**: Sentry, DataDog

### Internal Services
- **Task Generator**: AI-powered task creation
- **Dependency Analyzer**: Task relationship management
- **PRD Parser**: Document analysis
- **Audit Logger**: Activity tracking
- **Notification Service**: Email/in-app notifications

## Development Guidelines

### Code Organization
- Feature-based structure
- Separation of concerns
- DRY principles
- SOLID principles

### Best Practices
- TypeScript for type safety
- ESLint for code quality
- Prettier for formatting
- Conventional commits
- Comprehensive documentation

### Security Guidelines
- Input validation on all endpoints
- Parameterized database queries
- Secure session management
- Regular security audits
- Dependency updates

## Conclusion

Claude Task Master's architecture is designed to be scalable, secure, and maintainable. The modular design allows for easy extension and modification while maintaining system integrity. The multi-layered security approach ensures data protection, and the comprehensive monitoring provides visibility into system health and performance.