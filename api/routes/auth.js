import express from 'express';
import { supabase } from '../db/supabase.js';
import logger from '../utils/logger.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/v1/auth/signup
 * Create a new user account
 */
router.post('/signup', async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    
    // Validation
    if (!fullName || !email || !password) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '必須項目が入力されていません'
        }
      });
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '有効なメールアドレスを入力してください'
        }
      });
    }
    
    // Password strength validation
    if (password.length < 8) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'パスワードは8文字以上である必要があります'
        }
      });
    }
    
    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'パスワードに大文字を含む必要があります'
        }
      });
    }
    
    if (!/[a-z]/.test(password)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'パスワードに小文字を含む必要があります'
        }
      });
    }
    
    if (!/[0-9]/.test(password)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'パスワードに数字を含む必要があります'
        }
      });
    }
    
    // Create user with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        },
        emailRedirectTo: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/callback`
      }
    });
    
    if (error) {
      logger.error('Signup error:', error);
      
      if (error.message.includes('already registered')) {
        return res.status(409).json({
          error: {
            code: 'EMAIL_ALREADY_EXISTS',
            message: 'このメールアドレスは既に登録されています'
          }
        });
      }
      
      throw error;
    }
    
    // Log successful signup
    logger.info(`User signed up: ${email} (${data.user.id})`);
    
    res.status(201).json({
      message: '確認メールを送信しました。メールをご確認ください。',
      data: {
        id: data.user.id,
        email: data.user.email
      }
    });
  } catch (error) {
    logger.error('Signup error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'サーバーエラーが発生しました'
      }
    });
  }
});

/**
 * POST /api/v1/auth/login
 * User login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'メールアドレスとパスワードを入力してください'
        }
      });
    }
    
    // Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      logger.error('Login error:', error);
      return res.status(401).json({
        error: {
          code: 'AUTH_FAILED',
          message: 'メールアドレスまたはパスワードが正しくありません'
        }
      });
    }
    
    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', data.user.id)
      .single();
    
    // Log successful login
    logger.info(`User logged in: ${email} (${data.user.id})`);
    
    res.json({
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
          fullName: profile?.full_name || '',
          avatarUrl: profile?.avatar_url || null
        },
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_in: data.session.expires_in
        }
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'サーバーエラーが発生しました'
      }
    });
  }
});

/**
 * POST /api/v1/auth/logout
 * User logout
 */
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      logger.error('Logout error:', error);
      throw error;
    }
    
    // Log successful logout
    logger.info(`User logged out: ${req.user.email} (${req.user.id})`);
    
    res.json({
      message: 'ログアウトしました'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'ログアウト処理でエラーが発生しました'
      }
    });
  }
});

/**
 * POST /api/v1/auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    
    if (!refresh_token) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'リフレッシュトークンが必要です'
        }
      });
    }
    
    // Refresh session with Supabase
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token
    });
    
    if (error) {
      logger.error('Token refresh error:', error);
      return res.status(401).json({
        error: {
          code: 'AUTH_INVALID_TOKEN',
          message: 'リフレッシュトークンが無効です'
        }
      });
    }
    
    res.json({
      data: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in
      }
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'トークンリフレッシュでエラーが発生しました'
      }
    });
  }
});

/**
 * DELETE /api/v1/auth/user
 * Delete user account
 */
router.delete('/user', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Note: Supabase Admin API is required to delete users
    // This requires using the service role key
    // The actual deletion will cascade through the database due to ON DELETE CASCADE
    
    // First, check if user is the last admin in any organization
    const { data: adminMemberships } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('profile_id', userId)
      .eq('role', 'admin');
    
    if (adminMemberships && adminMemberships.length > 0) {
      // Check each organization
      for (const membership of adminMemberships) {
        const { data: otherAdmins } = await supabase
          .from('organization_members')
          .select('profile_id')
          .eq('organization_id', membership.organization_id)
          .eq('role', 'admin')
          .neq('profile_id', userId);
        
        if (!otherAdmins || otherAdmins.length === 0) {
          return res.status(400).json({
            error: {
              code: 'CANNOT_DELETE_LAST_ADMIN',
              message: '組織の最後の管理者は削除できません。先に他のメンバーを管理者に昇格させてください。'
            }
          });
        }
      }
    }
    
    // Delete user using Admin API
    const { error } = await supabase.auth.admin.deleteUser(userId);
    
    if (error) {
      logger.error('User deletion error:', error);
      throw error;
    }
    
    // Log account deletion
    logger.info(`User account deleted: ${req.user.email} (${userId})`);
    
    res.json({
      message: 'アカウントが削除されました'
    });
  } catch (error) {
    logger.error('Account deletion error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'アカウント削除でエラーが発生しました'
      }
    });
  }
});

/**
 * GET /api/v1/auth/me
 * Get current user information
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    // Get user profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', req.user.id)
      .single();
    
    if (error && error.code !== 'PGRST116') { // Ignore "no rows" error
      logger.error('Profile fetch error:', error);
      throw error;
    }
    
    res.json({
      data: {
        user: {
          id: req.user.id,
          email: req.user.email,
          fullName: profile?.full_name || '',
          avatarUrl: profile?.avatar_url || null,
          emailVerified: req.user.email_verified,
          createdAt: req.user.created_at
        }
      }
    });
  } catch (error) {
    logger.error('Get user info error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'ユーザー情報の取得でエラーが発生しました'
      }
    });
  }
});

export default router;