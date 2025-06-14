# Type Migration Guide

## Overview
This guide helps migrate from the old type definitions (primarily in `/lib/api.ts`) to the new organized type structure under `/types/`.

## New Type Structure
```
types/
├── index.ts          # Re-exports all types
├── api/              # API-specific types
│   ├── requests.ts   # Request DTOs
│   ├── responses.ts  # Response DTOs
│   └── index.ts
├── domain/           # Core business logic types
│   ├── task.ts
│   ├── project.ts
│   ├── user.ts
│   ├── organization.ts
│   └── index.ts
├── ui/               # UI-specific types
│   ├── components.ts
│   ├── forms.ts
│   └── index.ts
└── utils/            # Utility types
    ├── common.ts
    ├── conversions.ts
    └── index.ts
```

## Migration Steps

### 1. Update Import Statements

**Old:**
```typescript
import { Task, Project, Member } from '@/lib/api';
```

**New:**
```typescript
import { Task, Project, Member } from '@/types';
// Or more specifically:
import { Task } from '@/types/domain/task';
import { Project } from '@/types/domain/project';
import { Member } from '@/types/domain/user';
```

### 2. Type Name Changes

| Old Type | New Type | Location |
|----------|----------|----------|
| `ApiResponse<T>` | `ApiResponse<T>` | `types/utils/common` |
| `AuthTokens` | `AuthTokens` | `types/api/responses` |
| `LoginResponse` | `LoginResponse` | `types/api/responses` |
| `TasksResponse` | `TasksResponse` | `types/api/responses` |
| `ComplexityAnalysis` | `ComplexityAnalysis` | `types/api/responses` |
| `NextTaskResponse` | `NextTaskResponse` | `types/api/responses` |
| `PRDGenerateRequest` | `PRDGenerateRequest` | `types/api/requests` |
| `ExpandTaskRequest` | `ExpandTaskRequest` | `types/api/requests` |

### 3. Handling Snake Case vs Camel Case

Use the conversion utilities for API interactions:

```typescript
import { toCamelCase, toSnakeCase } from '@/types/utils/conversions';

// When receiving from API (snake_case to camelCase)
const domainTask = toCamelCase(apiResponse.data);

// When sending to API (camelCase to snake_case)
const apiRequest = toSnakeCase(domainObject);
```

### 4. Status Value Conversions

```typescript
import { convertApiStatusToDomain, convertDomainStatusToApi } from '@/types/utils/conversions';

// API returns 'pending', we use 'todo' in domain
const domainStatus = convertApiStatusToDomain(apiStatus);

// Domain uses 'in_progress', API expects 'in-progress'
const apiStatus = convertDomainStatusToApi(domainStatus);
```

### 5. ID Type Usage

Use the specific ID types for better type safety:

```typescript
import { TaskId, SubtaskId, ProjectId, UserId, OrganizationId } from '@/types';

function getTask(taskId: TaskId): Promise<Task> {
  // ...
}
```

### 6. Common Patterns

**Component Props:**
```typescript
import { WithClassName, WithChildren } from '@/types/ui/components';

interface MyComponentProps extends WithClassName, WithChildren {
  // ... other props
}
```

**Form Types:**
```typescript
import { TaskFormValues, FormErrors, FormState } from '@/types/ui/forms';

const [formState, setFormState] = useState<FormState<TaskFormValues>>({
  values: { title: '', priority: 'medium' },
  errors: {},
  touched: {},
  isSubmitting: false,
  isValid: true
});
```

## Gradual Migration Strategy

1. **Phase 1**: Create new imports alongside old ones
2. **Phase 2**: Update components one by one
3. **Phase 3**: Remove old type definitions from `/lib/api.ts`
4. **Phase 4**: Clean up any remaining references

## Benefits of New Structure

- **Better Organization**: Types are grouped by their purpose
- **Improved Type Safety**: Specific ID types prevent mixing different IDs
- **Easier Maintenance**: Related types are co-located
- **Clear Separation**: API types vs Domain types vs UI types
- **Conversion Utilities**: Handle snake_case/camelCase automatically