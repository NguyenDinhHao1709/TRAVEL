import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: 'clamp(240px, 45vh, 400px)'
};

const overlayButtonStyle = {
  position: 'absolute',
  top: 12,
  right: 12,
  zIndex: 2,
  background: '#ffffff',
  color: '#0d47a1',
  border: '1px solid #cfd8e3',
  borderRadius: 8,
  padding: '6px 10px',
  textDecoration: 'none',
  fontSize: 13,
  fontWeight: 700,
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)'
};

// Component nội bộ — chỉ render khi apiKey hợp lệ, tránh gọi useJsApiLoader với key rỗng
const GoogleMapInner = ({ center, googleMapsUrl, coordinateLabel, apiKey }) => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey
  });

  if (loadError || !isLoaded) {
    return <div>Đang tải bản đồ...</div>;
  }

  return (
    <div>
      <div style={{ position: 'relative' }}>
        <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={15}>
          <Marker position={center} />
        </GoogleMap>
        <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" style={overlayButtonStyle}>
          Mo Google Maps
        </a>
      </div>
      <div style={{ marginTop: 8, fontSize: 13, color: '#4b5563' }}>
        Toa do: {coordinateLabel}
      </div>
    </div>
  );
};

const MapComponent = ({ latitude = 10.8231, longitude = 106.6797 }) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const isGoogleKeyValid = !!apiKey && !['MOCK', 'your_google_maps_api_key'].includes(apiKey);

  const center = {
    lat: parseFloat(latitude) || 10.8231,
    lng: parseFloat(longitude) || 106.6797
  };

  const delta = 0.02;
  const bbox = `${center.lng - delta},${center.lat - delta},${center.lng + delta},${center.lat + delta}`;
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(`${center.lat},${center.lng}`)}`;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${center.lat},${center.lng}`)}`;
  const coordinateLabel = `${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}`;

  if (!isGoogleKeyValid) {
    return (
      <div>
        <div style={{ position: 'relative' }}>
          <iframe
            title="tour-location-map"
            src={osmEmbedUrl}
            width="100%"
            height="320"
            style={{ border: 0 }}
            loading="lazy"
          />
          <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" style={overlayButtonStyle}>
            Mo Google Maps
          </a>
        </div>
        <div style={{ marginTop: 8, fontSize: 13, color: '#4b5563' }}>
          Toa do: {coordinateLabel}
        </div>
      </div>
    );
  }

  return (
    <GoogleMapInner
      center={center}
      googleMapsUrl={googleMapsUrl}
      coordinateLabel={coordinateLabel}
      apiKey={apiKey}
    />
  );
};

export default MapComponent;
