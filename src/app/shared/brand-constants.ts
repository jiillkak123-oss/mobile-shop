export const BRANDS: string[] = ['All', 'Oppo', 'Vivo', 'Realme', 'Samsung', 'Apple', 'Redmi', 'Oneplus', 'Motorola'];

// keywords allow filtering when product.category may use alternative terminology
export const BRAND_KEYWORDS: Record<string, string[]> = {
  Apple: ['apple', 'iphone'],
  Samsung: ['samsung'],
  Oppo: ['oppo'],
  Vivo: ['vivo'],
  Realme: ['realme'],
  Redmi: ['redmi'],
  Oneplus: ['oneplus'],
  Motorola: ['motorola']
};
