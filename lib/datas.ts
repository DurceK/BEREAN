// Datas em português, do jeito que aparecem nas telas do mentor

export function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

export function diasDesde(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export function haQuanto(iso: string) {
  const dias = diasDesde(iso);
  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'ontem';
  return `há ${dias} dias`;
}
