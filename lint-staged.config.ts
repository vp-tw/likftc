const formatFiles = "vp fmt --write --no-error-on-unmatched-pattern";
const lintFiles = "vp lint --fix";

export default {
  "*.{css,html,json,jsonc,md,mdx,mjs,svelte,vue,yaml,yml}": formatFiles,
  "*.{cjs,js,jsx,ts,tsx}": [formatFiles, lintFiles],
};
