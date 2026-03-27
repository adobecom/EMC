Create a pull request targeting the `main` branch following project conventions.

Steps:
1. Run `git status` and `git diff main...HEAD` to understand all changes
2. Run `npm run check` — fix any lint or type errors before opening the PR
3. Push the current branch if needed
4. Create the PR with `gh pr create` targeting `main`

PR format:
- Title: imperative mood, under 70 chars (e.g. "Add speaker image upload to EventForm")
- Body should include:
  - **What**: brief description of the change
  - **Why**: motivation or ticket reference
  - **Test plan**: manual steps to verify

Note: `deploy_stage.yml` auto-deploys on merge to `main`. `deploy_prod.yml` triggers on release tags only.
