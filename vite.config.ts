import { defineConfig } from 'vite';

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
    base: envBase ?? (isGithubActions ? repoBase ?? '/' : '/')
  };
});
