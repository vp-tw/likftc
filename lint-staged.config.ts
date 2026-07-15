const formatFiles = "vp fmt --write";
const lintFiles = "vp lint --fix";

export default {
  "*.{css,html,json,jsonc,md,mdx,mjs,svelte,vue,yaml,yml}": formatFiles,
  "*.{cjs,js,jsx,ts,tsx}": [formatFiles, lintFiles],
};
