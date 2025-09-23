// src/services/invoiceService.ts
import db from '../db';
import { Invoice } from '../types/invoice';
import axios from 'axios';
import { promises as fs } from 'fs';
import * as path from 'path';

interface InvoiceRow {
  id: string;
  userId: string;
  amount: number;
  dueDate: Date;
  status: string;
}

class InvoiceService {
  static async list(userId: string, status?: string, operator?: string): Promise<Invoice[]> {
    let q = db<InvoiceRow>('invoices').where({ userId });

    // FIX (SQLi): no concatenar SQL crudo + validar operador.
    if (status !== undefined && status !== null && String(status).length > 0) {
      const rawOp = typeof operator === 'string' ? operator.trim() : '=';
      const op: '=' | '!=' = rawOp === '!=' ? '!=' : '='; 

      if (op === '=') {
        q = q.andWhere('status', '=', status);     
      } else {
        q = q.andWhere('status', '!=', status);    
      }
    }

    const rows = await q.select();
    const invoices = rows.map(row => ({
      id: row.id,
      userId: row.userId,
      amount: row.amount,
      dueDate: row.dueDate,
      status: row.status,
    } as Invoice));
    return invoices;
  }

  static async setPaymentCard(
    userId: string,
    invoiceId: string,
    paymentBrand: string,
    ccNumber: string,
    ccv: string,
    expirationDate: string
  ) {
    const allowedPaymentBrands: { [key: string]: string } = {
      visa: 'http://visa/payments',
      mastercard: 'http://mastercard/payments',
      americanexpress: 'http://americanexpress/payments',
    };

    const url = allowedPaymentBrands[paymentBrand.toLowerCase()];
    if (!url) {
      throw new Error('Payment brand not allowed');
    }

    const paymentResponse = await axios.post(url, { ccNumber, ccv, expirationDate });

    if (paymentResponse.status !== 200) {
      throw new Error('Payment failed');
    }

    // Update the invoice status in the database
    await db('invoices')
      .where({ id: invoiceId, userId })
      .update({ status: 'paid' });
  };

  static async getInvoice(userId: string, invoiceId: string): Promise<Invoice> {
    const invoice = await db<InvoiceRow>('invoices')
      .where({ id: invoiceId, userId })  
      .first();

    if (!invoice) {
      throw new Error('Invoice not found');
    }
    return invoice as Invoice;
  }

  static async getReceipt(userId: string, invoiceId: string, pdfName: string) {
    const invoice = await db<InvoiceRow>('invoices')
      .where({ id: invoiceId, userId })  
      .first();

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const baseDir = path.resolve('./invoices');
    const requestedPath = path.resolve(baseDir, pdfName);

    if (!requestedPath.startsWith(baseDir)) {
      console.error('Intento de path traversal detectado: ', requestedPath);
      throw new Error('Invalid file path');
    }

    if(!pdfName.endsWith('.pdf')) {
      console.error('Archivo no permitido: ', pdfName);
      throw new Error('Invalid file type');
    }

    try {
      const content = await fs.readFile(requestedPath);
      return content;
    } catch (error) {
      // send the error to the standard output
      console.error('Error reading receipt file:', error);
      throw new Error('Receipt not found');
    } 

  };
  
};

export default InvoiceService;