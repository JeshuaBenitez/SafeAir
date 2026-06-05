describe("Login page", () => {
  it("muestra el formulario de login", () => {
    cy.visit("/auth/login");
    cy.get("form.login-form").should("exist");
    cy.get("input[type=\"email\"]").should("exist");
    cy.get("input[type=\"password\"]").should("exist");
  });
});