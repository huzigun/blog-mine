interface User {
  id: number;
  email: string;
  name: string | null;
}

interface AuthResponse {
  accessToken: string;
  user: User;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  name?: string;
}
