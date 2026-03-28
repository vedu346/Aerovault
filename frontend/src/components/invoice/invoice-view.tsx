"use client"

import { Button } from "@/components/ui/button"
import { Download, Printer } from "lucide-react"

interface InvoiceViewProps {
    booking: any
    flight: any
    passengers: any[]
    seats: any[]
    company: any
}

export function InvoiceView({ booking, flight, passengers, seats, company }: InvoiceViewProps) {
    const handlePrint = () => {
        window.print()
    }

    const handleDownload = () => {
        window.print()
    }

    const bookingDate = new Date(booking.booking_date)
    const departureDate = flight?.departure_time ? new Date(flight.departure_time) : null

    return (
        <div className="max-w-4xl mx-auto">
            {/* Action Buttons - Hidden on print */}
            <div className="mb-6 flex gap-4 print:hidden">
                <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Printer className="w-4 h-4 mr-2" />
                    Print Invoice
                </Button>
                <Button onClick={handleDownload} variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                </Button>
            </div>

            {/* Invoice Content */}
            <div className="bg-white shadow-lg rounded-lg p-8 print:shadow-none" id="invoice-content">
                {/* Header */}
                <div className="border-b-4 border-blue-600 pb-6 mb-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-4xl font-bold text-gray-900 mb-2">INVOICE</h1>
                            <p className="text-gray-600">Flight Booking Confirmation</p>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold text-blue-600 mb-1">
                                {company?.company_name || 'Aerovault Airlines'}
                            </div>
                            <p className="text-sm text-gray-600">Professional Flight Services</p>
                        </div>
                    </div>
                </div>

                {/* Invoice Details */}
                <div className="grid grid-cols-2 gap-8 mb-8">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Invoice Details</h3>
                        <div className="space-y-1">
                            <p className="text-sm">
                                <span className="font-semibold">Invoice Number:</span>{' '}
                                <span className="text-blue-600 font-mono">{booking.invoice_number}</span>
                            </p>
                            <p className="text-sm">
                                <span className="font-semibold">Ticket ID:</span>{' '}
                                <span className="text-blue-600 font-mono">{booking.ticket_id}</span>
                            </p>
                            <p className="text-sm">
                                <span className="font-semibold">Booking Date:</span>{' '}
                                {bookingDate.toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </p>
                            <p className="text-sm">
                                <span className="font-semibold">Payment Status:</span>{' '}
                                <span className="text-green-600 font-semibold">PAID</span>
                            </p>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Passenger Information</h3>
                        <div className="space-y-1">
                            {passengers.map((passenger, idx) => (
                                <div key={idx} className="text-sm">
                                    <p className="font-semibold">
                                        {passenger.first_name} {passenger.last_name}
                                    </p>
                                    <p className="text-gray-600">
                                        {passenger.gender}, Age {passenger.age}
                                    </p>
                                    {passenger.email && (
                                        <p className="text-gray-600">{passenger.email}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Flight Details */}
                <div className="bg-blue-50 rounded-lg p-6 mb-8">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Flight Details</h3>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Flight Number</p>
                            <p className="text-lg font-bold text-gray-900">{flight?.flight_number}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Airline</p>
                            <p className="text-lg font-bold text-gray-900">{company?.company_name || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 mb-1">From</p>
                            <p className="text-lg font-bold text-gray-900">{flight?.source}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 mb-1">To</p>
                            <p className="text-lg font-bold text-gray-900">{flight?.destination}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Departure</p>
                            <p className="text-base font-semibold text-gray-900">
                                {departureDate ? departureDate.toLocaleString('en-US', {
                                    dateStyle: 'medium',
                                    timeStyle: 'short'
                                }) : 'N/A'}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Seat(s)</p>
                            <div className="flex gap-2 flex-wrap">
                                {seats.map((seat, idx) => (
                                    <span key={idx} className="bg-blue-600 text-white px-3 py-1 rounded font-bold text-sm">
                                        {seat.seat_number}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Pricing Table */}
                <div className="mb-8">
                    <table className="w-full">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Description</th>
                                <th className="text-center py-3 px-4 font-semibold text-gray-700">Quantity</th>
                                <th className="text-right py-3 px-4 font-semibold text-gray-700">Unit Price</th>
                                <th className="text-right py-3 px-4 font-semibold text-gray-700">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b">
                                <td className="py-3 px-4">
                                    <p className="font-medium">Flight Ticket</p>
                                    <p className="text-sm text-gray-600">
                                        {flight?.source} → {flight?.destination}
                                    </p>
                                </td>
                                <td className="text-center py-3 px-4">{booking.seats}</td>
                                <td className="text-right py-3 px-4">₹{flight?.price || 0}</td>
                                <td className="text-right py-3 px-4 font-semibold">
                                    ₹{(flight?.price || 0) * booking.seats}
                                </td>
                            </tr>
                        </tbody>
                        <tfoot>
                            <tr className="border-b">
                                <td colSpan={3} className="text-right py-3 px-4 font-semibold">Subtotal:</td>
                                <td className="text-right py-3 px-4 font-semibold">₹{booking.total_price}</td>
                            </tr>
                            <tr className="border-b">
                                <td colSpan={3} className="text-right py-3 px-4 text-gray-600">Taxes & Fees:</td>
                                <td className="text-right py-3 px-4 text-gray-600">₹0.00</td>
                            </tr>
                            <tr className="bg-blue-50">
                                <td colSpan={3} className="text-right py-4 px-4 text-lg font-bold text-gray-900">
                                    Total Amount:
                                </td>
                                <td className="text-right py-4 px-4 text-2xl font-bold text-blue-600">
                                    ₹{booking.total_price}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Footer */}
                <div className="border-t pt-6 mt-8">
                    <div className="grid grid-cols-2 gap-8 text-sm">
                        <div>
                            <h4 className="font-semibold text-gray-900 mb-2">Terms & Conditions</h4>
                            <ul className="text-gray-600 space-y-1 text-xs">
                                <li>• Ticket is non-transferable</li>
                                <li>• Check-in opens 2 hours before departure</li>
                                <li>• Carry valid ID proof for verification</li>
                                <li>• Cancellation charges may apply</li>
                            </ul>
                        </div>
                        <div className="text-right">
                            <p className="text-gray-600 text-xs mb-2">Thank you for choosing our services!</p>
                            <p className="text-gray-500 text-xs">
                                For support, contact: support@aerovault.com
                            </p>
                            <p className="text-gray-400 text-xs mt-4">
                                This is a computer-generated invoice and does not require a signature.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Styles */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    body {
                        print-color-adjust: exact;
                        -webkit-print-color-adjust: exact;
                    }
                    .print\\:hidden {
                        display: none !important;
                    }
                    .print\\:shadow-none {
                        box-shadow: none !important;
                    }
                    @page {
                        margin: 1cm;
                    }
                }
            `}} />
        </div>
    )
}
