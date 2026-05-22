import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { doc, updateDoc, serverTimestamp, collection, addDoc, getDocs, query, where, Timestamp } from "firebase/firestore";
import { storage, db } from "./firebase";

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
  // Create a reference to the file in Firebase Storage
  const storageRef = ref(storage, `documents/${clubId}/${userId}/${type}_${Date.now()}_${file.name}`);
  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) onProgress(progress);
      },
      (error) => {
        console.error("Upload failed", error);
        reject(error);
      },
      async () => {
        // Upload completed successfully, now we can get the download URL
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          
          const docData: Omit<PlayerDocument, 'id'> = {
            userId,
            clubId,
            type,
            fileName: file.name,
            url: downloadURL,
            status: 'pending',
            uploadedAt: serverTimestamp(),
          };

          const docRef = await addDoc(collection(db, 'documents'), docData);
          
          resolve({ id: docRef.id, ...docData, uploadedAt: Timestamp.now() } as PlayerDocument);
        } catch (error) {
          reject(error);
        }
      }
    );
  });
};

export const getPlayerDocuments = async (userId: string): Promise<PlayerDocument[]> => {
  const q = query(collection(db, 'documents'), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlayerDocument));
};

export const getClubPendingDocuments = async (clubId: string): Promise<PlayerDocument[]> => {
  const q = query(collection(db, 'documents'), where("clubId", "==", clubId), where("status", "==", "pending"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlayerDocument));
};

export const getClubDocuments = async (clubId: string): Promise<PlayerDocument[]> => {
  const q = query(collection(db, 'documents'), where("clubId", "==", clubId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlayerDocument));
};

export const updateDocumentStatus = async (documentId: string, status: DocumentStatus, notes?: string): Promise<void> => {
  const docRef = doc(db, 'documents', documentId);
  const updateData: any = { status };
  if (notes !== undefined) updateData.notes = notes;
  await updateDoc(docRef, updateData);
};

export const uploadUserProfilePhoto = async (
  userId: string,
  file: File
): Promise<string> => {
  const storageRef = ref(storage, `profiles/${userId}/photo_${Date.now()}_${file.name}`);
  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      null,
      (error) => {
        console.error("Profile photo upload failed", error);
        reject(error);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        } catch (error) {
          reject(error);
        }
      }
    );
  });
};

