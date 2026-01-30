import { z } from 'zod';

// Homepage Content Types
export const HeroContentSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  ctaText: z.string(),
  ctaUrl: z.string(),
  backgroundImage: z.string().optional(),
});

export type HeroContent = z.infer<typeof HeroContentSchema>;

export const FeaturesContentSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    icon: z.string().optional(),
    title: z.string(),
    description: z.string(),
  })),
});

export type FeaturesContent = z.infer<typeof FeaturesContentSchema>;

export const TestimonialsContentSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    quote: z.string(),
    author: z.string(),
    role: z.string().optional(),
    avatar: z.string().optional(),
  })),
});

export type TestimonialsContent = z.infer<typeof TestimonialsContentSchema>;

export const GalleryContentSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    src: z.string(),
    alt: z.string(),
    caption: z.string().optional(),
  })),
});

export type GalleryContent = z.infer<typeof GalleryContentSchema>;

export const TextContentSchema = z.object({
  body: z.string(),
});

export type TextContent = z.infer<typeof TextContentSchema>;

export type SectionContent = FeaturesContent | TestimonialsContent | GalleryContent | TextContent;

export const SectionSchema = z.object({
  id: z.string(),
  type: z.enum(['features', 'testimonials', 'gallery', 'text']),
  enabled: z.boolean(),
  title: z.string(),
  content: z.union([
    FeaturesContentSchema,
    TestimonialsContentSchema,
    GalleryContentSchema,
    TextContentSchema,
  ]),
});

export type Section = z.infer<typeof SectionSchema>;

export const HomepageContentSchema = z.object({
  hero: HeroContentSchema,
  sections: z.array(SectionSchema),
});

export type HomepageContent = z.infer<typeof HomepageContentSchema>;

// Editable Product Type
export const EditableProductSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  price: z.number(),
  compareAtPrice: z.number().optional(),
  tags: z.array(z.string()),
  imageUrl: z.string().optional(),
  vendor: z.string().optional(),
});

export type EditableProduct = z.infer<typeof EditableProductSchema>;

// Style Settings Type
export const StyleSettingsSchema = z.object({
  colors: z.object({
    primary: z.string(),
    secondary: z.string(),
    background: z.string(),
    text: z.string(),
    accent: z.string(),
  }),
  typography: z.object({
    headingFont: z.string(),
    bodyFont: z.string(),
  }),
});

export type StyleSettings = z.infer<typeof StyleSettingsSchema>;

// Editor Session Types
export type EditorTab = 'homepage' | 'products' | 'styles';
export type PreviewMode = 'desktop' | 'mobile';
export type EditorSessionStatus = 'editing' | 'importing' | 'imported';

// Page Types (for multi-page editor)
export type EditorPage = 'home' | 'product' | 'contact';

// Product Page Content (single product display)
export interface ProductPageContent {
  selectedProductId: string | null;
  layout: {
    imagePosition: 'left' | 'right';
    showRecommendations: boolean;
  };
  sections: Section[];
}

// Contact Page Content
export interface ContactPageContent {
  hero: {
    title: string;
    subtitle: string;
  };
  contactInfo: {
    email: string;
    phone: string;
    address: string;
  };
  sections: Section[];
}

export interface EditorSession {
  id: string;
  generationId: string;
  homepageContent: HomepageContent | null;
  productsContent: EditableProduct[] | null;
  stylesContent: StyleSettings | null;
  status: EditorSessionStatus;
  importedThemeId: string | null;
  importedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Default values for new content
export const defaultHeroContent: HeroContent = {
  title: 'Welcome to Your Store',
  subtitle: 'Discover amazing products',
  ctaText: 'Shop Now',
  ctaUrl: '/collections/all',
};

export const defaultStyleSettings: StyleSettings = {
  colors: {
    primary: '#000000',
    secondary: '#666666',
    background: '#ffffff',
    text: '#333333',
    accent: '#0066cc',
  },
  typography: {
    headingFont: 'Helvetica Neue',
    bodyFont: 'Helvetica Neue',
  },
};

export const defaultHomepageContent: HomepageContent = {
  hero: defaultHeroContent,
  sections: [],
};

export const defaultProductPageContent: ProductPageContent = {
  selectedProductId: null,
  layout: {
    imagePosition: 'left',
    showRecommendations: true,
  },
  sections: [],
};

export const defaultContactPageContent: ContactPageContent = {
  hero: {
    title: 'Contact Us',
    subtitle: 'We\'d love to hear from you',
  },
  contactInfo: {
    email: 'hello@example.com',
    phone: '+1 (555) 123-4567',
    address: '123 Main Street, City, Country',
  },
  sections: [],
};
