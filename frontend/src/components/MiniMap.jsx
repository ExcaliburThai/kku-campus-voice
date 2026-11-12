import React from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMapEvents } from "react-leaflet";
import { statusNames } from "../api.js";

const center = [16.475, 102.823]; const campusZoom = 15;

export default function MiniMap({ issues = [], height = 360, interactive = false, onPick, point }) { function Picker() { useMapEvents({ click(e) { if (onPick) onPick([e.latlng.lat, e.latlng.lng]); } }); return null; } return <MapContainer center={center} zoom={campusZoom} scrollWheelZoom={interactive} className="map" style={{ height }}><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />{interactive && <Picker />}{issues.filter(i => i.latitude != null && i.longitude != null).map(i => <CircleMarker key={i.id} center={[i.latitude, i.longitude]} radius={9} pathOptions={{ color: '#fff', weight: 2, fillColor: i.status === 'resolved' ? '#16a34a' : i.status === 'pending' ? '#e45b58' : '#f59e0b', fillOpacity: .95 }}><Popup><strong>{i.title}</strong><br />{i.location_name || 'ไม่ระบุพื้นที่'}<br />{statusNames[i.status]}</Popup></CircleMarker>)}{point && <CircleMarker center={point} radius={10} pathOptions={{ color: '#fff', weight: 3, fillColor: '#4f46e5', fillOpacity: 1 }}><Popup>ตำแหน่งที่เลือก</Popup></CircleMarker>}</MapContainer> }
