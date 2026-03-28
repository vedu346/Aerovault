/**
 * Utility functions for generating unique ticket IDs and invoice numbers
 */

/**
 * Generates a unique ticket ID in the format: TKT-XXXXXX
 * Uses timestamp and random characters to ensure uniqueness
 */
export function generateTicketId(): string {
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    return `TKT-${timestamp}${random}`.substring(0, 20)
}

/**
 * Generates a unique invoice number in the format: INV-XXXXXX
 * Uses timestamp and random characters to ensure uniqueness
 */
export function generateInvoiceNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    return `INV-${timestamp}${random}`.substring(0, 20)
}
