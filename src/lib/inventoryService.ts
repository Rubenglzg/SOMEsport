import { supabase } from './supabase';

export interface InventoryItem {
  id?: string;
  clubId: string;
  name: string;
  totalQuantity: number;
  availableQuantity: number;
  minThreshold: number;
  location?: string;
  updatedAt: string;
}

export interface InventoryLoan {
  id?: string;
  clubId: string;
  itemId: string;
  itemName: string;
  coachId: string;
  coachName: string;
  quantity: number;
  dateBorrowed: string;
  status: 'pendiente' | 'prestado' | 'devuelto' | 'denegado';
  dateReturned?: string;
}

const mapRowToItem = (row: any): InventoryItem => ({
  id: row.id,
  clubId: row.club_id,
  name: row.nombre,
  totalQuantity: row.cantidad,
  availableQuantity: row.available_quantity,
  minThreshold: row.min_threshold,
  location: row.location || undefined,
  updatedAt: row.updated_at
});

const mapRowToLoan = (row: any): InventoryLoan => ({
  id: row.id,
  clubId: row.club_id,
  itemId: row.item_id,
  itemName: row.inventory?.nombre || row.item_name || 'Artículo Desconocido',
  coachId: row.coach_id,
  coachName: row.coach_name,
  quantity: row.cantidad,
  dateBorrowed: row.fecha_prestamo,
  status: row.status,
  dateReturned: row.fecha_devolucion || undefined
});

export const getInventoryItems = async (clubId: string): Promise<InventoryItem[]> => {
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .eq('club_id', clubId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching inventory from Supabase:", error);
    return [];
  }

  return (data || []).map(mapRowToItem);
};

export const createInventoryItem = async (
  clubId: string, 
  item: Omit<InventoryItem, 'id' | 'clubId' | 'updatedAt'>
): Promise<InventoryItem> => {
  const now = new Date().toISOString();
  
  const { data, error } = await supabase
    .from('inventory')
    .insert({
      club_id: clubId,
      nombre: item.name,
      cantidad: item.totalQuantity,
      available_quantity: item.totalQuantity, // Initially all are available
      min_threshold: item.minThreshold,
      location: item.location || null,
      updated_at: now,
      created_at: now
    })
    .select('*')
    .single();

  if (error) {
    console.error("Error creating inventory item in Supabase:", error);
    throw error;
  }

  return mapRowToItem(data);
};

export const updateInventoryItem = async (id: string, data: Partial<InventoryItem>): Promise<void> => {
  // 1. Get current item to calculate available quantity changes if total quantity changes
  const { data: current, error: getError } = await supabase
    .from('inventory')
    .select('*')
    .eq('id', id)
    .single();

  if (getError) {
    console.error("Error fetching current inventory item:", getError);
    throw getError;
  }

  const updateData: any = {
    updated_at: new Date().toISOString()
  };

  if (data.name !== undefined) updateData.nombre = data.name;
  if (data.totalQuantity !== undefined) {
    updateData.cantidad = data.totalQuantity;
    const diff = data.totalQuantity - current.cantidad;
    updateData.available_quantity = Math.max(0, current.available_quantity + diff);
  }
  if (data.availableQuantity !== undefined) updateData.available_quantity = data.availableQuantity;
  if (data.minThreshold !== undefined) updateData.min_threshold = data.minThreshold;
  if (data.location !== undefined) updateData.location = data.location || null;

  const { error: updateError } = await supabase
    .from('inventory')
    .update(updateData)
    .eq('id', id);

  if (updateError) {
    console.error("Error updating inventory item in Supabase:", updateError);
    throw updateError;
  }
};

export const deleteInventoryItem = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('inventory')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Error deleting inventory item in Supabase:", error);
    throw error;
  }
};

export const getLoansByClub = async (clubId: string): Promise<InventoryLoan[]> => {
  const { data, error } = await supabase
    .from('inventory_loans')
    .select('*, inventory(nombre)')
    .eq('club_id', clubId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching inventory loans from Supabase:", error);
    return [];
  }

  return (data || []).map(mapRowToLoan);
};

export const createLoan = async (
  clubId: string, 
  loan: Omit<InventoryLoan, 'id' | 'clubId' | 'status'>
): Promise<InventoryLoan> => {
  // 1. Get the item and verify available stock
  const { data: itemData, error: getError } = await supabase
    .from('inventory')
    .select('*')
    .eq('id', loan.itemId)
    .single();

  if (getError) {
    console.error("Error fetching inventory item for loan:", getError);
    throw new Error('Artículo no encontrado');
  }

  if (itemData.available_quantity < loan.quantity) {
    throw new Error(`Stock insuficiente. Solo quedan ${itemData.available_quantity} unidades disponibles.`);
  }

  // 2. Subtract quantity from availableQuantity
  const { error: itemUpdateError } = await supabase
    .from('inventory')
    .update({
      available_quantity: itemData.available_quantity - loan.quantity,
      updated_at: new Date().toISOString()
    })
    .eq('id', loan.itemId);

  if (itemUpdateError) {
    console.error("Error updating inventory stock:", itemUpdateError);
    throw itemUpdateError;
  }

  // 3. Create the loan entry
  const now = new Date().toISOString();
  const { data: inserted, error: loanError } = await supabase
    .from('inventory_loans')
    .insert({
      club_id: clubId,
      item_id: loan.itemId,
      coach_id: loan.coachId,
      coach_name: loan.coachName,
      cantidad: loan.quantity,
      fecha_prestamo: loan.dateBorrowed,
      status: 'prestado',
      created_at: now
    })
    .select('*, inventory(nombre)')
    .single();

  if (loanError) {
    console.error("Error creating inventory loan:", loanError);
    throw loanError;
  }

  return mapRowToLoan(inserted);
};

export const requestLoan = async (
  clubId: string, 
  loan: Omit<InventoryLoan, 'id' | 'clubId' | 'status'>
): Promise<InventoryLoan> => {
  const now = new Date().toISOString();
  const { data: inserted, error: loanError } = await supabase
    .from('inventory_loans')
    .insert({
      club_id: clubId,
      item_id: loan.itemId,
      coach_id: loan.coachId,
      coach_name: loan.coachName,
      cantidad: loan.quantity,
      fecha_prestamo: loan.dateBorrowed,
      status: 'pendiente',
      created_at: now
    })
    .select('*, inventory(nombre)')
    .single();

  if (loanError) {
    console.error("Error requesting inventory loan:", loanError);
    throw loanError;
  }

  return mapRowToLoan(inserted);
};

export const approveLoan = async (loanId: string): Promise<void> => {
  // 1. Get loan details
  const { data: loanData, error: loanGetError } = await supabase
    .from('inventory_loans')
    .select('*')
    .eq('id', loanId)
    .single();

  if (loanGetError) {
    console.error("Error fetching loan details:", loanGetError);
    throw new Error('Petición de préstamo no encontrada');
  }

  // 2. Get item details
  const { data: itemData, error: itemGetError } = await supabase
    .from('inventory')
    .select('*')
    .eq('id', loanData.item_id)
    .single();

  if (itemGetError) {
    console.error("Error fetching item details:", itemGetError);
    throw new Error('Artículo no encontrado');
  }

  if (itemData.available_quantity < loanData.cantidad) {
    throw new Error(`Stock insuficiente. Solo quedan ${itemData.available_quantity} unidades disponibles.`);
  }

  // 3. Update stock
  const { error: itemUpdateError } = await supabase
    .from('inventory')
    .update({
      available_quantity: itemData.available_quantity - loanData.cantidad,
      updated_at: new Date().toISOString()
    })
    .eq('id', loanData.item_id);

  if (itemUpdateError) {
    console.error("Error updating stock during approval:", itemUpdateError);
    throw itemUpdateError;
  }

  // 4. Approve loan
  const { error: loanUpdateError } = await supabase
    .from('inventory_loans')
    .update({ status: 'prestado' })
    .eq('id', loanId);

  if (loanUpdateError) {
    console.error("Error approving loan:", loanUpdateError);
    throw loanUpdateError;
  }
};

export const rejectLoan = async (loanId: string): Promise<void> => {
  const { error } = await supabase
    .from('inventory_loans')
    .update({ status: 'denegado' })
    .eq('id', loanId);

  if (error) {
    console.error("Error rejecting loan:", error);
    throw error;
  }
};

export const returnLoan = async (loanId: string, itemId: string, quantity: number): Promise<void> => {
  const { error: loanError } = await supabase
    .from('inventory_loans')
    .update({
      status: 'devuelto',
      fecha_devolucion: new Date().toISOString().split('T')[0]
    })
    .eq('id', loanId);

  if (loanError) {
    console.error("Error returning inventory loan:", loanError);
    throw loanError;
  }

  // Restore stock
  const { data: itemData, error: itemGetError } = await supabase
    .from('inventory')
    .select('*')
    .eq('id', itemId)
    .single();

  if (!itemGetError && itemData) {
    await supabase
      .from('inventory')
      .update({
        available_quantity: Math.min(itemData.cantidad, itemData.available_quantity + quantity),
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId);
  }
};
