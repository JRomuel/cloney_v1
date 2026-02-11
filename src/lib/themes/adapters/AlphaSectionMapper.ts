// Alpha Theme Section Mapper
// Extends Tinker mapper since Alpha uses the same template structure

import { TinkerSectionMapper } from './TinkerSectionMapper';

/**
 * Section mapper for Alpha theme
 * Alpha shares Tinker's template structure, so all mapping logic is inherited
 */
export class AlphaSectionMapper extends TinkerSectionMapper {
  // @ts-expect-error - Override literal type from parent; Alpha reuses Tinker's templates
  readonly themeId = 'alpha';
}
