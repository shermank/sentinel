import nextConfig from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextConfig,
  {
    ignores: ["src/generated/**"],
  },
];

export default eslintConfig;
