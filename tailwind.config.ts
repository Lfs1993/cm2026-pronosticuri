import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./lib/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {
    colors: { fifa: { navy: "#071327", gold: "#D4AF37", blue: "#0F274B" } },
    backgroundImage: { stadium: "radial-gradient(circle at top, rgba(255,255,255,0.12), transparent 40%), linear-gradient(180deg, #071327 0%, #0F274B 45%, #04101f 100%)" }
  } },
  plugins: [],
};
export default config;