export const normalizePhone = (phone: string): string => {
  if (!phone) return '';
  return phone.replace(/[\s\(\)\-\+]/g, '');
}; 