export interface BlogPostMeta {
  blog_number: number;
  category: string;
  slug: string;
  title: string;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
  primaryKeyword: string;
  author: string;
  publishedAt: string;
  image: string;
  imageAlt?: string;
  imageSourceLink?: string;
}

export interface BlogPost extends BlogPostMeta {
  content: string;
}
