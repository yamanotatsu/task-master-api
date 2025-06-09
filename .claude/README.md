# Claude Task Master Documentation

This directory contains comprehensive documentation for the Claude Task Master system, including database schema, API reference, architecture overview, and security guidelines.

## Documentation Structure

### 📄 [Database Schema](./database-schema.md)
Complete reference for the PostgreSQL database structure including:
- All tables and their relationships
- Column definitions and data types
- Foreign key constraints
- Indexes and performance optimizations
- Row Level Security (RLS) policies
- Migration notes

### 📄 [API Reference](./api-reference.md)
Comprehensive API documentation covering:
- All REST endpoints with request/response formats
- Authentication and authorization requirements
- Rate limiting and security features
- Error codes and response formats
- Pagination and filtering options
- WebSocket endpoints (planned)

### 📄 [Architecture Overview](./architecture-overview.md)
High-level system architecture including:
- Technology stack and components
- Data flow and system interactions
- Scalability considerations
- Performance optimizations
- Development workflow
- Future architecture plans

### 📄 [Security Guide](./security-guide.md)
Detailed security implementation covering:
- Authentication and authorization systems
- API security measures
- Data protection and encryption
- Audit logging and monitoring
- Incident response procedures
- Security best practices

## Quick Links

### For Developers
- [API Endpoints List](./api-reference.md#api-endpoints)
- [Database Relations](./database-schema.md#key-relationships)
- [Security Middleware](./security-guide.md#security-middleware)
- [Development Guidelines](./architecture-overview.md#development-guidelines)

### For System Administrators
- [Security Monitoring](./security-guide.md#security-monitoring)
- [Performance Optimization](./architecture-overview.md#performance-optimization)
- [Audit System](./database-schema.md#security--audit-tables)
- [Deployment Pipeline](./architecture-overview.md#deployment-pipeline)

### For Security Teams
- [Security Architecture](./security-guide.md#security-architecture)
- [Incident Response](./security-guide.md#incident-response)
- [Vulnerability Management](./security-guide.md#vulnerability-management)
- [Compliance](./security-guide.md#compliance)

## Key Features

### Multi-Tenant Architecture
- Organization-based data isolation
- Role-based access control (RBAC)
- Row Level Security (RLS) enforcement
- Hierarchical permission system

### AI Integration
- Multiple AI provider support
- AI-assisted task generation
- PRD parsing and analysis
- Intelligent task expansion

### Security First
- Defense in depth approach
- Comprehensive audit logging
- Real-time security monitoring
- OWASP compliance

### Scalable Design
- Microservices ready architecture
- Horizontal scaling capabilities
- Performance optimized queries
- Caching strategies

## Technology Stack

### Backend
- Node.js + Express.js
- PostgreSQL (Supabase)
- JWT Authentication
- Zod validation

### Frontend
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- React Query

### Infrastructure
- Docker containerization
- CI/CD pipelines
- Automated testing
- Monitoring and alerting

## Getting Started

1. **Review the Architecture**: Start with the [Architecture Overview](./architecture-overview.md) to understand the system design
2. **Understand the Data Model**: Review the [Database Schema](./database-schema.md) for data relationships
3. **Explore the API**: Check the [API Reference](./api-reference.md) for available endpoints
4. **Security Considerations**: Read the [Security Guide](./security-guide.md) for best practices

## Contributing

When updating documentation:
1. Maintain consistent formatting
2. Update the table of contents
3. Include code examples where relevant
4. Document any breaking changes
5. Review for accuracy and completeness

## Support

For questions or clarifications:
- Technical issues: Create a GitHub issue
- Security concerns: security@claudetaskmaster.com
- General inquiries: support@claudetaskmaster.com

## Version

Last updated: January 2025
Documentation version: 1.0.0
API version: v1