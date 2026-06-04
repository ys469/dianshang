import { describe, expect, it } from 'vitest';
import { demoCategories, demoHomeSections, demoProducts } from '../index';

describe('demo product catalog', () => {
  it('exposes at least eight home categories and one featured product', () => {
    expect(demoCategories.length).toBeGreaterThanOrEqual(8);
    expect(demoProducts.some((product) => product.isFeatured)).toBe(true);
  });

  it('defines homepage sections with product references', () => {
    expect(demoHomeSections.length).toBeGreaterThan(0);
    expect(demoHomeSections.every((section) => section.productIds.length > 0)).toBe(true);
  });
});
