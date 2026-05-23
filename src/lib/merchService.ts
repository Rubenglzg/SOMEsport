import { supabase } from './supabase';
import type { UserProfile } from '../store/authStore';

// =========================================================================
// MÓDULO COMERCIAL INTEGRADO: MERCHANDISING BAJO DEMANDA (FOTOESPORT MERCH)
// =========================================================================

export interface PersonalPhoto {
  id: string;
  playerId: string;
  imageUrl: string;
  title: string;
  category: string;
  takenAt: string;
}

export interface MerchItem {
  id: string;
  name: string;
  price: number;
  description: string;
  imageUrl: string;
}

export interface MerchOrder {
  id?: string;
  playerId: string;
  itemId: string;
  itemName: string;
  photoUrl: string;
  amount: number;
  playerNumber: string;
  customName: string;
  tutorName: string;
  tutorEmail: string;
  paymentGateway: 'stripe' | 'redsys';
  transactionId: string;
  status: 'completado' | 'pendiente' | 'fallido';
  createdAt?: string;
}

/**
 * 1. OBTENCIÓN DE GALERÍA PERSONALIZADA DE JUGADORES
 * El fotógrafo oficial del club sube fotos etiquetando el id del jugador.
 * Este método recupera su porfolio de fotos personalizado.
 */
export const getPlayerPersonalGallery = async (playerId: string): Promise<PersonalPhoto[]> => {
  // Simular consulta a fotos etiquetadas del club.
  // En una implementación real, esto consultaría una tabla 'club_photos' o similar
  // filtrando por la etiqueta del jugador o por detección facial del SaaS.
  return [
    {
      id: 'photo-111',
      playerId: playerId,
      imageUrl: '/images/merch/photo_match_1.jpg',
      title: 'Partido vs LLiria UD - Gol de Victoria',
      category: 'Liga 2025/2026',
      takenAt: '2026-04-12'
    },
    {
      id: 'photo-222',
      playerId: playerId,
      imageUrl: '/images/merch/photo_match_2.jpg',
      title: 'Retrato Oficial de Temporada',
      category: 'Retratos oficiales',
      takenAt: '2025-09-15'
    },
    {
      id: 'photo-333',
      playerId: playerId,
      imageUrl: '/images/merch/photo_match_3.jpg',
      title: 'Celebración en Vestuario tras campeonato',
      category: 'Copa Delegación',
      takenAt: '2026-05-18'
    }
  ];
};

/**
 * Catálogo de merchandising bajo demanda disponible en FotoEsport Merch.
 */
export const MERCH_CATALOG: MerchItem[] = [
  {
    id: 'merch-taza',
    name: 'Taza de Cerámica Personalizada',
    price: 12.90,
    description: 'Taza de cerámica premium resistente a microondas. Personalizada con tu retrato, escudo del club y número de dorsal.',
    imageUrl: '/images/merch/products/taza.png'
  },
  {
    id: 'merch-llavero',
    name: 'Llavero de Metacrilato Doble Cara',
    price: 6.50,
    description: 'Llavero de alta resistencia cortado por láser. Incluye tu foto de acción por una cara y escudo oficial por la otra.',
    imageUrl: '/images/merch/products/llavero.png'
  },
  {
    id: 'merch-cromo',
    name: 'Cromo de Coleccionista Gigante (A4)',
    price: 9.90,
    description: 'Cromo impreso en cartulina brillo de alto gramaje con diseño oficial de cromos de LaLiga. ¡Con todas tus estadísticas de temporada!',
    imageUrl: '/images/merch/products/cromo.png'
  },
  {
    id: 'merch-calendario',
    name: 'Calendario de Pared Espiral Superior (A3)',
    price: 18.00,
    description: 'Calendario de 12 páginas a todo color. Tu foto de portada y las fotos de acción de tu equipo en cada mes.',
    imageUrl: '/images/merch/products/calendario.png'
  },
  {
    id: 'merch-botella',
    name: 'Botella Deportiva de Aluminio Térmica',
    price: 15.90,
    description: 'Botella de agua térmica libre de BPA. Personalizada con tu nombre cortado a láser sobre el escudo oficial del club.',
    imageUrl: '/images/merch/products/botella.png'
  }
];

/**
 * 2. PASARELA DE PAGO MOCKUP (Stripe/Redsys) PARA COMPRAS BAJO DEMANDA
 * Procesa la transacción simulando cobros reales con integraciones de Supabase.
 */
export const processMerchandiseOrder = async (order: Omit<MerchOrder, 'transactionId' | 'status'>): Promise<MerchOrder> => {
  const transactionId = `txn_${order.paymentGateway}_${Math.random().toString(36).substring(2, 10)}`;
  
  // Registrar el pedido y pago en la base de datos de pagos del club
  const concept = `Merch: ${order.itemName} - Personalizado para Dorsal #${order.playerNumber}`;
  
  const { data: profile } = await supabase
    .from('users_profiles')
    .select('club_id')
    .eq('id', order.playerId)
    .single();

  const clubId = profile?.club_id || '99999999-9999-9999-9999-999999999999';

  // Creamos el pago en la tabla principal de pagos en estado 'pagado'
  const { error: payError } = await supabase
    .from('payments')
    .insert({
      player_id: order.playerId,
      club_id: clubId,
      concepto: concept,
      importe: order.amount,
      estado_pago: 'pagado',
      fecha_vencimiento: new Date().toISOString().split('T')[0],
      id_pasarela: transactionId
    });

  if (payError) {
    console.error("Error logging merchandising payment:", payError.message);
    throw payError;
  }

  const completedOrder: MerchOrder = {
    ...order,
    transactionId,
    status: 'completado',
    createdAt: new Date().toISOString()
  };

  return completedOrder;
};

/**
 * 3. EXTRACCIÓN Y RENDERIZADO DE LA FACTURA INSTITUCIONAL CON BRANDING AVANTIA SYSTEMS
 * Hace uso de la imagen 'Logo sin fondo.png' del directorio madre del proyecto.
 */
export const generateMerchInvoiceHTML = (order: MerchOrder, playerProfile: UserProfile): string => {
  const invoiceDate = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  const subtotal = order.amount / 1.21;
  const tax = order.amount - subtotal;

  return `
    <div style="font-family: 'Outfit', 'Inter', sans-serif; max-width: 750px; margin: auto; padding: 45px; border: 1px solid #e2e8f0; border-radius: 32px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.03); background-color: #ffffff;">
      <!-- Invoice Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px dashed #e2e8f0; padding-bottom: 30px; margin-bottom: 35px;">
        <div>
          <!-- Logo Sooner del portal del club -->
          <img src="/logoSOMEsport.png" alt="Sooner Logo" style="height: 40px; margin-bottom: 8px;" />
          <h2 style="margin: 0; font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.025em;">FOTOESPORT MERCH</h2>
          <p style="margin: 2px 0 0 0; font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Portal de Tienda Oficial del Club</p>
        </div>
        <div style="text-align: right;">
          <span style="background-color: #e0f2fe; color: #0369a1; padding: 5px 14px; border-radius: 9999px; font-size: 10px; font-weight: 800; text-transform: uppercase; border: 1px solid #bae6fd;">
            Pago Recibido
          </span>
          <p style="margin: 15px 0 0 0; font-size: 12px; font-weight: bold; color: #475569;">Factura: F-MERCH-${order.transactionId?.substring(4, 12).toUpperCase()}</p>
          <p style="margin: 2px 0 0 0; font-size: 11px; color: #94a3b8;">Fecha: ${invoiceDate}</p>
        </div>
      </div>

      <!-- Parties Details -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 40px; font-size: 13px; line-height: 1.6; color: #475569;">
        <div>
          <strong style="color: #0f172a; text-transform: uppercase; font-size: 10px; letter-spacing: 0.075em; display: block; margin-bottom: 8px;">Vendido por:</strong>
          <strong style="color: #0f172a; font-size: 14px;">FotoEsport Merchandising S.L.</strong>
          <p style="margin: 2px 0 0 0;">C.I.F. B-76543210</p>
          <p style="margin: 2px 0 0 0;">Desarrollo Corporativo SaaS para Avantia Systems</p>
        </div>
        <div style="text-align: right;">
          <strong style="color: #0f172a; text-transform: uppercase; font-size: 10px; letter-spacing: 0.075em; display: block; margin-bottom: 8px;">Facturado a:</strong>
          <strong style="color: #0f172a; font-size: 14px;">${order.tutorName}</strong>
          <p style="margin: 2px 0 0 0;">Correo: ${order.tutorEmail}</p>
          <p style="margin: 2px 0 0 0;">Jugador: ${playerProfile.name} (Dorsal: #${order.playerNumber})</p>
        </div>
      </div>

      <!-- Itemized Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 35px; font-size: 13px;">
        <thead>
          <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0; text-align: left;">
            <th style="padding: 12px; color: #0f172a; font-weight: 800; border-radius: 8px 0 0 8px;">Producto</th>
            <th style="padding: 12px; color: #0f172a; font-weight: 800; text-align: center;">Personalización</th>
            <th style="padding: 12px; color: #0f172a; font-weight: 800; text-align: right; border-radius: 0 8px 8px 0;">Precio Final (I.V.A. Inc)</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 16px 12px; font-weight: 700; color: #0f172a;">
              ${order.itemName}
              <span style="display: block; font-size: 11px; color: #94a3b8; font-weight: normal; margin-top: 4px;">Fabricación bajo demanda con fotografía oficial vinculada</span>
            </td>
            <td style="padding: 16px 12px; text-align: center; color: #475569; font-weight: 600;">
              Nombre: "${order.customName}" <br/>
              Dorsal: #${order.playerNumber}
            </td>
            <td style="padding: 16px 12px; text-align: right; font-weight: 800; color: #0f172a; font-size: 14px;">${order.amount.toFixed(2)}€</td>
          </tr>
        </tbody>
      </table>

      <!-- Calculations Row -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-top: 1px solid #f1f5f9; padding-top: 25px; margin-bottom: 45px;">
        <div style="font-size: 11px; color: #94a3b8; max-width: 55%; line-height: 1.5;">
          <p style="margin: 0; font-weight: 800; color: #64748b;">Información del Pedido:</p>
          <p style="margin: 4px 0 0 0;">Transacción procesada a través de pasarela de pago segura ${order.paymentGateway.toUpperCase()}. ID: ${order.transactionId}. El artículo comenzará el proceso de laminación y diseño personalizado en los talleres del club.</p>
        </div>
        <div style="width: 250px; font-size: 13px; color: #475569; line-height: 1.8;">
          <div style="display: flex; justify-content: space-between;">
            <span>Subtotal (21% Excl):</span>
            <span style="font-weight: 600;">${subtotal.toFixed(2)}€</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid #f1f5f9; padding-bottom: 5px;">
            <span>I.V.A. (21%):</span>
            <span style="font-weight: 600;">${tax.toFixed(2)}€</span>
          </div>
          <div style="display: flex; justify-content: space-between; color: #0f172a; font-weight: 800; font-size: 18px;">
            <span>Total Pagado:</span>
            <span>${order.amount.toFixed(2)}€</span>
          </div>
        </div>
      </div>

      <!-- Corporate Developer Footer -->
      <div style="text-align: center; border-top: 1px solid #f1f5f9; padding-top: 30px; margin-top: 50px;">
        <!-- Logo sin fondo de Avantia Systems -->
        <img src="/Logo sin fondo.png" alt="Avantia Systems Logo" style="height: 35px; opacity: 0.85; margin-bottom: 8px;" />
        <p style="margin: 0; font-size: 11px; color: #94a3b8; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;">
          Powered by Avantia Systems
        </p>
      </div>
    </div>
  `;
};
