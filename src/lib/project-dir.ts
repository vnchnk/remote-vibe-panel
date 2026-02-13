import { cookies } from 'next/headers';
import { existsSync } from 'fs';
import path from 'path';

const DEFAULT_DIR = process.env.PROJECT_DIR || path.resolve(process.cwd(), '..');

export async function getProjectDir(): Promise<string> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get('project_dir');
  if (cookie?.value && existsSync(cookie.value)) {
    return cookie.value;
  }
  return DEFAULT_DIR;
}
