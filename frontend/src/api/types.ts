// ==========================================
// Domain Models
// ==========================================

export interface User {
  id: number;
  name: string;
  email: string;
  googleId: string | null;
  authProvider: 'local' | 'google';
  createdAt: string;
}

export interface Forum {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
}

// Thread representation returned by queries (includes author and forum info)
export interface ThreadDetail {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  author: {
    id: number;
    name: string;
  };
  forum: {
    id: number;
    name: string;
  };
}

// Simple Thread representation returned upon creation
export interface ThreadSimple {
  id: number;
  title: string;
  content: string;
  authorId: number;
  forumId: number;
  createdAt: string;
  updatedAt: string;
}

// Post representation returned by queries (includes author info)
export interface PostDetail {
  id: number;
  content: string;
  createdAt: string;
  author: {
    id: number;
    name: string;
  };
}

// Simple Post representation returned upon creation
export interface PostSimple {
  id: number;
  content: string;
  threadId: number;
  authorId: number;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// Data Transfer Objects (DTOs)
// ==========================================

export interface RegisterDTO {
  name: string;
  email: string;
  password: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface GoogleAuthDTO {
  idToken: string;
}

export interface CreateForumDTO {
  name: string;
  description?: string;
}

export interface CreateThreadDTO {
  title: string;
  content: string;
  forumId: number;
}

export interface CreatePostDTO {
  content: string;
  threadId: number;
}

// ==========================================
// API Response Structures
// ==========================================

export interface AuthResponse {
  user: User;
  token: string;
}
