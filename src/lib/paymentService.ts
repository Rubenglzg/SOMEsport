import { supabase } from './supabase';

export interface PaymentRecord {
  id?: string;
  userId: string;
  clubId: string;
  amount: number;
  season: string;
  status: 'paid';
  paidAt: string;
  installmentName?: string; // e.g. "Plazo 1", "Plazo 2", or undefined for full payments
}

export const recordPayment = async (
  userId: string, 
  clubId: string, 
  amount: number, 
  season: string,
  installmentName?: string
): Promise<PaymentRecord> => {
  const concepto = installmentName || 'Cuota mensual / Pago completo';

  const { data, error } = await supabase
    .from('payments')
    .insert({
      player_id: userId,
      club_id: clubId,
      concepto,
      importe: amount,
      estado_pago: 'pagado',
      fecha_vencimiento: new Date().toISOString().split('T')[0]
    })
    .select()
    .single();

  if (error) {
    console.error("Error recording payment:", error.message);
    throw error;
  }

  return {
    id: data.id,
    userId: data.player_id,
    clubId: data.club_id,
    amount: Number(data.importe),
    season,
    status: 'paid',
    paidAt: data.created_at,
    installmentName: data.concepto
  };
};

export const getPlayerPayments = async (userId: string): Promise<PaymentRecord[]> => {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('player_id', userId);

  if (error) {
    console.error("Error getting player payments:", error.message);
    throw error;
  }

  return (data || []).map((p: any) => ({
    id: p.id,
    userId: p.player_id,
    clubId: p.club_id,
    amount: Number(p.importe),
    season: '2025/2026',
    status: 'paid',
    paidAt: p.created_at,
    installmentName: p.concepto
  } as PaymentRecord));
};

export const getClubPayments = async (clubId: string): Promise<PaymentRecord[]> => {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('club_id', clubId);

  if (error) {
    console.error("Error getting club payments:", error.message);
    throw error;
  }

  return (data || []).map((p: any) => ({
    id: p.id,
    userId: p.player_id,
    clubId: p.club_id,
    amount: Number(p.importe),
    season: '2025/2026',
    status: 'paid',
    paidAt: p.created_at,
    installmentName: p.concepto
  } as PaymentRecord));
};

export const getAllPayments = async (): Promise<PaymentRecord[]> => {
  const { data, error } = await supabase
    .from('payments')
    .select('*');

  if (error) {
    console.error("Error getting all payments:", error.message);
    throw error;
  }

  return (data || []).map((p: any) => ({
    id: p.id,
    userId: p.player_id,
    clubId: p.club_id,
    amount: Number(p.importe),
    season: '2025/2026',
    status: 'paid',
    paidAt: p.created_at,
    installmentName: p.concepto
  } as PaymentRecord));
};
