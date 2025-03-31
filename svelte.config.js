import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({
			// pages directory
			pages: 'build',
			// assets directory
			assets: 'build',
			// fall back to index.html
			fallback: 'index.html', // Important for SPA!
			// precompress files
			precompress: false,
			// disable strict mode
			strict: false
		})
	}
};

export default config;
