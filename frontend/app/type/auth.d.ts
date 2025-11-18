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

interface RegisterCredentials {
  email: string;
  password: string;
  name: string;
  emailVerified: boolean;
}

interface RegisterData {
  email: string;
  password: string;
  name?: string;
}

// 플랜 목록 조회
interface Plan {
  id: number;
  name: string;
  displayName: string;
  description: string | null;
  price: number;
  yearlyPrice: number | null;
  monthlyCredits: number;
  maxBlogPostsPerMonth: number | null;
  maxPostLength: number | null;
  maxKeywordTrackings: number | null;
  maxPersonas: number | null;
  hasPriorityQueue: boolean;
  hasAdvancedAnalytics: boolean;
  hasApiAccess: boolean;
  hasCustomPersonas: boolean;
  isActive: boolean;
}
