/**
 * Crea Halı — localStorage-based shopping cart.
 * Works across the product pages (index.html, details.html) and the cart page
 * (shopping-card.html). Cart state is a single array persisted under one key.
 */
(function () {
  "use strict";

  const STORAGE_KEY = "creaCart";
  const TAX_RATE = 0.2; // matches the "Vergi (%20)" row in the summary

  // ---- State helpers -------------------------------------------------------
  function getCart() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    updateBadge();
  }

  // "4.999₺" -> 4999   (Turkish thousands separator is ".")
  function parsePrice(text) {
    const digits = (text || "").replace(/[^\d]/g, "");
    return digits ? parseInt(digits, 10) : 0;
  }

  // 4999 -> "4.999 ₺"
  function formatPrice(value) {
    return value.toLocaleString("tr-TR") + " ₺";
  }

  function itemCount(cart) {
    return cart.reduce((sum, i) => sum + i.qty, 0);
  }

  // ---- Mutations -----------------------------------------------------------
  function addToCart(product) {
    const cart = getCart();
    const existing = cart.find((i) => i.id === product.id);
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({ ...product, qty: 1 });
    }
    saveCart(cart);
  }

  function changeQty(id, delta) {
    const cart = getCart();
    const item = cart.find((i) => i.id === id);
    if (!item) return;
    item.qty += delta;
    const next = item.qty <= 0 ? cart.filter((i) => i.id !== id) : cart;
    saveCart(next);
    renderCartPage();
  }

  function removeFromCart(id) {
    saveCart(getCart().filter((i) => i.id !== id));
    renderCartPage();
  }

  // ---- Navbar badge --------------------------------------------------------
  function updateBadge() {
    const links = document.querySelectorAll('a[href$="shopping-card.html"]');
    const count = itemCount(getCart());
    links.forEach((link) => {
      let badge = link.querySelector(".cart-count");
      if (!badge) {
        badge = document.createElement("span");
        badge.className =
          "cart-count badge rounded-pill bg-danger position-absolute top-0 start-100 translate-middle";
        link.classList.add("position-relative");
        link.appendChild(badge);
      }
      badge.textContent = count;
      badge.style.display = count > 0 ? "inline-block" : "none";
    });
  }

  // ---- Product pages: inject "Sepete Ekle" buttons -------------------------
  function enhanceProductCards() {
    const cards = document.querySelectorAll(".card");
    cards.forEach((card) => {
      const titleEl = card.querySelector(".title");
      const priceEl = card.querySelector(".price-discount");
      const imgEl = card.querySelector(".card-img-top");
      const infoWrap = card.querySelector(".info-wrap");
      if (!titleEl || !priceEl || !imgEl || !infoWrap) return;
      if (infoWrap.querySelector(".add-to-cart")) return; // avoid duplicates

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "add-to-cart btn btn-primary btn-sm w-100 mt-2";
      btn.innerHTML = '<i class="fa fa-shopping-cart"></i> Sepete Ekle';
      btn.addEventListener("click", () => {
        addToCart({
          id: titleEl.textContent.trim(),
          name: titleEl.textContent.trim(),
          price: parsePrice(priceEl.textContent),
          img: imgEl.getAttribute("src"),
        });
        const original = btn.innerHTML;
        btn.innerHTML = '<i class="fa fa-check"></i> Eklendi';
        btn.classList.replace("btn-primary", "btn-success");
        setTimeout(() => {
          btn.innerHTML = original;
          btn.classList.replace("btn-success", "btn-primary");
        }, 1000);
      });
      infoWrap.appendChild(btn);
    });
  }

  // ---- Cart page: render items + totals ------------------------------------
  function renderCartPage() {
    const list = document.getElementById("cart-items");
    if (!list) return; // not the cart page

    const cart = getCart();
    if (cart.length === 0) {
      list.innerHTML =
        '<li class="list-group-item text-center text-muted py-4">Sepetiniz boş.</li>';
    } else {
      list.innerHTML = cart
        .map(
          (item) => `
        <li class="py-3 mb-2 border-top list-group-item" data-id="${item.id}">
          <div class="row align-items-center">
            <div class="col-6">
              <div class="d-flex align-items-center">
                <img src="${item.img}" style="width: 100px" alt="${item.name}" />
                <div class="ms-3">
                  <h6 class="mb-0">${item.name}</h6>
                  <button type="button" class="btn btn-sm btn-link text-danger p-0 cart-remove" data-id="${item.id}">
                    <i class="fa-solid fa-trash-can"></i> Sil
                  </button>
                </div>
              </div>
            </div>
            <div class="col-4">
              <div class="input-group input-group-sm" style="max-width: 130px">
                <button type="button" class="btn btn-outline-secondary cart-dec" data-id="${item.id}">−</button>
                <input type="text" class="form-control text-center" value="${item.qty}" readonly />
                <button type="button" class="btn btn-outline-secondary cart-inc" data-id="${item.id}">+</button>
              </div>
            </div>
            <div class="col-2 text-center">
              <span class="fw-bold">${formatPrice(item.price * item.qty)}</span>
            </div>
          </div>
        </li>`
        )
        .join("");
    }

    const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    const tax = Math.round(subtotal * TAX_RATE);
    const total = subtotal + tax;
    setText("cart-subtotal", formatPrice(subtotal));
    setText("cart-tax", formatPrice(tax));
    setText("cart-total", formatPrice(total));
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  // Event delegation for the cart page controls
  function bindCartPageEvents() {
    const list = document.getElementById("cart-items");
    if (!list) return;
    list.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-id]");
      if (!btn) return;
      const id = btn.getAttribute("data-id");
      if (btn.classList.contains("cart-inc")) changeQty(id, 1);
      else if (btn.classList.contains("cart-dec")) changeQty(id, -1);
      else if (btn.classList.contains("cart-remove")) removeFromCart(id);
    });
  }

  // ---- Init ----------------------------------------------------------------
  document.addEventListener("DOMContentLoaded", () => {
    updateBadge();
    enhanceProductCards();
    bindCartPageEvents();
    renderCartPage();
  });

  // Expose a tiny API (useful for details.html buttons or debugging)
  window.CreaCart = { addToCart, getCart, removeFromCart, changeQty };
})();
