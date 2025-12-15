export function setActiveNavLink() {
  // Rimuovi il DOMContentLoaded da qui!
  const currentPage = window.location.pathname.split("/").pop() || "index.html";

  document.querySelectorAll(".nav-link").forEach((link) => {
    const linkPage = link.getAttribute("href");
    if (
      linkPage === currentPage ||
      (linkPage === "index.html" && currentPage === "")
    ) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}
