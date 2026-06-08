import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		proxy: {
			"/api": {
				target: "http://localhost:3069",
				changeOrigin: true,
			},
		},
		allowedHosts: true,
		hmr: {
			host: process.env.HMR_HOST || "bank.mtmnd.ru",
			protocol: "wss",
			clientPort: 443,
		},
	},
});
