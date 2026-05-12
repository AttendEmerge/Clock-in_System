import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import Layout from '../../components/Layout';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import { getAcceptableLocations, addAcceptableLocation, updateAcceptableLocation, deleteAcceptableLocation } from '../../services/api';
import type { AcceptableLocation } from '../../types';
import { Plus, Pencil, Trash2, MapPin, ToggleLeft, ToggleRight, Map as MapIcon } from 'lucide-react';

const DEFAULT_CENTER: [number, number] = [-26.2041, 28.0473];
const DEFAULT_ZOOM = 12;

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onClick(e.latlng.lat, e.latlng.lng) });
  return null;
}

export function HRLocationsContent() {
  const [locations, setLocations] = useState<AcceptableLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState<AcceptableLocation | null>(null);
  const [mapPreviewLoc, setMapPreviewLoc] = useState<AcceptableLocation | null>(null);
  const [form, setForm] = useState({ name: '', latitude: '', longitude: '', radius_meters: '200' });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { fetchLocations(); }, []);

  async function fetchLocations() {
    setLoading(true);
    try {
      const data = await getAcceptableLocations();
      setLocations(data);
    } catch {}
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await addAcceptableLocation({ ...form, latitude: parseFloat(form.latitude), longitude: parseFloat(form.longitude), radius_meters: parseInt(form.radius_meters) });
      setMsg('Location added.');
      setCreateModal(false);
      setForm({ name: '', latitude: '', longitude: '', radius_meters: '200' });
      fetchLocations();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed.');
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editModal) return;
    try {
      await updateAcceptableLocation(editModal.id, { ...form, latitude: parseFloat(form.latitude), longitude: parseFloat(form.longitude), radius_meters: parseInt(form.radius_meters) });
      setMsg('Location updated.');
      setEditModal(null);
      fetchLocations();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed.');
    }
  }

  async function handleToggleActive(loc: AcceptableLocation) {
    try {
      await updateAcceptableLocation(loc.id, { is_active: loc.is_active ? 0 : 1 });
      fetchLocations();
    } catch {}
  }

  async function handleDelete(id: number) {
    if (!confirm('Remove this location?')) return;
    try {
      await deleteAcceptableLocation(id);
      setMsg('Location removed.');
      fetchLocations();
    } catch {}
  }

  function openEdit(loc: AcceptableLocation) {
    setForm({ name: loc.name, latitude: String(loc.latitude), longitude: String(loc.longitude), radius_meters: String(loc.radius_meters) });
    setEditModal(loc);
  }

  function handleMapClick(lat: number, lng: number) {
    setForm(f => ({ ...f, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }));
  }

  const mapCenter: [number, number] = locations.length > 0
    ? [Number(locations[0].latitude), Number(locations[0].longitude)]
    : DEFAULT_CENTER;

  const formLat = parseFloat(form.latitude);
  const formLng = parseFloat(form.longitude);
  const formRadius = parseInt(form.radius_meters) || 200;
  const hasFormCoords = !isNaN(formLat) && !isNaN(formLng);

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-app">Acceptable Locations</h1>
            <p className="text-app-muted text-sm mt-1">Manage approved clock-in locations</p>
          </div>
          <button onClick={() => { setForm({ name: '', latitude: '', longitude: '', radius_meters: '200' }); setCreateModal(true); }}
            className="flex items-center gap-2 bg-app-accent hover:bg-app-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus size={16} /> Add Location
          </button>
        </div>

        {msg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{msg} <button onClick={() => setMsg('')} className="ml-2">✕</button></div>}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error} <button onClick={() => setError('')} className="ml-2">✕</button></div>}

        {loading ? (
          <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-app-accent" /></div>
        ) : (
          <div className="bg-app-surface rounded-xl border border-app-border-subtle shadow-sm overflow-hidden">
            {locations.length === 0 ? (
              <div className="text-center py-12">
                <MapPin size={32} className="mx-auto text-app-subtle mb-2" />
                <p className="text-app-subtle">No locations configured yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-app-page border-b border-app-border-subtle">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-app-muted uppercase">Location</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-app-muted uppercase">Coordinates</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-app-muted uppercase">Radius</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-app-muted uppercase">Added By</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-app-muted uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-app-muted uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app-border-subtle">
                    {locations.map(loc => (
                      <tr key={loc.id} className="hover:bg-app-page">
                        <td className="px-4 py-3 font-medium text-app">{loc.name}</td>
                        <td className="px-4 py-3">
                          <a href={`https://maps.google.com/?q=${loc.latitude},${loc.longitude}`} target="_blank" rel="noopener"
                            className="text-app-accent hover:underline text-xs flex items-center gap-1">
                            <MapPin size={12} /> {Number(loc.latitude).toFixed(5)}, {Number(loc.longitude).toFixed(5)}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-app-muted">{loc.radius_meters}m</td>
                        <td className="px-4 py-3 text-app-muted">{loc.added_by_name || '—'}</td>
                        <td className="px-4 py-3">
                          <Badge variant={loc.is_active ? 'success' : 'neutral'}>
                            {loc.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => setMapPreviewLoc(loc)} title="View on Map"
                              className="p-1.5 text-app-subtle hover:text-green-600 hover:bg-green-50 rounded">
                              <MapIcon size={15} />
                            </button>
                            <button onClick={() => openEdit(loc)} title="Edit"
                              className="p-1.5 text-app-subtle hover:text-app-accent hover:bg-blue-50 rounded">
                              <Pencil size={15} />
                            </button>
                            <button onClick={() => handleToggleActive(loc)} title={loc.is_active ? 'Deactivate' : 'Activate'}
                              className="p-1.5 text-app-subtle hover:text-yellow-600 hover:bg-yellow-50 rounded">
                              {loc.is_active ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                            </button>
                            <button onClick={() => handleDelete(loc.id)} title="Delete"
                              className="p-1.5 text-app-subtle hover:text-red-600 hover:bg-red-50 rounded">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Per-location map preview modal */}
      {mapPreviewLoc && (
        <Modal title={mapPreviewLoc.name} onClose={() => setMapPreviewLoc(null)} size="md">
          <div className="space-y-3">
            <div className="rounded-lg overflow-hidden border border-app-border" style={{ height: 350 }}>
              <MapContainer
                center={[Number(mapPreviewLoc.latitude), Number(mapPreviewLoc.longitude)]}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[Number(mapPreviewLoc.latitude), Number(mapPreviewLoc.longitude)]} icon={markerIcon} />
                <Circle
                  center={[Number(mapPreviewLoc.latitude), Number(mapPreviewLoc.longitude)]}
                  radius={mapPreviewLoc.radius_meters}
                  pathOptions={{ color: '#4C808A', fillColor: '#4C808A', fillOpacity: 0.2, weight: 2 }}
                />
              </MapContainer>
            </div>
            <div className="flex justify-between text-sm text-app-muted">
              <span>Radius: {mapPreviewLoc.radius_meters}m</span>
              <span>{Number(mapPreviewLoc.latitude).toFixed(5)}, {Number(mapPreviewLoc.longitude).toFixed(5)}</span>
            </div>
          </div>
        </Modal>
      )}

      {/* Add / Edit location modal */}
      {(createModal || editModal) && (
        <Modal title={editModal ? 'Edit Location' : 'Add Acceptable Location'} onClose={() => { setCreateModal(false); setEditModal(null); }} size="lg">
          <form onSubmit={editModal ? handleEdit : handleCreate} className="space-y-4">
            {error && <div className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-app mb-1">Location Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Head Office"
                className="w-full px-3 py-2 border border-app-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-app-accent" />
            </div>

            <div>
              <label className="block text-sm font-medium text-app mb-1">Click on the map to set location, or enter coordinates manually</label>
              <div className="rounded-lg overflow-hidden border border-app-border" style={{ height: 300 }}>
                <MapContainer
                  center={hasFormCoords ? [formLat, formLng] : mapCenter}
                  zoom={hasFormCoords ? 15 : DEFAULT_ZOOM}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <ClickHandler onClick={handleMapClick} />
                  {hasFormCoords && (
                    <>
                      <Marker position={[formLat, formLng]} icon={markerIcon} />
                      <Circle
                        center={[formLat, formLng]}
                        radius={formRadius}
                        pathOptions={{ color: '#4C808A', fillColor: '#4C808A', fillOpacity: 0.15, weight: 2 }}
                      />
                    </>
                  )}
                </MapContainer>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-app mb-1">Latitude</label>
                <input type="number" step="any" value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} required
                  placeholder="-26.2041"
                  className="w-full px-3 py-2 border border-app-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-app-accent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-app mb-1">Longitude</label>
                <input type="number" step="any" value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} required
                  placeholder="28.0473"
                  className="w-full px-3 py-2 border border-app-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-app-accent" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-app mb-1">Acceptable Radius: {formRadius}m</label>
              <input
                type="range"
                min={50}
                max={2000}
                step={25}
                value={formRadius}
                onChange={e => setForm({ ...form, radius_meters: e.target.value })}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-app-subtle mt-1">
                <span>50m</span>
                <span>1000m</span>
                <span>2000m</span>
              </div>
              <p className="text-xs text-app-subtle mt-1">Employees must be within this radius to clock in without flagging</p>
            </div>
            <button type="submit"
              className="w-full bg-app-accent hover:bg-app-accent-hover text-white py-2.5 rounded-lg text-sm font-medium">
              {editModal ? 'Save Changes' : 'Add Location'}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}

export default function HRLocationsPage() {
  return (
    <Layout>
      <HRLocationsContent />
    </Layout>
  );
}
