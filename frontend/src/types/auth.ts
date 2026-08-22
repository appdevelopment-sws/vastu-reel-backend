export interface Permission {
  id: string;
  name: string;
  resource?: string;
  action?: string;
  description?: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions?: Permission[];
}

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  phone?: string | null;
  age?: number | null;
  address?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  isActive?: boolean;
  roles: string[];
  permissions: string[];
  createdAt?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  name: string;
  email: string;
  password: string;
  phone?: string;
  age?: number;
  address?: string;
  roleName?: string;
  userType?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isCreator: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  register: (data: RegisterData) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<User | null>;
  seedAdmin: () => Promise<{ message: string; superAdminCredentials: { email: string; password: string } }>;
}
