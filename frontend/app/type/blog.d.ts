interface BlogPost {
  id: number;
  displayId: string; // 고객용 고유 식별자 (YYYYMMDD + Base36)
  keyword: string;
  persona: Record<string, any>; // Persona snapshot
  postType: string;
  subKeywords: string[];
  length: number;
  count: number;
  additionalFields: Record<string, any> | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  completedCount: number;
  targetCount: number;
  userId: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    posts: number;
  };
  posts?: AIPost[];
}

interface AIPost {
  id: number;
  blogPostId: number;
  title: string | null;
  content: string;
  retryCount: number;
  lastError: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  createdAt: string;
}
