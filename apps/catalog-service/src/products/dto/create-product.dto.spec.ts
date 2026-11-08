import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateProductDto } from './create-product.dto';
import { UpdateProductDto } from './update-product.dto';
import { QueryAdminProductsDto } from './query-admin-products.dto';

describe('CreateProductDto validation', () => {
  const toDto = (body: object) => plainToInstance(CreateProductDto, body);
  const errorsFor = async (body: object) =>
    (await validate(toDto(body))).map((e) => e.property);

  it('accepts a valid product payload', async () => {
    const dto = toDto({
      name: '  Pro Gaming Mouse  ',
      sku: '  MOU-001  ',
      price: 1999.5,
      categoryId: '10000000-0000-4000-8000-000000000001',
      brand: '  RazerTech  ',
      description: 'Ergonomic high-DPI mouse',
      isActive: true,
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.name).toBe('Pro Gaming Mouse');
    expect(dto.sku).toBe('MOU-001');
    expect(dto.brand).toBe('RazerTech');
    expect(dto.price).toBe(1999.5);
  });

  it('rejects missing or empty required fields', async () => {
    const errors = await errorsFor({});
    expect(errors).toContain('name');
    expect(errors).toContain('sku');
    expect(errors).toContain('price');
    expect(errors).toContain('categoryId');
  });

  it('rejects non-positive and invalid price values', async () => {
    expect(
      await errorsFor({
        name: 'Item',
        sku: 'SKU-1',
        categoryId: '10000000-0000-4000-8000-000000000001',
        price: 0,
      }),
    ).toContain('price');

    expect(
      await errorsFor({
        name: 'Item',
        sku: 'SKU-1',
        categoryId: '10000000-0000-4000-8000-000000000001',
        price: -50,
      }),
    ).toContain('price');
  });

  it('rejects invalid UUID categoryId', async () => {
    const errors = await errorsFor({
      name: 'Item',
      sku: 'SKU-1',
      price: 100,
      categoryId: 'not-a-uuid',
    });
    expect(errors).toContain('categoryId');
  });

  it('rejects malformed slugs', async () => {
    const errors = await errorsFor({
      name: 'Item',
      sku: 'SKU-1',
      price: 100,
      categoryId: '10000000-0000-4000-8000-000000000001',
      slug: 'Bad Slug With Caps!',
    });
    expect(errors).toContain('slug');
  });
});

describe('UpdateProductDto validation', () => {
  const toDto = (body: object) => plainToInstance(UpdateProductDto, body);
  const errorsFor = async (body: object) =>
    (await validate(toDto(body))).map((e) => e.property);

  it('accepts partial updates', async () => {
    const dto = toDto({ price: 1299 });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects empty name if provided', async () => {
    expect(await errorsFor({ name: '   ' })).toContain('name');
  });

  it('rejects empty sku if provided', async () => {
    expect(await errorsFor({ sku: '   ' })).toContain('sku');
  });

  it('rejects invalid categoryId if provided', async () => {
    expect(await errorsFor({ categoryId: 'invalid-uuid' })).toContain('categoryId');
  });
});

describe('QueryAdminProductsDto validation & transformation', () => {
  it('transforms boolean strings into booleans', async () => {
    const dto = plainToInstance(QueryAdminProductsDto, {
      isActive: 'true',
      page: '2',
      limit: '15',
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.isActive).toBe(true);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(15);
  });

  it('transforms isActive=false to false', async () => {
    const dto = plainToInstance(QueryAdminProductsDto, {
      isActive: 'false',
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.isActive).toBe(false);
  });

  it('leaves isActive undefined if omitted', async () => {
    const dto = plainToInstance(QueryAdminProductsDto, {});
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.isActive).toBeUndefined();
  });
});
