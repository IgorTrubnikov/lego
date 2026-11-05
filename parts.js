export const categories = [
  { id: 'hair', name: 'Причёски', singular: 'Причёска', icon: '<path d="M4 16C0 8 7 2 12 3c6-1 12 6 8 13l-3-4-2-5-4 3-4-1-1 5Z"/>' },
  { id: 'face', name: 'Лица', singular: 'Лицо', icon: '<rect x="4" y="3" width="16" height="18" rx="6"/><path d="M8 14q4 5 8 0M8 9h1m6 0h1"/>' },
  { id: 'torso', name: 'Одежда', singular: 'Одежда', icon: '<path d="m8 4-6 4 3 5 2-1v9h10v-9l2 1 3-5-6-4q-4 4-8 0Z"/>' },
  { id: 'legs', name: 'Брюки', singular: 'Брюки', icon: '<path d="M6 3h12l2 18h-7l-1-11-1 11H4ZM6 7h12"/>' }
];
export const initialSelection = { hair:'hair-wave',face:'face-smile',torso:'torso-cream',legs:'legs-cream' };
export const money = value => new Intl.NumberFormat('ru-RU').format(value) + ' ₽';
export function totalPrice(selection, parts) { return categories.reduce((sum,c)=>sum+(parts.find(p=>p.id===selection[c.id]&&p.category===c.id)?.price||0),0); }
export function escapeHtml(value) { return String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
export function renderFigure(selection, parts, crop) {
  const views={hair:'155 65 290 255',face:'190 170 220 160',torso:'130 305 340 235',legs:'200 495 200 210'};
  const layers=(crop?[crop]:['legs','torso','face','hair']).map(category=>{
    const part=parts.find(p=>p.id===selection[category]&&p.category===category);
    return part?.image ? `<image href="${escapeHtml(part.image)}" width="600" height="720"/>` : '';
  }).join('');
  return `<svg class="figure-svg" xmlns="http://www.w3.org/2000/svg" viewBox="${crop?views[crop]:'0 0 600 720'}" aria-hidden="true">${layers}</svg>`;
}
