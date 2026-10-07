/* 3E Operações — interações do protótipo visual */
document.addEventListener("DOMContentLoaded", () => {
  const login = document.querySelector("#login-form");
  if (login) {
    login.addEventListener("submit", (e) => {
      e.preventDefault();
      const profile = document.querySelector("#perfil-demo")?.value || "gerente";
      const destinations = {
        gerente: "pages/gerente/dashboard.html",
        operador: "pages/operador/fila.html",
        vendedor: "pages/vendedor/meus-pedidos.html",
        expedicao: "pages/expedicao/disponiveis.html",
        admin: "pages/admin/usuarios.html",
        tecnico: "pages/tecnico/integracao.html"
      };
      window.location.href = destinations[profile];
    });
  }

  document.querySelectorAll("[data-filter-table]").forEach(input => {
    input.addEventListener("input", () => {
      const table = document.querySelector(input.dataset.filterTable);
      if (!table) return;
      const term = input.value.toLowerCase();
      table.querySelectorAll("tbody tr").forEach(row => {
        row.style.display = row.innerText.toLowerCase().includes(term) ? "" : "none";
      });
    });
  });

  document.querySelectorAll("[data-modal-open]").forEach(btn => {
    btn.addEventListener("click", () => document.querySelector(btn.dataset.modalOpen)?.classList.remove("hidden"));
  });
  document.querySelectorAll("[data-modal-close]").forEach(btn => {
    btn.addEventListener("click", () => btn.closest(".modal-backdrop")?.classList.add("hidden"));
  });

  document.querySelectorAll("[data-toast]").forEach(btn => {
    btn.addEventListener("click", () => showToast(btn.dataset.toast));
  });

  document.querySelectorAll("[data-confirm-action]").forEach(btn => {
    btn.addEventListener("click", () => {
      if (confirm(btn.dataset.confirmAction)) showToast("Ação registrada apenas na demonstração.");
    });
  });
});

function showToast(message) {
  document.querySelector(".toast")?.remove();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
}
