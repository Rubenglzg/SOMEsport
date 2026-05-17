"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserAuthV2 = exports.deleteUserAccountV2 = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
admin.initializeApp();
// Función para eliminar un usuario de Auth y Firestore
exports.deleteUserAccountV2 = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c, _d;
    // Verificar que el usuario está autenticado
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Debes estar autenticado para realizar esta acción.');
    }
    const { uid } = request.data;
    if (!uid) {
        throw new https_1.HttpsError('invalid-argument', 'El UID es requerido.');
    }
    try {
        const callerUid = request.auth.uid;
        const db = admin.firestore();
        // Obtener información del que llama y del que va a ser borrado
        const callerDoc = await db.collection('users').doc(callerUid).get();
        const targetDoc = await db.collection('users').doc(uid).get();
        if (!callerDoc.exists || !targetDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Usuario no encontrado.');
        }
        const callerRole = (_a = callerDoc.data()) === null || _a === void 0 ? void 0 : _a.role;
        const targetRole = (_b = targetDoc.data()) === null || _b === void 0 ? void 0 : _b.role;
        const targetClubId = (_c = targetDoc.data()) === null || _c === void 0 ? void 0 : _c.clubId;
        // Lógica de permisos
        // 1. Admin puede borrar clubes
        // 2. Clubes pueden borrar a sus propios jugadores
        let hasPermission = false;
        if (callerRole === 'admin' && targetRole === 'club') {
            hasPermission = true;
        }
        else if (callerRole === 'club' && targetRole === 'player' && targetClubId === callerUid) {
            hasPermission = true;
        }
        if (!hasPermission) {
            throw new https_1.HttpsError('permission-denied', 'No tienes permisos para borrar a este usuario.');
        }
        // Proceder al borrado
        try {
            await admin.auth().deleteUser(uid);
        }
        catch (authError) {
            // Ignorar si el usuario no existe en Auth (ej: pre-registros sin credenciales)
            if (authError.code !== 'auth/user-not-found' && authError.message !== 'Requested entity was not found.' && !((_d = authError.message) === null || _d === void 0 ? void 0 : _d.includes('user-not-found'))) {
                throw authError;
            }
        }
        await db.collection('users').doc(uid).delete();
        return { success: true, message: 'Usuario eliminado correctamente.' };
    }
    catch (error) {
        console.error('Error deleting user:', error);
        throw new https_1.HttpsError('internal', error.message || 'Error interno al borrar el usuario.');
    }
});
// Función para actualizar credenciales de Auth (Email/Contraseña)
exports.updateUserAuthV2 = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c;
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Debes estar autenticado para realizar esta acción.');
    }
    const { uid, email, password } = request.data;
    if (!uid) {
        throw new https_1.HttpsError('invalid-argument', 'El UID es requerido.');
    }
    try {
        const callerUid = request.auth.uid;
        const db = admin.firestore();
        const callerDoc = await db.collection('users').doc(callerUid).get();
        const targetDoc = await db.collection('users').doc(uid).get();
        if (!callerDoc.exists || !targetDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Usuario no encontrado.');
        }
        const callerRole = (_a = callerDoc.data()) === null || _a === void 0 ? void 0 : _a.role;
        const targetRole = (_b = targetDoc.data()) === null || _b === void 0 ? void 0 : _b.role;
        const targetClubId = (_c = targetDoc.data()) === null || _c === void 0 ? void 0 : _c.clubId;
        // Permisos
        let hasPermission = false;
        if (callerRole === 'admin' && targetRole === 'club')
            hasPermission = true;
        else if (callerRole === 'club' && targetRole === 'player' && targetClubId === callerUid)
            hasPermission = true;
        if (!hasPermission) {
            throw new https_1.HttpsError('permission-denied', 'No tienes permisos para modificar este usuario.');
        }
        // Actualizar Firebase Auth
        const updateData = {};
        if (email)
            updateData.email = email;
        if (password && password.length >= 6)
            updateData.password = password;
        if (Object.keys(updateData).length > 0) {
            await admin.auth().updateUser(uid, updateData);
        }
        // Si se actualizó el email, también lo actualizamos en Firestore
        if (email) {
            await db.collection('users').doc(uid).update({ email: email });
        }
        return { success: true, message: 'Credenciales actualizadas correctamente.' };
    }
    catch (error) {
        console.error('Error updating user auth:', error);
        throw new https_1.HttpsError('internal', error.message || 'Error interno al actualizar las credenciales.');
    }
});
//# sourceMappingURL=index.js.map