// src/controllers/invoiceController.ts
import { Request, Response, NextFunction } from 'express';
import InvoiceService from '../services/invoiceService';

interface AuthRequest extends Request {
  user?: { id: string };
}

const ALLOWED_OPERATORS = new Set(['=', '!=']);
// (Opcional) si querés endurecer status:
// const ALLOWED_STATUS = new Set(['paid', 'unpaid']);

const listInvoices = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = String(req.user?.id); // ← del JWT (middleware)
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const status =
      typeof req.query.status === 'string' && req.query.status.trim().length > 0
        ? req.query.status.trim()
        : undefined;

    const operatorRaw =
      typeof req.query.operator === 'string' && req.query.operator.trim().length > 0
        ? req.query.operator.trim()
        : '=';

    // Validación de operador (refuerzo al fix de SQLi)
    if (operatorRaw && !ALLOWED_OPERATORS.has(operatorRaw)) {
      return res.status(400).json({ error: 'invalid operator' });
    }

    // (Opcional) validar status
    // if (status && !ALLOWED_STATUS.has(status)) {
    //   return res.status(400).json({ error: 'invalid status' });
    // }

    const invoices = await InvoiceService.list(userId, status, operatorRaw);
    return res.json(invoices);
  } catch (err) {
    return next(err);
  }
};

const setPaymentCard = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = String(req.user?.id);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const invoiceId = String(req.params.id);
    const { paymentBrand, ccNumber, ccv, expirationDate } = req.body || {};

    if (!paymentBrand || !ccNumber || !ccv || !expirationDate) {
      return res.status(400).json({ error: 'Missing payment details' });
    }

    await InvoiceService.setPaymentCard(userId, invoiceId, paymentBrand, ccNumber, ccv, expirationDate);
    return res.status(200).json({ message: 'Payment successful' });
  } catch (err) {
    return next(err);
  }
};

const getInvoicePDF = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = String(req.user?.id);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const invoiceId = String(req.params.id);
    const pdfName = typeof req.query.pdfName === 'string' ? req.query.pdfName : undefined;
    if (!pdfName) {
      return res.status(400).json({ error: 'Missing parameter pdfName' });
    }

    // ✅ se pasa userId al service para evitar IDOR
    const pdf = await InvoiceService.getReceipt(userId, invoiceId, pdfName);

    // Si el service retorna texto, podrías usar 'text/plain'; lo dejo en pdf por compatibilidad con tu UI
    res.setHeader('Content-Type', 'application/pdf');
    return res.send(pdf);
  } catch (err) {
    // 404 si no existe o no es del usuario
    return res.status(404).json({ error: 'Receipt not found' });
  }
};

const getInvoice = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = String(req.user?.id);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const invoiceId = String(req.params.id);

    // ✅ se pasa userId al service para evitar IDOR
    const invoice = await InvoiceService.getInvoice(userId, invoiceId);
    return res.status(200).json(invoice);
  } catch (err) {
    return res.status(404).json({ error: 'Invoice not found' });
  }
};

export default {
  listInvoices,
  setPaymentCard,
  getInvoice,
  getInvoicePDF,
};