import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

admin.initializeApp();

// Función para eliminar un usuario de Auth y Firestore
export const deleteUserAccountV2 = onCall(async (request) => {
  // Verificar que el usuario está autenticado
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debes estar autenticado para realizar esta acción.');
  }

  const { uid } = request.data;
  if (!uid) {
    throw new HttpsError('invalid-argument', 'El UID es requerido.');
  }

  try {
    const callerUid = request.auth.uid;
    const db = admin.firestore();
    
    // Obtener información del que llama y del que va a ser borrado
    const callerDoc = await db.collection('users').doc(callerUid).get();
    const targetDoc = await db.collection('users').doc(uid).get();

    if (!callerDoc.exists || !targetDoc.exists) {
      throw new HttpsError('not-found', 'Usuario no encontrado.');
    }

    const callerRole = callerDoc.data()?.role;
    const targetRole = targetDoc.data()?.role;
    const targetClubId = targetDoc.data()?.clubId;

    // Lógica de permisos
    // 1. Admin puede borrar clubes
    // 2. Clubes pueden borrar a sus propios jugadores
    let hasPermission = false;
    if (callerRole === 'admin' && targetRole === 'club') {
      hasPermission = true;
    } else if (callerRole === 'club' && targetRole === 'player' && targetClubId === callerUid) {
      hasPermission = true;
    }

    if (!hasPermission) {
      throw new HttpsError('permission-denied', 'No tienes permisos para borrar a este usuario.');
    }

    // Proceder al borrado
    try {
      await admin.auth().deleteUser(uid);
    } catch (authError: any) {
      // Ignorar si el usuario no existe en Auth (ej: pre-registros sin credenciales)
      if (authError.code !== 'auth/user-not-found' && authError.message !== 'Requested entity was not found.' && !authError.message?.includes('user-not-found')) {
        throw authError;
      }
    }
    await db.collection('users').doc(uid).delete();

    return { success: true, message: 'Usuario eliminado correctamente.' };

  } catch (error: any) {
    console.error('Error deleting user:', error);
    throw new HttpsError('internal', error.message || 'Error interno al borrar el usuario.');
  }
});

// Función para actualizar credenciales de Auth (Email/Contraseña)
export const updateUserAuthV2 = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debes estar autenticado para realizar esta acción.');
  }

  const { uid, email, password } = request.data;
  if (!uid) {
    throw new HttpsError('invalid-argument', 'El UID es requerido.');
  }

  try {
    const callerUid = request.auth.uid;
    const db = admin.firestore();
    
    const callerDoc = await db.collection('users').doc(callerUid).get();
    const targetDoc = await db.collection('users').doc(uid).get();

    if (!callerDoc.exists || !targetDoc.exists) {
      throw new HttpsError('not-found', 'Usuario no encontrado.');
    }

    const callerRole = callerDoc.data()?.role;
    const targetRole = targetDoc.data()?.role;
    const targetClubId = targetDoc.data()?.clubId;

    // Permisos
    let hasPermission = false;
    if (callerRole === 'admin' && targetRole === 'club') hasPermission = true;
    else if (callerRole === 'club' && targetRole === 'player' && targetClubId === callerUid) hasPermission = true;

    if (!hasPermission) {
      throw new HttpsError('permission-denied', 'No tienes permisos para modificar este usuario.');
    }

    // Actualizar Firebase Auth
    const updateData: any = {};
    if (email) updateData.email = email;
    if (password && password.length >= 6) updateData.password = password;

    if (Object.keys(updateData).length > 0) {
      await admin.auth().updateUser(uid, updateData);
    }

    // Si se actualizó el email, también lo actualizamos en Firestore
    if (email) {
      await db.collection('users').doc(uid).update({ email: email });
    }

    return { success: true, message: 'Credenciales actualizadas correctamente.' };

  } catch (error: any) {
    console.error('Error updating user auth:', error);
    throw new HttpsError('internal', error.message || 'Error interno al actualizar las credenciales.');
  }
});
