(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),t.credentials=e.crossOrigin===`use-credentials`?`include`:e.crossOrigin===`anonymous`?`omit`:`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e={brandName:`Siomay Online`,whatsappNumber:`628XXXXXXXXXX`,whatsappBaseUrl:`https://wa.me/`,defaultOrderMessage:`Halo Siomay Online, saya ingin pesan siomay fresh untuk diantar.`},t=[{id:`siomay-original`,name:`Siomay Original`,price:15e3,desc:`Siomay lembut dengan siraman bumbu kacang khas dan kecap manis gurih.`,image:`/images/menu-original.jpg`,badge:`Paling Populer`,portion:`Porsi Mantap`,rating:4.9},{id:`siomay-komplit`,name:`Siomay Komplit`,price:25e3,desc:`Siomay, tahu, kentang, telur, dan bumbu kacang khas yang melimpah.`,image:`/images/menu-komplit.jpg`,badge:`BEST SELLER`,isBestSeller:!0,portion:`Paling Lengkap`,rating:4.9},{id:`batagor`,name:`Batagor`,price:15e3,desc:`Batagor renyah keemasan dengan adonan gurih dan bumbu kacang kental.`,image:`/images/menu-batagor.jpg`,portion:`Crispy & Gurih`,rating:4.8},{id:`tahu`,name:`Tahu`,price:12e3,desc:`Tahu lembut isi adonan ikan tenggiri gurih kukus hangat kaya rasa.`,image:`/images/menu-tahu.jpg`,portion:`Kukus Hangat`,rating:4.8},{id:`kentang`,name:`Kentang`,price:12e3,desc:`Kentang kukus pulen empuk disiram bumbu kacang gurih dan jeruk limau.`,image:`/images/menu-kentang.jpg`,portion:`Pulen & Empuk`,rating:4.7},{id:`paket-hemat`,name:`Paket Hemat`,price:35e3,desc:`Kombinasi siomay, batagor, tahu & telur untuk santap puas bersama teman atau keluarga.`,image:`/images/menu-paket-hemat.jpg`,badge:`Paling Hemat`,portion:`Porsi Kenyang`,rating:4.9}];function n(e){return`Rp`+Math.round(Number(e)||0).toLocaleString(`id-ID`)}function r(e){return t.find(t=>t.id===e)||null}var i=`siomay-cart`,a=o();function o(){if(typeof window>`u`||typeof localStorage>`u`)return[];try{let e=localStorage.getItem(i);if(!e)return[];let t=JSON.parse(e);if(Array.isArray(t))return t.filter(e=>e&&typeof e.id==`string`&&typeof e.quantity==`number`&&e.quantity>0&&r(e.id))}catch(e){console.warn(`Gagal memuat keranjang dari localStorage:`,e)}return[]}function s(){if(typeof window<`u`&&typeof localStorage<`u`)try{localStorage.setItem(i,JSON.stringify(a))}catch(e){console.warn(`Gagal menyimpan keranjang ke localStorage:`,e)}}function c(){let e=0,t=0,n=[];return a.forEach(i=>{let a=r(i.id);if(a){let r=a.price*i.quantity;e+=i.quantity,t+=r,n.push({id:a.id,product:a,quantity:i.quantity,subtotal:r})}}),{items:n,itemCount:e,subtotal:t,total:t}}function l(e,t=1){if(!r(e))return;let n=a.findIndex(t=>t.id===e);n>=0?a[n].quantity+=t:a.push({id:e,quantity:Math.max(1,t)}),s(),y(),_(e)}function u(e,t){let n=a.findIndex(t=>t.id===e);if(n===-1)return;let r=a[n].quantity+t;r<=0?a.splice(n,1):a[n].quantity=r,s(),y()}function d(e){a=a.filter(t=>t.id!==e),s(),y()}function f(){return e.whatsappNumber.replace(/[^0-9A-Za-z]/g,``)}function p(){let t=f();return`${e.whatsappBaseUrl}${t}`}function m(t,r){let i=`Halo ${e.brandName} 👋\n\n`;return i+=`Saya ingin melakukan pemesanan:

`,t.items.forEach((e,t)=>{i+=`${t+1}. ${e.product.name}\n`,i+=`   ${e.quantity} x ${n(e.product.price)} = ${n(e.subtotal)}\n\n`}),i+=`----------------

`,i+=`Total: ${n(t.total)}\n\n`,i+=`Nama:\n${r.name}\n\n`,i+=`No. WhatsApp:\n${r.phone}\n\n`,i+=`Alamat:\n${r.address}\n\n`,r.note&&r.note.trim()&&(i+=`Catatan:\n${r.note.trim()}\n\n`),i+=`Terima kasih.`,i}function h(t,n){let r=m(t,n),i=f();return`${e.whatsappBaseUrl}${i}?text=${encodeURIComponent(r)}`}typeof document<`u`&&document.addEventListener(`DOMContentLoaded`,()=>{g(),v(),y(),T(),E(),D(),k(),O()});function g(){let e=document.getElementById(`menuGrid`);e&&(e.innerHTML=t.map((e,t)=>{let r=e.isBestSeller?`menu-card-highlight`:``,i=t%3==1?`delay-1`:t%3==2?`delay-2`:``,a=``;if(e.badge){let t=`badge-clean`;e.isBestSeller?t=`badge-bestseller`:e.badge.toLowerCase().includes(`hemat`)&&(t=`badge-savings`),a=`<span class="menu-badge ${t}">${e.badge}</span>`}return`
      <article class="menu-card ${r} reveal-on-scroll ${i}" data-product-card-id="${e.id}">
        <div class="menu-card-image-wrap">
          ${a}
          <img 
            src="${e.image}" 
            alt="${e.name} — ${e.desc}" 
            class="menu-card-image"
            loading="lazy"
            width="400" 
            height="300"
          >
        </div>
        <div class="menu-card-body">
          <div class="menu-card-meta">
            <span class="menu-rating">★ ${e.rating||`4.9`}</span>
            <span class="menu-meta-sep">•</span>
            <span class="menu-portion">${e.portion||`Porsi Mantap`}</span>
          </div>
          <h3 class="menu-card-title">${e.name}</h3>
          <p class="menu-card-desc">${e.desc}</p>
          <div class="menu-card-footer">
            <div class="menu-card-price">
              <span class="price-label">Harga</span>
              <span class="price-amount">${n(e.price)}</span>
            </div>
            <button 
              type="button"
              class="btn-order-item ${e.isBestSeller?`btn-order-primary`:``}" 
              data-add-to-cart="${e.id}"
              aria-label="Tambah ${e.name} seharga ${n(e.price)}"
            >
              <span class="btn-order-icon" aria-hidden="true">+</span>
              <span class="btn-order-text">Tambah</span>
            </button>
          </div>
        </div>
      </article>
    `}).join(``),e.querySelectorAll(`[data-add-to-cart]`).forEach(e=>{e.addEventListener(`click`,t=>{t.preventDefault(),l(e.getAttribute(`data-add-to-cart`),1)})}))}function _(e){let t=document.querySelector(`[data-add-to-cart="${e}"]`);if(!t)return;let n=t.querySelector(`.btn-order-text`),r=t.querySelector(`.btn-order-icon`),i=n?n.textContent:`Tambah`,a=r?r.textContent:`+`;n&&(n.textContent=`Ditambahkan`),r&&(r.textContent=`✓`),t.classList.add(`btn-added-feedback`),document.querySelectorAll(`.cart-badge`).forEach(e=>{e.classList.remove(`badge-bump`),e.offsetWidth,e.classList.add(`badge-bump`)}),setTimeout(()=>{n&&(n.textContent=i),r&&(r.textContent=a),t.classList.remove(`btn-added-feedback`)},1100)}function v(){let e=document.getElementById(`openCartBtn`),t=document.getElementById(`mobileNavCartBtn`),n=document.getElementById(`stickyViewCartBtn`),r=document.getElementById(`closeCartBtn`),i=document.getElementById(`cartOverlay`),a=document.getElementById(`cartDrawer`),o=document.getElementById(`submitOrderBtn`),s=document.getElementById(`btnBackToOrder`),c=document.getElementById(`btnReopenWa`),l=()=>{a&&(a.classList.add(`open`),i&&i.classList.add(`open`),document.body.style.overflow=`hidden`,a.focus())},u=()=>{a&&(a.classList.remove(`open`),i&&i.classList.remove(`open`),document.body.style.overflow=``)};e&&e.addEventListener(`click`,l),t&&t.addEventListener(`click`,()=>{let e=document.getElementById(`mobileNav`);if(e&&e.classList.contains(`open`)){let e=document.getElementById(`hamburgerBtn`);e&&e.click()}l()}),n&&n.addEventListener(`click`,l),r&&r.addEventListener(`click`,u),i&&i.addEventListener(`click`,u),document.addEventListener(`keydown`,e=>{e.key===`Escape`&&a&&a.classList.contains(`open`)&&u()}),o&&o.addEventListener(`click`,x),s&&s.addEventListener(`click`,()=>{let e=document.getElementById(`cartSuccessView`),t=document.getElementById(`cartCustomerSection`),n=document.getElementById(`cartItemsList`),r=document.getElementById(`cartDrawerFooter`);e&&(e.style.display=`none`),t&&(t.style.display=`block`),n&&(n.style.display=`flex`),r&&(r.style.display=`block`)}),c&&c.addEventListener(`click`,()=>{let e=c.getAttribute(`data-last-wa-url`);e&&window.open(e,`_blank`,`noopener,noreferrer`)}),[`customerName`,`customerPhone`,`customerAddress`].forEach(e=>{let t=document.getElementById(e);t&&t.addEventListener(`input`,()=>{C(),t.classList.remove(`input-error`)})})}function y(){let e=c();document.querySelectorAll(`.cart-badge`).forEach(t=>{t.textContent=e.itemCount,e.itemCount>0?t.classList.add(`has-items`):t.classList.remove(`has-items`)});let t=document.getElementById(`drawerCartCount`);t&&(t.textContent=`${e.itemCount} item`);let r=document.getElementById(`summarySubtotal`),i=document.getElementById(`summaryTotal`);r&&(r.textContent=n(e.subtotal)),i&&(i.textContent=n(e.total));let a=document.getElementById(`mobileStickyOrder`),o=document.getElementById(`stickyCount`),s=document.getElementById(`stickyTotal`);a&&o&&s&&(e.itemCount>0?(a.classList.add(`visible`),o.textContent=`${e.itemCount} item`,s.textContent=n(e.total)):a.classList.remove(`visible`)),b(e)}function b(e){let t=document.getElementById(`cartItemsList`),r=document.getElementById(`cartCustomerSection`),i=document.getElementById(`cartDrawerFooter`),a=document.getElementById(`cartSuccessView`);if(t){if(a&&a.style.display===`block`&&e.itemCount===0&&(a.style.display=`none`),e.itemCount===0){t.innerHTML=`
      <div class="cart-empty-state">
        <div class="empty-icon" aria-hidden="true">🥟</div>
        <h3 class="empty-title">Keranjang Belanja Masih Kosong</h3>
        <p class="empty-desc">Pilih menu favoritmu dan rasakan gurihnya siomay fresh bumbu kacang khas kami.</p>
        <button type="button" class="btn btn-secondary btn-sm" id="btnExploreMenu">Lihat Menu Favorit</button>
      </div>
    `;let e=document.getElementById(`btnExploreMenu`);e&&e.addEventListener(`click`,()=>{let e=document.getElementById(`closeCartBtn`);e&&e.click();let t=document.getElementById(`menu`);t&&t.scrollIntoView({behavior:`smooth`})}),r&&(r.style.display=`none`),i&&(i.style.display=`none`)}else r&&(!a||a.style.display!==`block`)&&(r.style.display=`block`),i&&(!a||a.style.display!==`block`)&&(i.style.display=`block`),t.innerHTML=e.items.map(e=>`
      <div class="cart-item" data-cart-item-id="${e.id}">
        <img src="${e.product.image}" alt="${e.product.name}" class="cart-item-img" width="64" height="64">
        <div class="cart-item-details">
          <div class="cart-item-top">
            <h4 class="cart-item-name">${e.product.name}</h4>
            <button 
              type="button" 
              class="cart-item-remove" 
              data-remove-item="${e.id}"
              aria-label="Hapus ${e.product.name} dari keranjang"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <div class="cart-item-unit-price">${n(e.product.price)}</div>
          <div class="cart-item-bottom">
            <div class="cart-item-qty-control" role="group" aria-label="Kuantitas ${e.product.name}">
              <button 
                type="button" 
                class="qty-btn" 
                data-qty-action="decrease" 
                data-qty-id="${e.id}"
                aria-label="Kurangi 1 ${e.product.name}"
              >−</button>
              <span class="qty-count" aria-live="polite">${e.quantity}</span>
              <button 
                type="button" 
                class="qty-btn" 
                data-qty-action="increase" 
                data-qty-id="${e.id}"
                aria-label="Tambah 1 ${e.product.name}"
              >+</button>
            </div>
            <div class="cart-item-subtotal">${n(e.subtotal)}</div>
          </div>
        </div>
      </div>
    `).join(``),t.querySelectorAll(`[data-qty-action]`).forEach(e=>{e.addEventListener(`click`,()=>{let t=e.getAttribute(`data-qty-id`),n=e.getAttribute(`data-qty-action`);n===`increase`&&u(t,1),n===`decrease`&&u(t,-1)})}),t.querySelectorAll(`[data-remove-item]`).forEach(e=>{e.addEventListener(`click`,()=>{d(e.getAttribute(`data-remove-item`))})})}}function x(e){e&&e.preventDefault();let t=c();if(t.itemCount===0){S(`Keranjang belanja kamu masih kosong. Silakan pilih menu terlebih dahulu.`);return}let n=document.getElementById(`customerName`),r=document.getElementById(`customerPhone`),i=document.getElementById(`customerAddress`),a=document.getElementById(`customerNote`),o=n?n.value.trim():``,s=r?r.value.trim():``,l=i?i.value.trim():``,u=a?a.value.trim():``;if(!o){S(`Nama kamu belum diisi.`),n&&(n.classList.add(`input-error`),n.focus());return}if(!s){S(`Nomor WhatsApp kamu belum diisi.`),r&&(r.classList.add(`input-error`),r.focus());return}if(s.replace(/[^0-9]/g,``).length<8){S(`Format nomor WhatsApp belum lengkap (minimal 8 angka).`),r&&(r.classList.add(`input-error`),r.focus());return}if(!l){S(`Alamat lengkap pengantaran belum diisi.`),i&&(i.classList.add(`input-error`),i.focus());return}C();let d=h(t,{name:o,phone:s,address:l,note:u});w(d),window.open(d,`_blank`,`noopener,noreferrer`)}function S(e){let t=document.getElementById(`formErrorAlert`);t&&(t.textContent=e,t.style.display=`block`,t.scrollIntoView({behavior:`smooth`,block:`nearest`}))}function C(){let e=document.getElementById(`formErrorAlert`);e&&(e.textContent=``,e.style.display=`none`)}function w(e){let t=document.getElementById(`cartCustomerSection`),n=document.getElementById(`cartItemsList`),r=document.getElementById(`cartDrawerFooter`),i=document.getElementById(`cartSuccessView`),a=document.getElementById(`btnReopenWa`);t&&(t.style.display=`none`),n&&(n.style.display=`none`),r&&(r.style.display=`none`),i&&(i.style.display=`block`,i.scrollIntoView({behavior:`smooth`})),a&&a.setAttribute(`data-last-wa-url`,e)}function T(){let t=document.querySelectorAll(`[data-cta="whatsapp-general"]`),n=`${p()}?text=${encodeURIComponent(e.defaultOrderMessage)}`;t.forEach(e=>{e.setAttribute(`href`,n),e.setAttribute(`target`,`_blank`),e.setAttribute(`rel`,`noopener noreferrer`)})}function E(){let e=document.querySelector(`.navbar`);if(!e)return;let t=!1,n=()=>{t||=(window.requestAnimationFrame(()=>{window.scrollY>20?e.classList.add(`scrolled`):e.classList.remove(`scrolled`),t=!1}),!0)};window.addEventListener(`scroll`,n,{passive:!0}),n()}function D(){let e=document.getElementById(`hamburgerBtn`),t=document.getElementById(`mobileNav`),n=document.querySelectorAll(`.mobile-nav-link`);if(!e||!t)return;let r=()=>{let n=e.classList.toggle(`active`);t.classList.toggle(`open`),e.setAttribute(`aria-expanded`,n),document.body.style.overflow=n?`hidden`:``};e.addEventListener(`click`,r),n.forEach(e=>{e.addEventListener(`click`,()=>{t.classList.contains(`open`)&&r()})}),document.addEventListener(`keydown`,e=>{e.key===`Escape`&&t.classList.contains(`open`)&&r()})}function O(){let e=document.querySelectorAll(`.reveal-on-scroll`);if(!(`IntersectionObserver`in window)){e.forEach(e=>e.classList.add(`revealed`));return}let t=new IntersectionObserver((e,t)=>{e.forEach(e=>{e.isIntersecting&&(e.target.classList.add(`revealed`),t.unobserve(e.target))})},{root:null,rootMargin:`0px 0px -40px 0px`,threshold:.1});e.forEach(e=>t.observe(e))}function k(){let e=document.querySelectorAll(`section[id]`),t=document.querySelectorAll(`.nav-menu .nav-link`);e.length&&t.length&&window.addEventListener(`scroll`,()=>{let n=window.scrollY+120;e.forEach(e=>{let r=e.offsetTop,i=e.offsetHeight,a=e.getAttribute(`id`);n>=r&&n<r+i&&t.forEach(e=>{e.classList.remove(`active`),e.getAttribute(`href`)===`#${a}`&&e.classList.add(`active`)})})},{passive:!0})}