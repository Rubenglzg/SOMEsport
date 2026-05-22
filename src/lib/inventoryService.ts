import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, query, where, getDoc } from 'firebase/firestore';
import { db } from './firebase';

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

export const getInventoryItems = async (clubId: string): Promise<InventoryItem[]> => {
  const q = query(collection(db, 'inventory'), where('clubId', '==', clubId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem));
};

export const createInventoryItem = async (clubId: string, item: Omit<InventoryItem, 'id' | 'clubId' | 'updatedAt'>): Promise<InventoryItem> => {
  const data: Omit<InventoryItem, 'id'> = {
    clubId,
    ...item,
    availableQuantity: item.totalQuantity, // Initially all are available
    updatedAt: new Date().toISOString()
  };
  const docRef = await addDoc(collection(db, 'inventory'), data);
  return { id: docRef.id, ...data };
};

export const updateInventoryItem = async (id: string, data: Partial<InventoryItem>): Promise<void> => {
  const docRef = doc(db, 'inventory', id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error('Item not found');
  const current = snap.data() as InventoryItem;

  // If totalQuantity changes, calculate new availableQuantity
  const finalData = { ...data, updatedAt: new Date().toISOString() };
  if (data.totalQuantity !== undefined) {
    const diff = data.totalQuantity - current.totalQuantity;
    finalData.availableQuantity = Math.max(0, current.availableQuantity + diff);
  }

  await updateDoc(docRef, finalData);
};

export const deleteInventoryItem = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'inventory', id));
};

export const getLoansByClub = async (clubId: string): Promise<InventoryLoan[]> => {
  const q = query(collection(db, 'loans'), where('clubId', '==', clubId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as InventoryLoan));
};

export const createLoan = async (
  clubId: string, 
  loan: Omit<InventoryLoan, 'id' | 'clubId' | 'status'>
): Promise<InventoryLoan> => {
  // 1. Get the item and verify available stock
  const itemRef = doc(db, 'inventory', loan.itemId);
  const itemSnap = await getDoc(itemRef);
  if (!itemSnap.exists()) throw new Error('Artículo no encontrado');
  const itemData = itemSnap.data() as InventoryItem;

  if (itemData.availableQuantity < loan.quantity) {
    throw new Error(`Stock insuficiente. Solo quedan ${itemData.availableQuantity} unidades disponibles.`);
  }

  // 2. Subtract quantity from availableQuantity
  await updateDoc(itemRef, {
    availableQuantity: itemData.availableQuantity - loan.quantity,
    updatedAt: new Date().toISOString()
  });

  // 3. Create the loan entry
  const data: Omit<InventoryLoan, 'id'> = {
    clubId,
    ...loan,
    status: 'prestado'
  };

  const docRef = await addDoc(collection(db, 'loans'), data);
  return { id: docRef.id, ...data };
};

export const requestLoan = async (
  clubId: string, 
  loan: Omit<InventoryLoan, 'id' | 'clubId' | 'status'>
): Promise<InventoryLoan> => {
  const data: Omit<InventoryLoan, 'id'> = {
    clubId,
    ...loan,
    status: 'pendiente'
  };
  const docRef = await addDoc(collection(db, 'loans'), data);
  return { id: docRef.id, ...data };
};

export const approveLoan = async (loanId: string): Promise<void> => {
  const loanRef = doc(db, 'loans', loanId);
  const loanSnap = await getDoc(loanRef);
  if (!loanSnap.exists()) throw new Error('Petición de préstamo no encontrada');
  const loanData = loanSnap.data() as InventoryLoan;

  const itemRef = doc(db, 'inventory', loanData.itemId);
  const itemSnap = await getDoc(itemRef);
  if (!itemSnap.exists()) throw new Error('Artículo no encontrado');
  const itemData = itemSnap.data() as InventoryItem;

  if (itemData.availableQuantity < loanData.quantity) {
    throw new Error(`Stock insuficiente. Solo quedan ${itemData.availableQuantity} unidades disponibles.`);
  }

  await updateDoc(itemRef, {
    availableQuantity: itemData.availableQuantity - loanData.quantity,
    updatedAt: new Date().toISOString()
  });

  await updateDoc(loanRef, { status: 'prestado' });
};

export const rejectLoan = async (loanId: string): Promise<void> => {
  const loanRef = doc(db, 'loans', loanId);
  await updateDoc(loanRef, { status: 'denegado' });
};

export const returnLoan = async (loanId: string, itemId: string, quantity: number): Promise<void> => {
  const loanRef = doc(db, 'loans', loanId);
  await updateDoc(loanRef, {
    status: 'devuelto',
    dateReturned: new Date().toISOString().split('T')[0]
  });

  const itemRef = doc(db, 'inventory', itemId);
  const itemSnap = await getDoc(itemRef);
  if (itemSnap.exists()) {
    const itemData = itemSnap.data() as InventoryItem;
    await updateDoc(itemRef, {
      availableQuantity: Math.min(itemData.totalQuantity, itemData.availableQuantity + quantity),
      updatedAt: new Date().toISOString()
    });
  }
};
