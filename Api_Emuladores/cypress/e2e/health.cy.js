describe("API health", () => {
  it("responde 200 en /health", () => {
    cy.request("/health").then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.have.property("status", "ok");
    });
  });
});