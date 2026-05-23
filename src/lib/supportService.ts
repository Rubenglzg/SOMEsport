import { supabase } from './supabase';

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

const mapRowToTicket = (row: any): SupportTicket => ({
  id: row.id,
  userId: row.user_id,
  userName: row.user_name || '',
  userEmail: row.user_email || '',
  userRole: row.user_role || 'player',
  clubId: row.club_id || undefined,
  subject: row.subject,
  description: row.message, // message map to description
  status: row.status,
  priority: row.priority || 'medium',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  replies: row.replies || []
});

// Create a new support ticket
export const createTicket = async (ticket: Omit<SupportTicket, 'createdAt' | 'updatedAt' | 'status'>): Promise<string> => {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('support_tickets')
    .insert({
      user_id: ticket.userId,
      user_name: ticket.userName,
      user_email: ticket.userEmail,
      user_role: ticket.userRole,
      club_id: ticket.clubId || null,
      subject: ticket.subject,
      message: ticket.description,
      status: 'open',
      priority: ticket.priority || 'medium',
      replies: [],
      created_at: now,
      updated_at: now
    })
    .select('id')
    .single();

  if (error) {
    console.error("Error creating ticket in Supabase:", error);
    throw error;
  }

  return data.id;
};

// Get all tickets (for admin)
export const getAllTickets = async (): Promise<SupportTicket[]> => {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching all tickets from Supabase:", error);
    return [];
  }

  return (data || []).map(mapRowToTicket);
};

// Get tickets for a specific user
export const getUserTickets = async (userId: string): Promise<SupportTicket[]> => {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching user tickets from Supabase:", error);
    return [];
  }

  return (data || []).map(mapRowToTicket);
};

// Get tickets for a specific club
export const getClubTickets = async (clubId: string): Promise<SupportTicket[]> => {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('club_id', clubId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching club tickets from Supabase:", error);
    return [];
  }

  return (data || []).map(mapRowToTicket);
};

// Update ticket status
export const updateTicketStatus = async (ticketId: string, status: SupportTicket['status']): Promise<void> => {
  const { error } = await supabase
    .from('support_tickets')
    .update({
      status,
      updated_at: new Date().toISOString()
    })
    .eq('id', ticketId);

  if (error) {
    console.error("Error updating ticket status in Supabase:", error);
    throw error;
  }
};

// Update ticket priority
export const updateTicketPriority = async (ticketId: string, priority: SupportTicket['priority']): Promise<void> => {
  const { error } = await supabase
    .from('support_tickets')
    .update({
      priority,
      updated_at: new Date().toISOString()
    })
    .eq('id', ticketId);

  if (error) {
    console.error("Error updating ticket priority in Supabase:", error);
    throw error;
  }
};

// Add reply to ticket
export const addTicketReply = async (ticketId: string, reply: TicketReply): Promise<void> => {
  // First get current replies
  const { data, error: getError } = await supabase
    .from('support_tickets')
    .select('replies')
    .eq('id', ticketId)
    .single();

  if (getError) {
    console.error("Error fetching ticket replies from Supabase:", getError);
    throw getError;
  }

  const currentReplies = data?.replies || [];
  const updatedReplies = [...currentReplies, reply];

  const { error: updateError } = await supabase
    .from('support_tickets')
    .update({
      replies: updatedReplies,
      updated_at: new Date().toISOString()
    })
    .eq('id', ticketId);

  if (updateError) {
    console.error("Error updating ticket replies in Supabase:", updateError);
    throw updateError;
  }
};
