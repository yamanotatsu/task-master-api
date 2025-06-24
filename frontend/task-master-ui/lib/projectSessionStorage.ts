/**
 * Project Session Storage Manager
 * Handles local storage for project creation workflow
 */

export interface ProjectSession {
  sessionId: string;
  timestamp: number;
  projectName: string;
  prdContent: string;
  messages: Array<{
    id: string;
    role: 'user' | 'ai';
    content: string;
    timestamp: Date;
  }>;
  currentStep: number;
  prdCompleteness: {
    overview: boolean;
    features: boolean;
    technical: boolean;
    metrics: boolean;
    timeline: boolean;
    overall: number; // percentage
  };
}

const STORAGE_KEY = 'taskmaster_project_session';
const SESSION_EXPIRY_HOURS = 24;

export class ProjectSessionManager {
  /**
   * Save project session to localStorage
   */
  static save(session: ProjectSession): void {
    try {
      // Clear any other session-related data first
      this.clearAllSessionData();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch (error) {
      console.error('Failed to save project session:', error);
    }
  }

  /**
   * Clear all session-related data from localStorage
   */
  static clearAllSessionData(): void {
    try {
      // Get all localStorage keys
      const keys = Object.keys(localStorage);
      
      // Remove any keys that might be related to sessions
      keys.forEach(key => {
        if (
          key.startsWith('taskmaster_') || 
          key.includes('session') || 
          key.includes('candidate') ||
          key === STORAGE_KEY
        ) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Failed to clear session data:', error);
    }
  }

  /**
   * Load project session from localStorage
   */
  static load(): ProjectSession | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return null;

      const session = JSON.parse(data) as ProjectSession;
      
      // Check if session is expired
      const hoursSinceCreation = (Date.now() - session.timestamp) / (1000 * 60 * 60);
      if (hoursSinceCreation > SESSION_EXPIRY_HOURS) {
        this.clear();
        return null;
      }

      // Convert date strings back to Date objects
      session.messages = session.messages.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));

      return session;
    } catch (error) {
      console.error('Failed to load project session:', error);
      return null;
    }
  }

  /**
   * Clear project session from localStorage
   */
  static clear(): void {
    try {
      this.clearAllSessionData();
    } catch (error) {
      console.error('Failed to clear project session:', error);
    }
  }

  /**
   * Create a new session
   */
  static createNew(): ProjectSession {
    // Clear all old sessions before creating new one
    this.clearAllSessionData();
    
    const newSession = {
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      projectName: '',
      prdContent: '',
      messages: [],
      currentStep: 1,
      prdCompleteness: {
        overview: false,
        features: false,
        technical: false,
        metrics: false,
        timeline: false,
        overall: 0
      }
    };
    
    // Save the new session immediately
    this.save(newSession);
    return newSession;
  }

  /**
   * Update PRD content with debouncing
   */
  private static debounceTimer: NodeJS.Timeout | null = null;
  
  static updatePRD(session: ProjectSession, prdContent: string): ProjectSession {
    const updatedSession = {
      ...session,
      prdContent,
      timestamp: Date.now() // Update timestamp on change
    };

    // Debounce save to localStorage
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = setTimeout(() => {
      this.save(updatedSession);
    }, 500);

    return updatedSession;
  }

  /**
   * Add message to session
   */
  static addMessage(
    session: ProjectSession, 
    message: { role: 'user' | 'ai'; content: string }
  ): ProjectSession {
    const updatedSession = {
      ...session,
      messages: [
        ...session.messages,
        {
          id: Date.now().toString(),
          ...message,
          timestamp: new Date()
        }
      ],
      timestamp: Date.now()
    };

    this.save(updatedSession);
    return updatedSession;
  }

  /**
   * Update completeness status
   */
  static updateCompleteness(
    session: ProjectSession,
    completeness: Partial<ProjectSession['prdCompleteness']>
  ): ProjectSession {
    const updatedSession = {
      ...session,
      prdCompleteness: {
        ...session.prdCompleteness,
        ...completeness
      },
      timestamp: Date.now()
    };

    this.save(updatedSession);
    return updatedSession;
  }

  /**
   * Check if can proceed to next step
   */
  static canProceedToTaskGeneration(session: ProjectSession): boolean {
    return session.prdCompleteness.overall >= 80; // 80% threshold
  }
}