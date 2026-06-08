import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('admin product image input', () => {
  it('uses paste/upload image controls instead of a URL field', () => {
    const source = readFileSync(resolve(__dirname, '../views/products/ProductListView.vue'), 'utf8');

    expect(source).not.toContain('type="url"');
    expect(source).toContain('accept="image/*"');
    expect(source).toContain(`handleImagePaste($event, 'create')`);
    expect(source).toContain(`handleImagePaste($event, 'edit')`);
    expect(source).toContain('function readImageAsDataUrl(file: File)');
    expect(source).toContain('function openImagePicker(target: ImageTarget)');
  });
});
