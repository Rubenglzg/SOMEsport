import { db } from './firebase';
import { collection, addDoc, getDocs, updateDoc, doc, query, where, orderBy, getDoc } from 'firebase/firestore';

export interface SupportTicket {
  id?: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: 'club' | 'player' | 'staff';
  clubId?: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
  replies?: TicketReply[];
}

export interface TicketReply {
  authorName: string;
  authorRole: 'admin' | 'user';
  message: string;
  createdAt: string;
}

const COLLECTION_NAME = 'support_tickets';

// Create a new support ticket
export const createTicket = async (ticket: Omit<SupportTicket, 'createdAt' | 'updatedAt' | 'status'>): Promise<string> => {
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...ticket,
    status: 'open',
    createdAt: now,
    updatedAt: now,
    replies: []
  });
  return docRef.id;
};

// Get all tickets (for admin)
export const getAllTickets = async (): Promise<SupportTicket[]> => {
  const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportTicket));
};

// Get tickets for a specific user
export const getUserTickets = async (userId: string): Promise<SupportTicket[]> => {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);
  const tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportTicket));
  return tickets.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

// Get tickets for a specific club (including its players if needed, or just club direct tickets)
export const getClubTickets = async (clubId: string): Promise<SupportTicket[]> => {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('clubId', '==', clubId)
  );
  const snapshot = await getDocs(q);
  const tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportTicket));
  return tickets.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

// Update ticket status
export const updateTicketStatus = async (ticketId: string, status: SupportTicket['status']): Promise<void> => {
  const ticketRef = doc(db, COLLECTION_NAME, ticketId);
  await updateDoc(ticketRef, {
    status,
    updatedAt: new Date().toISOString()
  });
};

// Update ticket priority
export const updateTicketPriority = async (ticketId: string, priority: SupportTicket['priority']): Promise<void> => {
  const ticketRef = doc(db, COLLECTION_NAME, ticketId);
  await updateDoc(ticketRef, {
    priority,
    updatedAt: new Date().toISOString()
  });
};

// Add reply to ticket
export const addTicketReply = async (ticketId: string, reply: TicketReply): Promise<void> => {
  const ticketRef = doc(db, COLLECTION_NAME, ticketId);
  const ticketDoc = await getDoc(ticketRef);
  if (!ticketDoc.exists()) throw new Error('Ticket not found');

  const data = ticketDoc.data() as SupportTicket;
  const currentReplies = data.replies || [];
  
  await updateDoc(ticketRef, {
    replies: [...currentReplies, reply],
    updatedAt: new Date().toISOString()
  });
};
