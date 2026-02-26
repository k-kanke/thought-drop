import { migration001 } from './001_add_assets_and_updated_at';
import { migration002 } from './002_add_dashboard_and_character_tables';
import { Migration } from './types';

export const migrations: Migration[] = [
  migration001,
  migration002,
];
