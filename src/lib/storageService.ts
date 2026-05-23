import { supabase } from "./supabase";

export type DocumentType = 'dni' | 'medical' | 'parental' | 'other';
export type DocumentStatus = 'pending' | 'approved' | 'rejected';

export interface PlayerDocument {
  id?: string;
  userId: string;
  clubId: string;
  type: DocumentType;
  fileName: string;
  url: string;
  status: DocumentStatus;
  uploadedAt: any;
  notes?: string;
}

export const uploadPlayerDocument = async (
  userId: string,
  clubId: string,
  file: File,
  type: DocumentType,
  onProgress?: (progress: number) => void
): Promise<PlayerDocument> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${type}_${Date.now()}.${fileExt}`;
  const filePath = `${clubId}/${userId}/${fileName}`;

  // Subir el archivo al bucket 'documents' en Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (uploadError) {
    console.error("Error uploading document file:", uploadError.message);
    throw uploadError;
  }

  // Obtener URL pública
  const { data: { publicUrl } } = supabase.storage
    .from('documents')
    .getPublicUrl(filePath);

  if (onProgress) onProgress(100);

  // Insertar registro en la tabla public.documents
  const { data: dbData, error: dbError } = await supabase
    .from('documents')
    .insert({
      user_id: userId,
      club_id: clubId,
      type,
      file_name: file.name,
      url: publicUrl,
      status: 'pending'
    })
    .select()
    .single();

  if (dbError) {
    console.error("Error inserting document database record:", dbError.message);
    throw dbError;
  }

  return {
    id: dbData.id,
    userId: dbData.user_id,
    clubId: dbData.club_id,
    type: dbData.type as DocumentType,
    fileName: dbData.file_name,
    url: dbData.url,
    status: dbData.status as DocumentStatus,
    uploadedAt: dbData.created_at,
    notes: dbData.notes
  };
};

export const getPlayerDocuments = async (userId: string): Promise<PlayerDocument[]> => {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error("Error getting player documents:", error.message);
    throw error;
  }

  return (data || []).map((dbData: any) => ({
    id: dbData.id,
    userId: dbData.user_id,
    clubId: dbData.club_id,
    type: dbData.type as DocumentType,
    fileName: dbData.file_name,
    url: dbData.url,
    status: dbData.status as DocumentStatus,
    uploadedAt: dbData.created_at,
    notes: dbData.notes
  }));
};

export const getClubPendingDocuments = async (clubId: string): Promise<PlayerDocument[]> => {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('club_id', clubId)
    .eq('status', 'pending');

  if (error) {
    console.error("Error getting club pending documents:", error.message);
    throw error;
  }

  return (data || []).map((dbData: any) => ({
    id: dbData.id,
    userId: dbData.user_id,
    clubId: dbData.club_id,
    type: dbData.type as DocumentType,
    fileName: dbData.file_name,
    url: dbData.url,
    status: dbData.status as DocumentStatus,
    uploadedAt: dbData.created_at,
    notes: dbData.notes
  }));
};

export const getClubDocuments = async (clubId: string): Promise<PlayerDocument[]> => {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('club_id', clubId);

  if (error) {
    console.error("Error getting club documents:", error.message);
    throw error;
  }

  return (data || []).map((dbData: any) => ({
    id: dbData.id,
    userId: dbData.user_id,
    clubId: dbData.club_id,
    type: dbData.type as DocumentType,
    fileName: dbData.file_name,
    url: dbData.url,
    status: dbData.status as DocumentStatus,
    uploadedAt: dbData.created_at,
    notes: dbData.notes
  }));
};

export const updateDocumentStatus = async (documentId: string, status: DocumentStatus, notes?: string): Promise<void> => {
  const updates: any = { status };
  if (notes !== undefined) updates.notes = notes;

  const { error } = await supabase
    .from('documents')
    .update(updates)
    .eq('id', documentId);

  if (error) {
    console.error("Error updating document status:", error.message);
    throw error;
  }
};

export const uploadUserProfilePhoto = async (
  userId: string,
  file: File
): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `profile_${Date.now()}.${fileExt}`;
  const filePath = `${userId}/${fileName}`;

  // Subir la imagen al bucket 'profiles'
  const { error: uploadError } = await supabase.storage
    .from('profiles')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (uploadError) {
    console.error("Error uploading profile photo file:", uploadError.message);
    throw uploadError;
  }

  // Obtener URL pública
  const { data: { publicUrl } } = supabase.storage
    .from('profiles')
    .getPublicUrl(filePath);

  return publicUrl;
};
