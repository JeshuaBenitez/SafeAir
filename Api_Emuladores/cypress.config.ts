import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: process.env["CYPRESS_BASE_URL"] || "http://localhost:3000",
    specPattern: "cypress/e2e/**/*.cy.{js,ts}",
    supportFile: false,
    video: false
  }
});