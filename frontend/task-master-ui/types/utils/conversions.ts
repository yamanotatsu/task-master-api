/**
 * Type conversion utilities for API <-> Domain transformations
 * Handles snake_case to camelCase conversions and vice versa
 */

// Convert snake_case API response to camelCase domain object
export function toCamelCase<T extends Record<string, any>>(obj: T): any {
  if (Array.isArray(obj)) {
    return obj.map(item => toCamelCase(item));
  }
  
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = toCamelCase(obj[key]);
      return result;
    }, {} as any);
  }
  
  return obj;
}

// Convert camelCase domain object to snake_case API request
export function toSnakeCase<T extends Record<string, any>>(obj: T): any {
  if (Array.isArray(obj)) {
    return obj.map(item => toSnakeCase(item));
  }
  
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((result, key) => {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      result[snakeKey] = toSnakeCase(obj[key]);
      return result;
    }, {} as any);
  }
  
  return obj;
}

// Status conversions
export function convertApiStatusToDomain(status: string): string {
  const statusMap: Record<string, string> = {
    'pending': 'todo',
    'in-progress': 'in_progress',
    'completed': 'done',
    'not-started': 'todo'
  };
  
  return statusMap[status] || status;
}

export function convertDomainStatusToApi(status: string): string {
  const statusMap: Record<string, string> = {
    'todo': 'pending',
    'in_progress': 'in-progress',
    'done': 'completed'
  };
  
  return statusMap[status] || status;
}

// Type guards
export function hasSnakeCaseKeys(obj: any): boolean {
  if (typeof obj !== 'object' || obj === null) return false;
  return Object.keys(obj).some(key => key.includes('_'));
}

export function hasCamelCaseKeys(obj: any): boolean {
  if (typeof obj !== 'object' || obj === null) return false;
  return Object.keys(obj).some(key => /[A-Z]/.test(key));
}