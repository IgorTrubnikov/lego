export const categories = [
  { id: 'hair', name: 'Причёски', singular: 'Причёска', icon: '<path d="M4 16C0 8 7 2 12 3c6-1 12 6 8 13l-3-4-2-5-4 3-4-1-1 5Z"/>' },
  { id: 'face', name: 'Лица', singular: 'Лицо', icon: '<rect x="4" y="3" width="16" height="18" rx="6"/><path d="M8 14q4 5 8 0M8 9h1m6 0h1"/>' },
  { id: 'torso', name: 'Одежда', singular: 'Одежда', icon: '<path d="m8 4-6 4 3 5 2-1v9h10v-9l2 1 3-5-6-4q-4 4-8 0Z"/>' },
  { id: 'legs', name: 'Брюки', singular: 'Брюки', icon: '<path d="M6 3h12l2 18h-7l-1-11-1 11H4ZM6 7h12"/>' },
  { id: 'accessory', name: 'Аксессуары', singular: 'Аксессуар', optional: true, emptyLabel: 'Без аксессуара', icon: '<path d="M5 8h14l2 13H3ZM8 8V6a4 4 0 0 1 8 0v2"/>' },
  { id: 'animal', name: 'Животные', singular: 'Животное', optional: true, emptyLabel: 'Без животного', icon: '<path d="M7 13c-2 2-4 6-1 7s4-1 6-1 3 2 6 1 1-5-1-7q-5-5-10 0Z"/><ellipse cx="4" cy="9" rx="2" ry="3"/><ellipse cx="10" cy="5" rx="2" ry="3"/><ellipse cx="16" cy="5" rx="2" ry="3"/><ellipse cx="21" cy="10" rx="2" ry="3"/>' }
];
export const initialSelection = { hair:'hair-wave',face:'face-smile',torso:'torso-3d-ivory-blazer',legs:'legs-3d-ivory',accessory:'accessory-none',animal:'animal-none' };
// Empty choices are virtual: administrators only add actual images to the folders.
export function withOptionalChoices(parts) {
 return [...categories.filter(c=>c.optional).map(c=>({id:c.id+'-none',category:c.id,name:c.emptyLabel,price:0})),...parts];
}
export const money = value => new Intl.NumberFormat('ru-RU').format(value) + ' ₽';
export function totalPrice(selection, parts) { return categories.reduce((sum,c)=>sum+(parts.find(p=>p.id===selection[c.id]&&p.category===c.id)?.price||0),0); }
export function escapeHtml(value) { return String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
export function renderFigure(selection, parts, crop) {
  const views={hair:'155 65 290 255',face:'190 170 220 160',torso:'125 280 350 270',legs:'200 445 200 250',accessory:'15 405 150 290',animal:'430 435 170 265'};
  const layers=(crop?[crop]:['legs','torso','face','hair','accessory','animal']).map(category=>{
    const part=parts.find(p=>p.id===selection[category]&&p.category===category);
    return part?.image ? `<image href="${escapeHtml(part.image)}" width="600" height="720" data-layer="${category}"/>` : '';
  }).join('');
  return `<svg class="figure-svg" xmlns="http://www.w3.org/2000/svg" viewBox="${crop?views[crop]:'0 0 600 720'}" aria-hidden="true">${layers}</svg>`;
}
