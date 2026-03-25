export function formatCopyNumber(num: number): string {
  return String(num).padStart(3, '0');
}

export function formatCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

export function getCopyStatusLabel(status: 'available' | 'reserved' | 'sold'): string {
  const labels: Record<string, string> = {
    available: 'Elérhető',
    reserved: 'Foglalva',
    sold: 'Eladva',
  };
  return labels[status] ?? status;
}
