import { defineConfig } from 'vite';
import { resolve } from 'node:path';

function resolveRepoBase(): string | undefined {
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo) return undefined;
  const [, repoName] = repo.split('/');
  return repoName ? `/${repoName}/` : undefined;
}

export default defineConfig(() => {
  const isGithubActions = process.env.GITHUB_ACTIONS === 'true';
  const envBase = process.env.VITE_BASE_PATH;
  const repoBase = resolveRepoBase();

  return {
    base: envBase ?? (isGithubActions ? repoBase ?? '/' : '/'),
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          admin: resolve(__dirname, 'admin/index.html'),
          terms: resolve(__dirname, 'terms/index.html'),
          privacy: resolve(__dirname, 'privacy/index.html')
        }
      }
    }
  };
});
