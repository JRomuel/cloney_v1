// Dawn Theme Section Mapper
// Maps editor content to Dawn's native section types

import type { ThemeSectionMapper, MappedSection } from './ThemeSectionMapper';
import type { HeroContent, EditableProduct, Section } from '@/types/editor';
import {
  mapHeroToImageBanner,
  mapProductsToFeaturedCollection,
  mapEditorSection as mapGenericSection,
} from './SectionMapper';

/**
 * Section mapper for Dawn theme
 * Uses Dawn's native sections: image-banner, featured-collection, etc.
 */
export class DawnSectionMapper implements ThemeSectionMapper {
  readonly themeId = 'dawn';

  private readonly sectionTypes = {
    hero: 'image-banner',
    featuredCollection: 'featured-collection',
    richText: 'rich-text',
    mainProduct: 'main-product',
  };

  /**
   * Map hero content to Dawn's image-banner section
   */
  mapHero(hero: HeroContent): MappedSection {
    return mapHeroToImageBanner(hero);
  }

  /**
   * Map products to Dawn's featured-collection section
   */
  mapProducts(products: EditableProduct[], title: string = 'Featured Products'): MappedSection {
    return mapProductsToFeaturedCollection(products, title);
  }

  /**
   * Map a generic editor section to Dawn section
   */
  mapEditorSection(section: Section): MappedSection | null {
    return mapGenericSection(section);
  }

  /**
   * Get the section type name for a given purpose
   */
  getSectionType(purpose: 'hero' | 'featuredCollection' | 'richText' | 'mainProduct'): string {
    return this.sectionTypes[purpose];
  }
}
