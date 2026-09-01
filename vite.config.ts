// Lovable's config wrapper provides the TanStack Start, React, Tailwind and path plugins.
// SPA mode lets this application be deployed to a static host such as GitHub Pages.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    spa: {
      enabled: true,
    },
    server: { entry: "server" },
  },
});
