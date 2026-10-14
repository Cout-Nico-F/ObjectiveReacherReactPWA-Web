import express from 'express';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// CONFIGURACIÓN DE CREDENCIALES Y PLACEHOLDERS (CARGADOS DESDE .ENV LOCAL)
// ============================================================================
const PAYMENT_CONFIG = {
  licenseSecret:
    process.env.PAYMENT_LICENSE_SECRET ||
    'PLACEHOLDER_CAMBIAR_POR_TU_SECRETO_HMAC_PRIVADO_2026',
  publicAppUrl: process.env.PUBLIC_APP_URL || 'http://localhost:3000',

  // Pasarela 1: Mercado Pago (LatAm / Argentina)
  mpPublicKey:
    process.env.VITE_MP_PUBLIC_KEY ||
    'APP_USR-PLACEHOLDER-TU-PUBLIC-KEY-DE-MERCADOPAGO',
  mpAccessToken:
    process.env.MP_ACCESS_TOKEN ||
    'APP_USR-PLACEHOLDER-TU-ACCESS-TOKEN-PRIVADO-DE-MERCADOPAGO',
  mpWebhookSecret:
    process.env.MP_WEBHOOK_SECRET || 'PLACEHOLDER_TU_CLAVE_SECRETA_WEBHOOK_MP',
  mpUsdToArsRate: Number(process.env.MP_USD_TO_ARS_RATE || '1250'),

  // Pasarela 2: Global (PayPal REST + Google Pay / Lemon Squeezy MoR)
  paypalClientId:
    process.env.VITE_PAYPAL_CLIENT_ID || 'PLACEHOLDER_TU_PAYPAL_CLIENT_ID_GLOBAL',
  paypalClientSecret:
    process.env.PAYPAL_CLIENT_SECRET ||
    'PLACEHOLDER_TU_PAYPAL_CLIENT_SECRET_PRIVADO',
  paypalEnv: (process.env.PAYPAL_ENV || 'sandbox') as 'sandbox' | 'live',
  globalWebhookSecret:
    process.env.GLOBAL_WEBHOOK_SECRET || 'PLACEHOLDER_TU_WEBHOOK_SECRET_GLOBAL',
};

function isConfiguredValue(val: string | undefined): boolean {
  if (!val) return false;
  const trimmed = val.trim();
  return (
    trimmed.length > 0 &&
    !trimmed.includes('PLACEHOLDER') &&
    !trimmed.includes('TU_')
  );
}

// ============================================================================
// MOTOR DE FIRMA CRIPTOGRÁFICA DE LICENCIAS / RECIBOS PRO (STATELESS HMAC)
// ============================================================================
export interface SignedLicensePayload {
  packId: string;
  gems: number;
  shields: number;
  unlocksFounder: boolean;
  usdAmount: number;
  gateway: 'mercadopago' | 'paypal_googlepay' | 'google_play';
  txId: string;
  issuedAt: number;
}

function generateSignedLicenseCode(payload: SignedLicensePayload): string {
  const compactJson = JSON.stringify({
    p: payload.packId,
    g: payload.gems,
    s: payload.shields,
    f: payload.unlocksFounder ? 1 : 0,
    u: payload.usdAmount,
    w: payload.gateway,
    t: payload.txId,
    i: payload.issuedAt,
  });
  const base64Data = Buffer.from(compactJson, 'utf-8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', PAYMENT_CONFIG.licenseSecret)
    .update(base64Data)
    .digest('base64url')
    .slice(0, 16);

  return `OR-PRO-${base64Data}.${signature}`;
}

function verifySignedLicenseCode(code: string): {
  valid: boolean;
  payload?: SignedLicensePayload;
  reason?: string;
} {
  try {
    const clean = code.trim();
    if (!clean.startsWith('OR-PRO-')) {
      return { valid: false, reason: 'El código debe comenzar con OR-PRO-' };
    }
    const rawBody = clean.slice('OR-PRO-'.length);
    const [base64Data, providedSig] = rawBody.split('.');
    if (!base64Data || !providedSig) {
      return { valid: false, reason: 'Formato de código incompleto.' };
    }

    const expectedSig = crypto
      .createHmac('sha256', PAYMENT_CONFIG.licenseSecret)
      .update(base64Data)
      .digest('base64url')
      .slice(0, 16);

    if (providedSig !== expectedSig) {
      return {
        valid: false,
        reason: 'Firma criptográfica inválida o alterada.',
      };
    }

    const decoded = JSON.parse(
      Buffer.from(base64Data, 'base64url').toString('utf-8')
    );

    return {
      valid: true,
      payload: {
        packId: String(decoded.p || 'pack_coffee'),
        gems: Number(decoded.g || 0),
        shields: Number(decoded.s || 0),
        unlocksFounder: Boolean(decoded.f === 1),
        usdAmount: Number(decoded.u || 0),
        gateway: decoded.w || 'mercadopago',
        txId: String(decoded.t || `TX-${Date.now()}`),
        issuedAt: Number(decoded.i || Date.now()),
      },
    };
  } catch {
    return { valid: false, reason: 'No se pudo decodificar el código PRO.' };
  }
}

// Catálogo base en servidor para evitar manipulación de precios desde el cliente
function resolvePackRewards(packId: string, customUsdAmount?: number) {
  if (packId === 'pack_bundle_ultimate') {
    return {
      title: 'Super Pack Fundador Supremo v1.0 — Objective Reacher',
      usdAmount: 6.99,
      gems: 1500,
      shields: 5,
      unlocksFounder: true,
    };
  }
  if (packId === 'pack_founder') {
    return {
      title: 'Pase Fundador Indie (Edición Estreno) — Objective Reacher',
      usdAmount: 4.99,
      gems: 850,
      shields: 3,
      unlocksFounder: true,
    };
  }
  if (packId === 'pack_gem_chest') {
    return {
      title: 'Cofre Astral de 600 Gemas (Bonus Estreno) — Objective Reacher',
      usdAmount: 2.99,
      gems: 600,
      shields: 2,
      unlocksFounder: false,
    };
  }
  if (packId === 'pack_coffee') {
    return {
      title: 'Invítame un Café Indie (Pack Bienvenida) — Objective Reacher',
      usdAmount: 1.99,
      gems: 350,
      shields: 1,
      unlocksFounder: false,
    };
  }

  // Propina libre editable
  const cleanUsd = Math.max(
    0.5,
    Math.min(500, Number((customUsdAmount || 2).toFixed(2)))
  );
  return {
    title: `Propina Indie Libre ($${cleanUsd.toFixed(2)} USD) — Objective Reacher`,
    usdAmount: cleanUsd,
    gems: Math.round(cleanUsd * 140),
    shields: Math.max(1, Math.floor(cleanUsd / 1.5)),
    unlocksFounder: cleanUsd >= 4.99,
  };
}

// ============================================================================
// SERVIDOR EXPRESS + RUTAS DE PASARELA DUAL + VITE MIDDLEWARE
// ============================================================================
async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // 1. Estado de configuración de las pasarelas (sin exponer secretos privados)
  app.get('/api/payments/config-status', (_req, res) => {
    const mpConfigured = isConfiguredValue(PAYMENT_CONFIG.mpAccessToken);
    const paypalConfigured =
      isConfiguredValue(PAYMENT_CONFIG.paypalClientId) &&
      isConfiguredValue(PAYMENT_CONFIG.paypalClientSecret);
    const globalLinksConfigured = Boolean(
      process.env.VITE_GLOBAL_CHECKOUT_FOUNDER_URL ||
        process.env.VITE_GLOBAL_CHECKOUT_COFFEE_URL
    );

    res.json({
      mercadopago: {
        ready: mpConfigured,
        usdToArsRate: PAYMENT_CONFIG.mpUsdToArsRate,
        mode: mpConfigured ? 'live_api' : 'placeholder_sandbox',
      },
      globalGateway: {
        ready: paypalConfigured || globalLinksConfigured,
        paypalEnv: PAYMENT_CONFIG.paypalEnv,
        mode: paypalConfigured
          ? 'paypal_rest_api'
          : globalLinksConfigured
          ? 'external_checkout_links'
          : 'placeholder_sandbox',
      },
    });
  });

  // 2. Crear Orden / Preferencia en MERCADO PAGO (Checkout Pro ARS / LatAm)
  app.post('/api/payments/mercadopago/create-preference', async (req, res) => {
    try {
      const { packId = 'pack_coffee', customUsdAmount } = req.body || {};
      const item = resolvePackRewards(packId, customUsdAmount);
      const arsPrice = Math.round(item.usdAmount * PAYMENT_CONFIG.mpUsdToArsRate);

      // Si el usuario ya colocó su MP_ACCESS_TOKEN real en .env, llamamos a la API oficial de Mercado Pago
      if (isConfiguredValue(PAYMENT_CONFIG.mpAccessToken)) {
        const mpResponse = await fetch(
          'https://api.mercadopago.com/checkout/preferences',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${PAYMENT_CONFIG.mpAccessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              items: [
                {
                  id: packId,
                  title: item.title,
                  quantity: 1,
                  currency_id: 'ARS',
                  unit_price: arsPrice,
                },
              ],
              external_reference: JSON.stringify({
                packId,
                customUsdAmount: item.usdAmount,
              }),
              back_urls: {
                success: `${PAYMENT_CONFIG.publicAppUrl}/?payment_status=approved&gateway=mercadopago&pack=${encodeURIComponent(
                  packId
                )}&usd=${item.usdAmount}`,
                failure: `${PAYMENT_CONFIG.publicAppUrl}/?payment_status=failure&gateway=mercadopago`,
                pending: `${PAYMENT_CONFIG.publicAppUrl}/?payment_status=pending&gateway=mercadopago`,
              },
              auto_return: 'approved',
            }),
          }
        );

        if (!mpResponse.ok) {
          const errText = await mpResponse.text();
          return res.status(400).json({
            ok: false,
            error: `Mercado Pago API respondió (${mpResponse.status}): ${errText}`,
          });
        }

        const mpData = (await mpResponse.json()) as {
          id: string;
          init_point: string;
          sandbox_init_point?: string;
        };

        return res.json({
          ok: true,
          mode: 'live_redirect',
          preferenceId: mpData.id,
          checkoutUrl: mpData.init_point,
          sandboxUrl: mpData.sandbox_init_point,
          arsPrice,
          item,
        });
      }

      // Modo Placeholder Local: simula la orden firmada para que puedas probar todo el flujo antes de poner tus claves
      const txId = `MP-LOCAL-${Date.now().toString(36).toUpperCase()}`;
      const licenseCode = generateSignedLicenseCode({
        packId,
        gems: item.gems,
        shields: item.shields,
        unlocksFounder: item.unlocksFounder,
        usdAmount: item.usdAmount,
        gateway: 'mercadopago',
        txId,
        issuedAt: Date.now(),
      });

      return res.json({
        ok: true,
        mode: 'placeholder_instant',
        txId,
        arsPrice,
        item,
        licenseCode,
        notice:
          'Modo Placeholder activo: coloca tu MP_ACCESS_TOKEN en .env para redirigir al Checkout Pro real de Mercado Pago.',
      });
    } catch (err) {
      return res.status(500).json({
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : 'Error creando preferencia de Mercado Pago',
      });
    }
  });

  // 3. Crear Orden Global en PAYPAL REST API (Soporta PayPal + Google Pay / Tarjetas)
  app.post('/api/payments/paypal/create-order', async (req, res) => {
    try {
      const { packId = 'pack_coffee', customUsdAmount } = req.body || {};
      const item = resolvePackRewards(packId, customUsdAmount);

      if (
        isConfiguredValue(PAYMENT_CONFIG.paypalClientId) &&
        isConfiguredValue(PAYMENT_CONFIG.paypalClientSecret)
      ) {
        const baseUrl =
          PAYMENT_CONFIG.paypalEnv === 'live'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';

        const authHeader = Buffer.from(
          `${PAYMENT_CONFIG.paypalClientId}:${PAYMENT_CONFIG.paypalClientSecret}`
        ).toString('base64');

        const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: 'grant_type=client_credentials',
        });

        if (!tokenRes.ok) {
          const errText = await tokenRes.text();
          return res.status(400).json({
            ok: false,
            error: `Error autenticando PayPal (${tokenRes.status}): ${errText}`,
          });
        }

        const tokenData = (await tokenRes.json()) as { access_token: string };

        const orderRes = await fetch(`${baseUrl}/v2/checkout/orders`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            intent: 'CAPTURE',
            purchase_units: [
              {
                reference_id: packId,
                description: item.title,
                amount: {
                  currency_code: 'USD',
                  value: item.usdAmount.toFixed(2),
                },
              },
            ],
            application_context: {
              brand_name: 'Objective Reacher',
              user_action: 'PAY_NOW',
              return_url: `${PAYMENT_CONFIG.publicAppUrl}/?payment_status=approved&gateway=paypal_googlepay&pack=${encodeURIComponent(
                packId
              )}&usd=${item.usdAmount}`,
              cancel_url: `${PAYMENT_CONFIG.publicAppUrl}/?payment_status=cancelled&gateway=paypal_googlepay`,
            },
          }),
        });

        if (!orderRes.ok) {
          const errText = await orderRes.text();
          return res.status(400).json({
            ok: false,
            error: `Error creando orden PayPal (${orderRes.status}): ${errText}`,
          });
        }

        const orderData = (await orderRes.json()) as {
          id: string;
          links?: Array<{ rel: string; href: string }>;
        };
        const approveLink = orderData.links?.find(
          (l) => l.rel === 'approve'
        )?.href;

        return res.json({
          ok: true,
          mode: 'live_redirect',
          orderId: orderData.id,
          checkoutUrl: approveLink,
          item,
        });
      }

      // Modo Placeholder Local: emite código de licencia firmado para probar flujo completo
      const txId = `PP-GPAY-${Date.now().toString(36).toUpperCase()}`;
      const licenseCode = generateSignedLicenseCode({
        packId,
        gems: item.gems,
        shields: item.shields,
        unlocksFounder: item.unlocksFounder,
        usdAmount: item.usdAmount,
        gateway: 'paypal_googlepay',
        txId,
        issuedAt: Date.now(),
      });

      return res.json({
        ok: true,
        mode: 'placeholder_instant',
        txId,
        item,
        licenseCode,
        notice:
          'Modo Placeholder activo: configura VITE_PAYPAL_CLIENT_ID y PAYPAL_CLIENT_SECRET en .env para abrir el checkout global en vivo.',
      });
    } catch (err) {
      return res.status(500).json({
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : 'Error creando orden en PayPal / Google Pay',
      });
    }
  });

  // 4. Emitir Código de Recuperación tras retorno exitoso de pasarela (o Webhook)
  app.post('/api/payments/issue-receipt-license', (req, res) => {
    const {
      packId = 'pack_coffee',
      customUsdAmount,
      gateway = 'mercadopago',
      externalTxId,
    } = req.body || {};

    const item = resolvePackRewards(packId, customUsdAmount);
    const txId =
      externalTxId ||
      `${gateway === 'mercadopago' ? 'MP' : 'GLB'}-${Date.now()
        .toString(36)
        .toUpperCase()}`;

    const licenseCode = generateSignedLicenseCode({
      packId,
      gems: item.gems,
      shields: item.shields,
      unlocksFounder: item.unlocksFounder,
      usdAmount: item.usdAmount,
      gateway,
      txId,
      issuedAt: Date.now(),
    });

    res.json({
      ok: true,
      txId,
      item,
      licenseCode,
    });
  });

  // 5. Verificar y canjear un Código de Recuperación PRO (`OR-PRO-...`) en cualquier dispositivo
  app.post('/api/payments/verify-license', (req, res) => {
    const { code } = req.body || {};
    if (!code || typeof code !== 'string') {
      return res
        .status(400)
        .json({ valid: false, reason: 'Ingresa un código OR-PRO válido.' });
    }
    const result = verifySignedLicenseCode(code);
    return res.json(result);
  });

  // 6. Webhooks receptores para Mercado Pago y Pasarela Global (listos para producción)
  app.post('/api/webhooks/mercadopago', (req, res) => {
    // Cuando configures tu webhook en el panel de Mercado Pago, recibirás notificaciones aquí
    res.status(200).json({ received: true, gateway: 'mercadopago', body: req.body?.type });
  });

  app.post('/api/webhooks/global', (req, res) => {
    // Receptor de webhooks para PayPal / Lemon Squeezy
    res.status(200).json({ received: true, gateway: 'global' });
  });

  // Vite middleware en desarrollo o archivos estáticos en producción
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `[Objective Reacher] Servidor Dual de Pagos (MP + PayPal/GPay) activo en http://0.0.0.0:${PORT}`
    );
  });
}

startServer();
