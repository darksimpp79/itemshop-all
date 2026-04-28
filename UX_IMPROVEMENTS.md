# 🎨 UI/UX IMPROVEMENTS - Kompleksowy Plan

## 📍 ADMIN HUB (`/admin/page.tsx`)

### 1️⃣ **Empty States** - Kiedy brak serwerów
```tsx
// ✅ PRZED: Po prostu pusty grid
// ❌ Słaba UX - user nie wie co dalej

// ✅ PO:
<div className="flex flex-col items-center justify-center py-16 px-6 text-center">
  <div className="text-5xl mb-4">🏰</div>
  <h2 className="text-xl font-black mb-2">Twoja przygoda zaczyna się tutaj!</h2>
  <p className="text-gray-400 mb-8 max-w-sm">
    Utwórz swój pierwszy sklep i zacznij zarabiać. To zajmie zaledwie 30 sekund.
  </p>
  <button className="px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-black uppercase text-xs tracking-widest transition-all shadow-lg shadow-blue-600/20">
    ➕ Stwórz Pierwszy Sklep
  </button>
</div>
```

### 2️⃣ **Onboarding Badges** - Status czeklista
```tsx
// ✅ Pokazuj co user zrobił
<div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-500/20 rounded-3xl p-6">
  <div className="flex items-center justify-between mb-4">
    <h3 className="font-black text-blue-400 uppercase text-xs">🚀 Setup Progress</h3>
    <span className="text-xs font-black text-gray-500">{completedTasks}/5</span>
  </div>
  <div className="space-y-3">
    {[
      { id: 'profile', icon: '👤', label: 'Profil uzupełniony', done: !!profile?.firstName },
      { id: 'shop', icon: '🏪', label: 'Sklep utworzony', done: shops.length > 0 },
      { id: 'products', icon: '📦', label: 'Produkty dodane', done: false },
      { id: 'domain', icon: '🌐', label: 'Domena ustawiona', done: false },
      { id: 'pro', icon: '💎', label: 'Plan PRO aktywny', done: userPlan === 'PRO' },
    ].map(task => (
      <div key={task.id} className="flex items-center gap-3">
        <input type="checkbox" checked={task.done} disabled 
          className="w-5 h-5 rounded accent-blue-500 cursor-not-allowed" />
        <span className={`text-sm font-bold ${task.done ? 'text-green-400' : 'text-gray-500'}`}>
          {task.icon} {task.label}
        </span>
      </div>
    ))}
  </div>
</div>
```

### 3️⃣ **Quick Stats Bar** - Na topie
```tsx
// ✅ Szybki overview
<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
  {[
    { label: 'Serwery', value: shops.length, icon: '🎮' },
    { label: 'Plan', value: userPlan, icon: '✨' },
    { label: '2FA', value: profile?.twoFactorEnabled ? 'On' : 'Off', icon: '🔐' },
    { label: 'Email', value: profile?.emailVerified ? 'Verified' : 'Pending', icon: '📧' },
  ].map(stat => (
    <div key={stat.label} className="bg-[#0C0E16] border border-white/5 rounded-2xl p-4">
      <div className="text-2xl mb-2">{stat.icon}</div>
      <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">{stat.label}</p>
      <p className="text-lg font-black">{stat.value}</p>
    </div>
  ))}
</div>
```

### 4️⃣ **Better Form Validation** - Profile form
```tsx
// ✅ Real-time validation with feedback
const [errors, setErrors] = useState<Record<string, string>>({});

const validatePhone = (phone: string): string | null => {
  if (!phone) return null;
  if (!/^[\d\s+\-()]{9,}$/.test(phone)) return "Wpisz prawidłowy numer";
  return null;
};

const handlePhoneChange = (e: string) => {
  setEditPhone(e);
  const err = validatePhone(e);
  setErrors(p => ({ ...p, phone: err || '' }));
};

// In JSX:
<div>
  <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-2">
    Numer Telefonu
    {editPhone && (
      <span className={`ml-2 text-[9px] ${errors.phone ? 'text-red-400' : 'text-green-400'}`}>
        {errors.phone ? '✗ ' + errors.phone : '✓ Prawidłowy'}
      </span>
    )}
  </label>
  <input 
    type="tel" 
    placeholder="+48 123 456 789" 
    value={editPhone} 
    onChange={e => handlePhoneChange(e.target.value)}
    className={`w-full px-5 py-4 rounded-xl bg-[#08090D] border outline-none focus:border-blue-500 font-bold transition-all
      ${errors.phone ? 'border-red-500/50 focus:border-red-500' : 'border-white/5 focus:border-blue-500'}`} 
  />
</div>
```

### 5️⃣ **Help Tooltips** - Na najważniejszych polach
```tsx
// ✅ Custom Tooltip component
function Tooltip({ children, text }: { children: React.ReactNode; text: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-block" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#131620] text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap z-50 border border-white/10 shadow-xl">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#131620]"></div>
        </div>
      )}
    </div>
  );
}

// Usage:
<Tooltip text="2-factor auth chroni Twoje konto">
  <span className="text-[10px] font-black uppercase px-3 py-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 cursor-help">
    2FA {profile?.twoFactorEnabled ? "✓ On" : "Off"}
  </span>
</Tooltip>
```

---

## 🛍️ SHOP PANEL (`/admin/shop/[shopId]/page.tsx`)

### 6️⃣ **Breadcrumbs** - Zawsze wiadomo gdzie jestem
```tsx
// ✅ Sticky header z breadcrumbs
<div className="sticky top-0 z-40 bg-[#08090D] border-b border-white/5 px-6 py-4">
  <div className="flex items-center justify-between mb-4">
    <nav className="flex items-center gap-2 text-xs text-gray-500">
      <button onClick={() => router.push('/admin')} className="hover:text-white transition-colors">
        Admin
      </button>
      <span>/</span>
      <span className="text-white font-bold">{activeShopName}</span>
      {activeTab !== 'dashboard' && (
        <>
          <span>/</span>
          <span className="text-white capitalize font-bold">{activeTab}</span>
        </>
      )}
    </nav>
    
    <button onClick={() => setActiveTab('settings')} className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-all">
      ⚙️ Ustawienia
    </button>
  </div>
</div>
```

### 7️⃣ **Loading States** - Micro animations
```tsx
// ✅ Better loading skeleton
function LoadingCard() {
  return (
    <div className="bg-[#0B0D13] rounded-[32px] p-6 space-y-4">
      <div className="h-8 bg-white/5 rounded-lg animate-pulse"></div>
      <div className="h-20 bg-white/5 rounded-lg animate-pulse"></div>
      <div className="h-6 bg-white/5 rounded-lg w-2/3 animate-pulse"></div>
    </div>
  );
}

// Usage gdy fetchuje:
{shopProducts.length === 0 && isLoadingProducts ? (
  <div className="grid grid-cols-3 gap-6">
    {[1,2,3].map(i => <LoadingCard key={i} />)}
  </div>
) : shopProducts.length === 0 ? (
  <EmptyState />
) : (
  <DraggableProductList {...props} />
)}
```

### 8️⃣ **Tab Navigation** - Sticky na sidebar
```tsx
// ✅ Better tab switching
<div className="space-y-1">
  {[
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'products', icon: '📦', label: 'Produkty' },
    { id: 'orders', icon: '🛒', label: 'Zamówienia' },
    { id: 'modes', icon: '🎮', label: 'Tryby' },
    { id: 'lootbox', icon: '🎁', label: 'Lootboxy' },
    { id: 'settings', icon: '⚙️', label: 'Ustawienia' },
  ].map(tab => (
    <button
      key={tab.id}
      onClick={() => setActiveTab(tab.id)}
      className={`w-full px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-widest transition-all flex items-center gap-3
        ${activeTab === tab.id 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
          : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
    >
      <span>{tab.icon}</span>
      <span className="hidden lg:inline">{tab.label}</span>
      {tab.id === 'orders' && orders.filter(o => !o.claimed).length > 0 && (
        <span className="ml-auto bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black">
          {orders.filter(o => !o.claimed).length}
        </span>
      )}
    </button>
  ))}
</div>
```

### 9️⃣ **Empty States** - Po dla każdej sekcji
```tsx
// ✅ Products empty state
function EmptyProductsState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="text-6xl mb-4">📦</div>
      <h3 className="text-2xl font-black mb-2">Brak produktów</h3>
      <p className="text-gray-400 mb-8 max-w-sm">
        Dodaj swój pierwszy produkt i zacznij zarabiać. Możesz dodać tyle produktów ile chcesz!
      </p>
      <button onClick={() => setActiveTab('products')} className="px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-black uppercase text-xs tracking-widest transition-all">
        ➕ Dodaj Produkt
      </button>
    </div>
  );
}
```

### 🔟 **Keyboard Shortcuts** - Productivity boost
```tsx
// ✅ Add to root component
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Cmd/Ctrl + S — Save current form
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (activeTab === 'products' && prodName) handleAddProduct();
      if (activeTab === 'settings') handleSaveSettings();
    }
    
    // Cmd/Ctrl + K — Search products/orders
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      document.getElementById('search-input')?.focus();
    }
    
    // Escape — Close modals
    if (e.key === 'Escape') {
      setConfirm(p => ({ ...p, open: false }));
      setCodeModal(p => ({ ...p, open: false }));
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [activeTab, prodName]);

// Visual indicator
<div className="text-[8px] text-gray-600 absolute top-2 right-2">Cmd+S</div>
```

### 1️⃣1️⃣ **Better Form Modals** - Con contextual help
```tsx
// ✅ Product add modal z validation
function ProductForm({ onSave, isLoading }: any) {
  const [local, setLocal] = useState({ name: '', price: '', mode: '' });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  
  const errors = {
    name: !local.name ? 'Wpisz nazwę produktu' : local.name.length > 100 ? 'Zbyt długa nazwa (max 100)' : '',
    price: !local.price ? 'Wpisz cenę' : isNaN(Number(local.price)) ? 'Musi być liczbą' : Number(local.price) < 0.01 ? 'Min 0.01 PLN' : '',
    mode: !local.mode ? 'Wybierz tryb gry' : '',
  };
  
  const isValid = !Object.values(errors).some(e => e);
  
  return (
    <div className="space-y-5">
      {/* NAME */}
      <div>
        <label className="text-xs font-bold text-gray-400 uppercase mb-2 block flex justify-between">
          <span>Nazwa Produktu</span>
          {touched.name && (
            <span className={errors.name ? 'text-red-400' : 'text-green-400'}>
              {errors.name || '✓'}
            </span>
          )}
        </label>
        <input
          type="text"
          placeholder="np. Skin Premium"
          value={local.name}
          onChange={e => setLocal(p => ({ ...p, name: e.target.value }))}
          onBlur={() => setTouched(p => ({ ...p, name: true }))}
          className={`w-full px-4 py-3 rounded-xl bg-[#0B0D13] border outline-none focus:border-blue-500 transition-all font-bold
            ${touched.name && errors.name ? 'border-red-500/50' : 'border-white/5'}`}
        />
        {touched.name && errors.name && (
          <p className="text-xs text-red-400 mt-1">⚠️ {errors.name}</p>
        )}
      </div>
      
      {/* PRICE */}
      <div>
        <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Cena (PLN)</label>
        <input
          type="number"
          placeholder="0.00"
          value={local.price}
          onChange={e => setLocal(p => ({ ...p, price: e.target.value }))}
          className={`w-full px-4 py-3 rounded-xl bg-[#0B0D13] border border-white/5 outline-none focus:border-blue-500 transition-all font-bold`}
        />
      </div>
      
      {/* MODE */}
      <div>
        <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Tryb Gry</label>
        <select
          value={local.mode}
          onChange={e => setLocal(p => ({ ...p, mode: e.target.value }))}
          className="w-full px-4 py-3 rounded-xl bg-[#0B0D13] border border-white/5 outline-none focus:border-blue-500 transition-all font-bold text-white"
        >
          <option value="">Wybierz tryb...</option>
          {shopModes.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
        </select>
      </div>
      
      {/* SUBMIT */}
      <button
        onClick={() => onSave(local)}
        disabled={!isValid || isLoading}
        className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl font-black uppercase text-xs tracking-widest transition-all"
      >
        {isLoading ? '⏳ Zapisywanie...' : '💾 Dodaj Produkt'}
      </button>
    </div>
  );
}
```

### 1️⃣2️⃣ **Smart Search** - Command palette style
```tsx
// ✅ Global search na topie
const [searchOpen, setSearchOpen] = useState(false);
const [searchQuery, setSearchQuery] = useState('');

const searchResults = {
  products: shopProducts.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 3),
  orders: orders.filter(o => o.playerName.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 3),
};

return (
  <>
    {/* SEARCH BOX */}
    <div className="sticky top-0 z-50 px-6 py-4 bg-[#08090D] border-b border-white/5">
      <div className="relative">
        <input
          id="search-input"
          type="text"
          placeholder="Szukaj produktów, zamówień... (Cmd+K)"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onFocus={() => setSearchOpen(true)}
          className="w-full px-4 py-3 rounded-xl bg-[#0C0E16] border border-white/5 outline-none focus:border-blue-500 text-white placeholder-gray-600"
        />
        {searchOpen && searchQuery && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#0C0E16] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
            {searchResults.products.length > 0 && (
              <div className="border-b border-white/5">
                <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase">Produkty</div>
                {searchResults.products.map(p => (
                  <button key={p.id} onClick={() => { setSearchQuery(''); setActiveTab('products'); }} className="w-full px-4 py-2 text-left hover:bg-white/5 text-sm font-bold">
                    {p.name} → {p.price} PLN
                  </button>
                ))}
              </div>
            )}
            {searchResults.orders.length > 0 && (
              <div>
                <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase">Zamówienia</div>
                {searchResults.orders.map(o => (
                  <button key={o.id} onClick={() => { setSearchQuery(''); setActiveTab('orders'); }} className="w-full px-4 py-2 text-left hover:bg-white/5 text-sm font-bold">
                    {o.playerName} → {o.itemName}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  </>
);
```

---

## 📋 Implementation Checklist

- [ ] Empty states na obu ekranach
- [ ] Onboarding checklist na hub'ach
- [ ] Help tooltips
- [ ] Real-time form validation
- [ ] Breadcrumbs na shop page
- [ ] Better loading states
- [ ] Keyboard shortcuts (Cmd+S, Cmd+K, Esc)
- [ ] Tab navigation z unread badges
- [ ] Global search
- [ ] Better modals z validation
- [ ] Visual feedback (hover, animations)

