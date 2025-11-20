// Café Amiga's SPA logic (updated)
// state
let menu = [];
let cart = JSON.parse(localStorage.getItem('caf_cart') || '[]');
let editingIndex = null; // for edit selected

// elements
const tabs = document.querySelectorAll('.tab-button');
const contents = document.querySelectorAll('.tab-content');
const menuGrid = document.getElementById('menu-grid');
const searchInput = document.getElementById('search');
const cartBubble = document.getElementById('cart-bubble');
const cartList = document.getElementById('cart-list');
const cartTotalSpan = document.getElementById('cart-total') || document.createElement('span');

// tab logic
tabs.forEach(btn => btn.addEventListener('click', () => showTab(btn.dataset.tab)));
function showTab(tabId) {
   tabs.forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
  contents.forEach(c => c.classList.toggle('active', c.id === tabId));

  // HIDE HERO when not HOME
  const hero = document.getElementById("hero-banner");
  if (hero) hero.style.display = (tabId === "home") ? "block" : "none";

  // animations
  document.querySelectorAll('.tab-content').forEach(sec => {
    sec.classList.remove('fade');
  });
  setTimeout(() => {
    document.getElementById(tabId)?.classList.add('fade');
  }, 20);

  
  if (tabId === 'products') renderMenu(menu);
  if (tabId === 'cart') renderCart();
  if (tabId === 'customize') renderBaseOptions();
}

// initial load
document.addEventListener('DOMContentLoaded', async () => {
  await loadMenu();
  updateCartBadge();
  showTab('home');
  // hero button
  const startBtn = document.getElementById('start-order');
  if (startBtn) startBtn.addEventListener('click', ()=> showTab('products'));
});

// load menu.json
async function loadMenu(){
  try{
    const res = await fetch('menu.json');
    menu = await res.json();
    renderMenu(menu);
    renderBaseOptions();
    renderHomeProducts(); // fill the vertical summary on HOME

    // search
    if(searchInput) searchInput.addEventListener('input', ()=> {
      const q = searchInput.value.toLowerCase();
      const filtered = menu.filter(it => it.name.toLowerCase().includes(q) || it.description.toLowerCase().includes(q));
      renderMenu(filtered);
    });
  }catch(e){
    console.error('loadMenu error', e);
    if (menuGrid) menuGrid.innerHTML = '<p class="muted">Failed to load menu.json (run via local server).</p>';
  }
}

// render menu grid
function renderMenu(items){
  if(!menuGrid) return;
  menuGrid.innerHTML = '';
  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'menu-card';
    card.innerHTML = `
      <img src="${item.image}" alt="${item.name}">
      <div class="menu-info">
        <h3>${item.name}</h3>
        <div class="quote">${item.quote}</div>
        <p>${item.description}</p>
        <div class="card-actions">
          <div><strong>₱${item.price}</strong> · ⭐ ${item.rating}</div>
          <div>
            <button class="view-btn" data-id="${item.id}">View</button>
            <button class="add-btn" data-id="${item.id}">Add</button>
          </div>
        </div>
      </div>
    `;
    menuGrid.appendChild(card);
  });

  // attach handlers
  document.querySelectorAll('.add-btn').forEach(b => b.addEventListener('click', (e)=>{
    const id = e.currentTarget.dataset.id;
    const item = menu.find(m=>m.id===id);
    if(item) addToCart(cloneItem(item));
  }));
  document.querySelectorAll('.view-btn').forEach(b => b.addEventListener('click', (e)=>{
    const id = e.currentTarget.dataset.id;
    const item = menu.find(m=>m.id===id);
    if(!item) return;
    // prefill customize with base and switch to customize tab
    const baseSel = document.getElementById('base-select');
    if(baseSel) baseSel.value = item.id;
    const fsel = document.getElementById('flavor-select'); if(fsel) fsel.value = '';
    const ssel = document.getElementById('size-select'); if(ssel) ssel.value = 'Small';
    const cname = document.getElementById('custom-name'); if(cname) cname.value = '';
    document.querySelectorAll('.extras input').forEach(i=> i.checked = false);
    renderCustomPreview();
    showTab('customize');
    const selInfo = document.getElementById('selected-info');
    if(selInfo) selInfo.innerHTML = `<strong>Selected:</strong> ${item.name}`;
  }));
}

// helper: clone
function cloneItem(it){ return JSON.parse(JSON.stringify(it)); }

// populate base options for customize
function renderBaseOptions(){
  const sel = document.getElementById('base-select');
  if(!sel) return;
  sel.innerHTML = '<option value="">-- choose base --</option>';
  menu.forEach(m=>{
    const opt = document.createElement('option');
    opt.value = m.id; opt.textContent = m.name;
    sel.appendChild(opt);
  });
}

// CUSTOMIZE form logic
const customForm = document.getElementById('custom-form');
if(customForm){
  customForm.addEventListener('submit', e=>{
    e.preventDefault();
    const baseId = document.getElementById('base-select').value;
    const flavor = document.getElementById('flavor-select').value;
    const size = document.getElementById('size-select').value;
    const extras = Array.from(document.querySelectorAll('.extras input:checked')).map(i=>i.value);
    const customName = document.getElementById('custom-name').value.trim();

    const baseItem = menu.find(m=>m.id===baseId) || {name: 'Custom Base', price: 120, id: 'custom-base'};

    let price = Number(baseItem.price) || 120;
    price += (size === 'Medium')?20:(size === 'Large')?40:0;
    if(extras.includes('Cream Crest')) price += 20;
    if(extras.includes('Pearl Pop')) price += 25;
    if(extras.includes('Extra Shot')) price += 30;
    if(extras.includes('Cinnamon')) price += 5;

    const cartItem = {
      id: 'ci'+Date.now(),
      baseId: baseItem.id,
      name: customName || `${size} ${flavor} ${baseItem.name}`,
      flavor, size, extras, price, custom: true
    };

    if(editingIndex !== null){
      cart[editingIndex] = cartItem;
      editingIndex = null;
    } else {
      cart.push(cartItem);
    }

    persistCart();
    updateCartBadge();
    renderCart();
    customForm.reset();
    const total = cart.reduce((s,c)=> s + (Number(c.price)||0), 0);
if(totalEl) totalEl.textContent = total;
  });

  // preview updates
  ['base-select','flavor-select','size-select'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.addEventListener('change', renderCustomPreview);
  });
  document.querySelectorAll('.extras input').forEach(i=> i.addEventListener('change', renderCustomPreview));
  const cancelBtn = document.getElementById('cancel-custom');
  if(cancelBtn) cancelBtn.addEventListener('click', ()=>{
    customForm.reset();
    const preview = document.getElementById('custom-preview');
    if(preview) preview.innerHTML = '';
    editingIndex = null;
  });
}

function renderCustomPreview(){
  const baseId = document.getElementById('base-select')?.value;
  const baseItem = menu.find(m=>m.id===baseId);
  const flavor = document.getElementById('flavor-select')?.value;
  const size = document.getElementById('size-select')?.value;
  const extras = Array.from(document.querySelectorAll('.extras input:checked')).map(i=>i.value);
  const preview = document.getElementById('custom-preview');
  if(!preview) return;
  let html = '<h4>Preview</h4>';
  if(baseItem) html += `<div><strong>Base:</strong> ${baseItem.name} (₱${baseItem.price})</div>`;
  if(flavor) html += `<div><strong>Flavor:</strong> ${flavor}</div>`;
  if(size) html += `<div><strong>Size:</strong> ${size}</div>`;
  if(extras.length) html += `<div><strong>Extras:</strong> ${extras.join(', ')}</div>`;
  preview.innerHTML = html;
}

// CART functions
function addToCart(item){
  cart.push(item);
  persistCart();
  updateCartBadge();
  renderCart();
  alert(`${item.name} added to cart`);
}

function persistCart(){ localStorage.setItem('caf_cart', JSON.stringify(cart)); }
function updateCartBadge(){
  if(!cartBubble) return;
  const n = cart.length;
  cartBubble.textContent = n;
  cartBubble.classList.toggle('hidden', n === 0);
}

// render cart list with checkboxes, edit, remove
function renderCart(){
  const list = document.getElementById('cart-list');
  const totalEl = document.getElementById('cart-total');
  if(!list) return;
  list.innerHTML = '';
  if(cart.length === 0){
    list.innerHTML = '<div class="muted">Your cart is empty.</div>';
    if(totalEl) totalEl.textContent = '0';
    return;
  }

  cart.forEach((ci, idx)=>{
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <div class="left">
        <input type="checkbox" class="sel" data-idx="${idx}" />
        <div>
          <div><strong>${ci.name}</strong></div>
          <div class="meta">${ci.custom ? '(Custom) ' : ''}${ci.flavor || ''} · ${ci.size || ''} ${ci.extras?.length ? '· ' + ci.extras.join(', ') : ''}</div>
        </div>
      </div>
      <div>
        <div>₱${ci.price}</div>
        <div style="margin-top:8px">
          <button class="outline" data-edit="${idx}">Edit</button>
          <button class="outline danger" data-remove="${idx}">Remove</button>
        </div>
      </div>
    `;
    list.appendChild(div);
  });

  // attach remove/edit handlers
  list.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', e=>{
    const i = Number(e.currentTarget.dataset.remove);
    if(!confirm('Remove this item?')) return;
    cart.splice(i,1); persistCart(); updateCartBadge(); renderCart();
  }));
  list.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', e=>{
    const i = Number(e.currentTarget.dataset.edit);
    const item = cart[i];
    editingIndex = i;
    document.getElementById('base-select').value = item.baseId || '';
    document.getElementById('flavor-select').value = item.flavor || '';
    document.getElementById('size-select').value = item.size || 'Small';
    document.getElementById('custom-name').value = item.name || '';
    document.querySelectorAll('.extras input').forEach(ch => ch.checked = item.extras?.includes(ch.value));
    renderCustomPreview();
    showTab('customize');
  }));

  // total
  const total = cart.reduce((s,c)=> s + (Number(c.price)||0), 0);
  if(totalEl) totalEl.textContent = total;
}

// multi-select controls (safe guards: only attach if element exists)
const editSelectedBtn = document.getElementById('edit-selected');
if(editSelectedBtn) editSelectedBtn.addEventListener('click', ()=>{
  const sel = getSelectedIndices();
  if(sel.length !== 1){ alert('Select exactly one item to edit.'); return; }
  const idx = sel[0];
  document.querySelector(`[data-edit="${idx}"]`)?.click();
});
const removeSelectedBtn = document.getElementById('remove-selected');
if(removeSelectedBtn) removeSelectedBtn.addEventListener('click', ()=>{
  const sel = getSelectedIndices();
  if(sel.length === 0){ alert('Select items to remove.'); return; }
  if(!confirm(`Remove ${sel.length} item(s)?`)) return;
  sel.sort((a,b)=>b-a).forEach(i => cart.splice(i,1));
  persistCart(); updateCartBadge(); renderCart();
});
const selectAllBtn = document.getElementById('select-all');
if(selectAllBtn) selectAllBtn.addEventListener('click', ()=> {
  document.querySelectorAll('.sel').forEach(ch => ch.checked = true);
});

function getSelectedIndices(){
  return Array.from(document.querySelectorAll('.sel'))
    .filter(ch => ch.checked)
    .map(ch => Number(ch.dataset.idx));
}

// checkout inside cart
const checkoutForm = document.getElementById('checkout-form');
if (checkoutForm) {
  checkoutForm.addEventListener('submit', e=>{
    e.preventDefault();
    const name = document.getElementById('cust-name').value.trim();
    const phone = document.getElementById('cust-phone').value.trim();
    const address = document.getElementById('cust-address').value.trim();
    const payment = document.getElementById('cust-payment').value;
    if(!name||!phone||!address||!payment){ alert('Please fill all checkout fields'); return; }

    const selIdx = getSelectedIndices();
    const itemsToOrder = selIdx.length ? selIdx.map(i=>cart[i]) : cart.slice();
    if(itemsToOrder.length === 0){ alert('No items selected'); return; }
    const order = {
      id: 'ORD'+Date.now(),
      customer: {name,phone,address,payment},
      items: itemsToOrder,
      total: itemsToOrder.reduce((s,i)=> s + (Number(i.price)||0),0),
      createdAt: new Date().toISOString()
    };

    const orderedIds = new Set(itemsToOrder.map(i=>i.id));
    cart = cart.filter(ci => !orderedIds.has(ci.id));
    persistCart(); updateCartBadge(); renderCart();

    document.getElementById('order-result').innerHTML = `
      <h4>Order Placed</h4>
      <p>Order ID: <strong>${order.id}</strong></p>
      <p>Thank you, ${order.customer.name}! Please check ${order.customer.phone} for delivery confirmation.</p>
      <p><strong>Total: ₱${order.total}</strong></p>
    `;
    checkoutForm.reset();
  });
}

// persist badge on load
updateCartBadge();
renderCart();

// ===== MODAL POPUP =====
const modal = document.getElementById("menu-modal");
const closeModal = document.getElementById("close-modal");
const modalImg = document.getElementById("modal-img");
const modalName = document.getElementById("modal-name");
const modalQuote = document.getElementById("modal-quote");
const modalDesc = document.getElementById("modal-desc");
const modalPrice = document.getElementById("modal-price");
const modalAdd = document.getElementById("modal-add");

let currentItem = null;

// helper to open modal for an item
function openModalForItem(item) {
  if(!item) return;
  currentItem = item;
  if(modalImg) modalImg.src = item.image;
  if(modalName) modalName.textContent = item.name;
  if(modalQuote) modalQuote.textContent = item.quote;
  if(modalDesc) modalDesc.textContent = item.description;
  if(modalPrice) modalPrice.textContent = item.price;
  if(modal) modal.classList.remove("hidden");
}

// When clicking “View” button (delegated)
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("view-btn")) {
    const id = e.target.dataset.id;
    const item = menu.find(m => m.id === id);
    if (!item) return;
    openModalForItem(item);
  }
  // clicking items in home summary (product-card-home)
  if (e.target.closest && e.target.closest('.product-card-home')) {
    const el = e.target.closest('.product-card-home');
    const id = el.dataset.id;
    const item = menu.find(m => m.id === id);
    if(item) openModalForItem(item);
  }
});

// Close modal with × button
if (closeModal) {
  closeModal.addEventListener("click", () => {
    if(modal) modal.classList.add("hidden");
  });
}
// Close when clicking outside modal
window.addEventListener("click", (e) => {
  if (e.target === modal) modal.classList.add("hidden");
});

// Add to cart from modal
if(modalAdd) {
  modalAdd.addEventListener("click", () => {
    if (currentItem) {
      cart.push(cloneItem(currentItem));
      persistCart();
      updateCartBadge();
      alert(`${currentItem.name} added to cart!`);
      if(modal) modal.classList.add("hidden");
    }
  });
}

// ---- HOME product summary rendering (vertical scroll) ----
function renderHomeProducts() {
  const container = document.getElementById('home-products-scroll');
  if(!container) return;
  container.innerHTML = '';
  // pick top items (e.g., first 8)
  const picks = menu.slice(0, 8);
  picks.forEach(item => {
    const card = document.createElement('div');
    card.className = 'product-card product-card-home';
    card.dataset.id = item.id;
    card.innerHTML = `
      <img class="product-img" src="${item.image}" alt="${item.name}" />
      <div class="info-col">
        <span class="meta">HOT COFFEE</span>
        <h3>${item.name}</h3>
        <div class="price">₱${item.price}</div>
      </div>
    `;
    container.appendChild(card);
  });
}

