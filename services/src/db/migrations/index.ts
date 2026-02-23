import { migration001 } from './001_add_assets_and_updated_at';
import { Migration } from './types';

export const migrations: Migration[] = [
  migration001,
];
