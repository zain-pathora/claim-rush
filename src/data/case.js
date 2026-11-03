// Maya's case. Everything here is invented for the game: no real people, clinics or firms.
export const CASE = {
  patient: {
    name: 'Maya Reyes', first: 'Maya', dob: '04/12/1991', phone: '(555) 014-2290',
    address: '18 Larkspur Ave, Springfield', weightLb: 158, icon: '👩🏽',
  },
  accident: { date: '10/28/2026', kind: 'Rear-ended at a red light', seat: 'Driver', medPay: false },
  attorney: { name: 'Lena Ortiz', firm: 'Birch & Co. Law', icon: '👩🏻‍💼' },
  order: { exam: 'MRI Lumbar Spine w/o contrast', cpt: '72148', referrer: 'Dr. Sam Patel, DC', bodyPart: 'Lumbar spine' },
  clinic: 'Larkspur Imaging Center',
  radiologist: { name: 'Dr. Iris Wong', group: 'Northside Radiology Group', icon: '👩🏻‍⚕️' },
};

// prescreen answers; flag = needs action before the magnet
export const PRESCREEN = [
  { q: 'Weight', a: '158 lb', flag: false },
  { q: 'Pacemaker or implanted device?', a: 'No', flag: false },
  { q: 'Afraid of small spaces (claustrophobia)?', a: 'Yes, badly', flag: true, why: 'Route to the open MRI' },
  { q: 'Could you be pregnant?', a: 'No', flag: false },
  { q: 'Metal in your body (surgery, shrapnel)?', a: 'No', flag: false },
  { q: 'Wearing metal right now?', a: 'Yes: earrings, hair clip', flag: true, why: 'Remove before entering Zone IV' },
  { q: 'Allergic to contrast dye?', a: 'Not sure', flag: false, why: 'Order is without contrast, so not a blocker' },
];

export const METAL = [
  { i: '🔑', metal: true, n: 'Car keys' }, { i: '📱', metal: true, n: 'Phone' }, { i: '💍', metal: true, n: 'Ring' },
  { i: '⌚', metal: true, n: 'Watch' }, { i: '📎', metal: true, n: 'Hair clip' }, { i: '🪙', metal: true, n: 'Coins' },
  { i: '👓', metal: true, n: 'Glasses' }, { i: '💳', metal: true, n: 'Card (magnetic strip)' },
  { i: '🧦', metal: false, n: 'Socks' }, { i: '🩳', metal: false, n: 'Gown shorts' }, { i: '🧢', metal: false, n: 'Cotton cap' },
];
