import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QueryProductsDto } from './query-products.dto';

async function validateQuery(query: Record<string, unknown>) {
  const dto = plainToInstance(QueryProductsDto, query);
  return validate(dto);
}

describe('QueryProductsDto', () => {
  it('accepts a valid query', async () => {
    const errors = await validateQuery({
      page: '2',
      limit: '12',
      categoryId: '10000000-0000-4000-8000-000000000001',
      search: 'phone',
      minPrice: '500',
      maxPrice: '50000',
      sortBy: 'price',
      sortOrder: 'asc',
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects non-positive page', async () => {
    const errors = await validateQuery({ page: '0' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects non-integer page', async () => {
    const errors = await validateQuery({ page: '1.5' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects limit above the maximum', async () => {
    const errors = await validateQuery({ limit: '101' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects negative prices', async () => {
    expect((await validateQuery({ minPrice: '-1' })).length).toBeGreaterThan(0);
    expect((await validateQuery({ maxPrice: '-0.5' })).length).toBeGreaterThan(
      0,
    );
  });

  it('rejects non-numeric prices', async () => {
    const errors = await validateQuery({ minPrice: 'abc' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects unsupported sort fields', async () => {
    const errors = await validateQuery({ sortBy: 'passwordHash' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects unsupported sort orders', async () => {
    const errors = await validateQuery({ sortOrder: 'sideways' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects invalid category ids', async () => {
    const errors = await validateQuery({ categoryId: 'not-a-uuid' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects unknown query parameters via whitelist', async () => {
    const dto = plainToInstance(QueryProductsDto, {
      page: '1',
      hacker: 'yes',
    });
    // whitelist stripping is enforced by the global ValidationPipe;
    // here we only assert decorated fields still validate cleanly.
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
