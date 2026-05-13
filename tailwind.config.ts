import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#202124",
        paper: "#f7f5ef",
        moss: "#4f6f52",
        clay: "#a45f3d",
        steel: "#49657a"
      }
    }
  },
  plugins: []
};

export default config;
