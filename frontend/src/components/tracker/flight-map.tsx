"use client"

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect } from 'react'

const icon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
})

const planeIcon = L.icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/7893/7893979.png",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
})

interface FlightMapProps {
    flights: any[]
}

const AIRPORT_COORDS: Record<string, [number, number]> = {
    "New York": [40.7128, -74.0060],
    "New York (JFK)": [40.6413, -73.7781],
    "London (LHR)": [51.4700, -0.4543],
    "London": [51.5074, -0.1278],
    "Los Angeles (LAX)": [33.9416, -118.4085],
    "Tokyo (HND)": [35.5494, 139.7798],
    "Paris (CDG)": [49.0097, 2.5479],
    "Dubai (DXB)": [25.2532, 55.3657],
    "Atlanta (ATL)": [33.6407, -84.4277],
}

export default function FlightMap({ flights }: FlightMapProps) {
    const markers = flights.map(f => {
        const sourceCoords = AIRPORT_COORDS[f.source] || [0, 0]
        const destCoords = AIRPORT_COORDS[f.destination] || [0, 0]

        let position: [number, number] = sourceCoords;
        if (f.status === 'Landed') position = destCoords;
        if (f.status === 'In Air') {
            position = [
                (sourceCoords[0] + destCoords[0]) / 2,
                (sourceCoords[1] + destCoords[1]) / 2
            ]
            position[0] += (Math.random() - 0.5) * 5
            position[1] += (Math.random() - 0.5) * 5
        }

        if (position[0] === 0 && position[1] === 0) return null

        return { ...f, position }
    }).filter(Boolean)

    return (
        <MapContainer center={[20, 0]} zoom={2} style={{ height: '100%', width: '100%', background: '#0f172a' }}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {markers.map((flight: any) => (
                <Marker key={flight.id} position={flight.position} icon={planeIcon}>
                    <Popup>
                        <div className="font-sans">
                            <h3 className="font-bold">{flight.flight_number}</h3>
                            <p className="text-xs">{flight.airline}</p>
                            <p className="text-sm border-t mt-1 pt-1">{flight.source} ➝ {flight.destination}</p>
                            <p className="text-xs font-bold text-blue-600 mt-1">{flight.status}</p>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    )
}
