import React, { useMemo } from 'react';
import { View, Text, Platform, StyleSheet } from 'react-native';
import { PatientProfile } from '../../types';
import { MapPin } from 'lucide-react-native';

// Dynamically import WebView on native platforms
let WebViewComponent: any = null;
if (Platform.OS !== 'web') {
  try {
    const webviewPkg = require('react-native-webview');
    WebViewComponent = webviewPkg.WebView || webviewPkg.default;
  } catch (e) {
    WebViewComponent = null;
  }
}

// Known Northeast India Coordinates
const NORTHEAST_COORDINATES: Record<string, [number, number]> = {
  guwahati: [26.1445, 91.7362],
  shillong: [25.5788, 91.8933],
  jorhat: [26.7509, 94.2037],
  dibrugarh: [27.4728, 94.9120],
  tezpur: [26.6528, 92.7926],
  silchar: [24.8333, 92.7789],
  tura: [25.5141, 90.2023],
  nagaon: [26.3466, 92.6841],
  bongaigaon: [26.5024, 90.5577],
  sivasagar: [26.9826, 94.6426],
  itanagar: [27.0844, 93.6053],
  kohima: [25.6751, 94.1086],
  imphal: [24.8170, 93.9368],
  aizawl: [23.7271, 92.7176],
  agartala: [23.8315, 91.2868],
  gangtok: [27.3389, 88.6065],
  diphu: [25.8456, 93.4316],
  golaghat: [26.5186, 93.9686],
  barpeta: [26.3211, 91.0064],
};

function getCityCoords(cityName?: string, index = 0): [number, number] {
  if (!cityName) return [26.1445 + (index % 5) * 0.015, 91.7362 + (index % 5) * 0.015];
  const normalized = cityName.trim().toLowerCase();
  if (NORTHEAST_COORDINATES[normalized]) {
    const base = NORTHEAST_COORDINATES[normalized];
    return [base[0] + (index % 5) * 0.012, base[1] + (index % 5) * 0.012];
  }
  let hash = 0;
  for (let i = 0; i < cityName.length; i++) {
    hash = (hash << 5) - hash + cityName.charCodeAt(i);
  }
  const latOffset = ((Math.abs(hash) % 180) / 100) - 0.9 + (index % 4) * 0.01;
  const lngOffset = ((Math.abs(hash * 3) % 250) / 100) - 1.2 + (index % 4) * 0.01;
  return [26.2 + latOffset, 92.8 + lngOffset];
}

interface LeafletPatientMapProps {
  patients: PatientProfile[];
  onSelectPatient?: (patient: PatientProfile) => void;
  height?: number;
}

export const LeafletPatientMap: React.FC<LeafletPatientMapProps> = ({
  patients,
  onSelectPatient,
  height = 340,
}) => {
  // Prepare patient location data for Leaflet
  const markerData = useMemo(() => {
    return patients.map((p, idx) => {
      const hasGps = typeof p.latitude === 'number' && typeof p.longitude === 'number';
      const coords = hasGps 
        ? [p.latitude!, p.longitude!] 
        : getCityCoords(p.city, idx);

      const stage = p.dementiaStage || 'mild';

      return {
        id: p.id,
        name: p.name,
        city: p.city || 'Guwahati',
        address: p.locationAddress || p.city || 'Live Location',
        hasGps,
        lat: coords[0],
        lng: coords[1],
        stage,
        stageLabel: stage === 'early' ? 'High Care' : stage === 'moderate' ? 'Moderate' : 'Mild (Stable)',
        age: p.age ? `${p.age} yrs` : 'Not specified',
        code: p.accessCode,
        lang: (p.preferredLanguage || 'en').toUpperCase(),
      };
    });
  }, [patients]);

  // Generate Leaflet HTML
  const leafletHtml = useMemo(() => {
    const centerLat = markerData.length > 0 ? markerData[0].lat : 26.2006;
    const centerLng = markerData.length > 0 ? markerData[0].lng : 92.9376;
    const markersJson = JSON.stringify(markerData);

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #map { width: 100%; height: 100%; background: #FAF7F2; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }

    /* Custom Pulsing Markers */
    .pulse-marker {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
    }

    .pulse-ring {
      position: absolute;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
    }

    .pulse-core {
      position: relative;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      color: #FFFFFF;
      font-weight: 800;
      font-size: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #FFFFFF;
      box-shadow: 0 3px 8px rgba(0,0,0,0.35);
      z-index: 2;
    }

    /* Red (Early/High Attention) */
    .stage-early .pulse-core { background: #DC2626; }
    .stage-early .pulse-ring { border: 2.5px solid #EF4444; background: rgba(239, 68, 68, 0.35); }

    /* Yellow (Moderate) */
    .stage-moderate .pulse-core { background: #D97706; }
    .stage-moderate .pulse-ring { border: 2.5px solid #F59E0B; background: rgba(245, 158, 11, 0.35); }

    /* Green (Mild/Stable) */
    .stage-mild .pulse-core { background: #16A34A; }
    .stage-mild .pulse-ring { border: 2.5px solid #22C55E; background: rgba(34, 197, 94, 0.35); }

    @keyframes pulse-ring {
      0% { transform: scale(0.6); opacity: 1; }
      70% { transform: scale(1.6); opacity: 0; }
      100% { transform: scale(1.8); opacity: 0; }
    }

    /* Popup Styling */
    .leaflet-popup-content-wrapper {
      border-radius: 18px !important;
      padding: 0 !important;
      overflow: hidden;
      box-shadow: 0 8px 24px rgba(20, 40, 25, 0.18) !important;
      border: 1px solid #E2DDD5;
    }
    .leaflet-popup-content {
      margin: 0 !important;
      padding: 14px 16px !important;
      line-height: 1.35 !important;
      min-width: 220px;
      max-width: 260px;
    }
    .leaflet-popup-tip {
      background: #FFFFFF !important;
    }

    .pop-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #F1EBE1;
      padding-bottom: 8px;
      margin-bottom: 8px;
    }
    .pop-name {
      font-size: 15px;
      font-weight: 800;
      color: #1E293B;
    }
    .pop-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 999px;
    }
    .badge-early { background: #FEE2E2; color: #991B1B; border: 1px solid #FECACA; }
    .badge-moderate { background: #FEF3C7; color: #92400E; border: 1px solid #FDE68A; }
    .badge-mild { background: #EAF7EE; color: #145332; border: 1px solid #BDE5CB; }

    .pop-location {
      font-size: 12px;
      color: #1E293B;
      font-weight: 700;
      margin-bottom: 3px;
    }
    .pop-coords {
      font-size: 10px;
      color: #64748B;
      font-weight: 600;
      margin-bottom: 6px;
    }
    .pop-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #FAF8F5;
      padding: 6px 8px;
      border-radius: 8px;
      border: 1px solid #EDE7DD;
      margin-bottom: 8px;
      font-size: 11px;
      color: #475569;
      font-weight: 600;
    }
    .p-code {
      font-weight: 800;
      color: #D96B27;
      background: #FFF8F3;
      padding: 1px 6px;
      border-radius: 6px;
      border: 1px solid #FAD0B6;
    }

    .p-btn {
      display: block;
      width: 100%;
      text-align: center;
      background: #16704A;
      color: #FFFFFF;
      font-size: 11px;
      font-weight: 700;
      padding: 7px 0;
      border-radius: 10px;
      text-decoration: none;
      border: none;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const data = ${markersJson};
    const map = L.map('map', {
      zoomControl: true,
      attributionControl: false,
    }).setView([${centerLat}, ${centerLng}], 8);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
    }).addTo(map);

    const bounds = [];

    data.forEach((p, idx) => {
      bounds.push([p.lat, p.lng]);

      const iconHtml = \`
        <div class="pulse-marker stage-\${p.stage}">
          <div class="pulse-ring"></div>
          <div class="pulse-core">\${idx + 1}</div>
        </div>
      \`;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
      });

      const badgeClass = p.stage === 'early' ? 'badge-early' : p.stage === 'moderate' ? 'badge-moderate' : 'badge-mild';
      const gpsLabel = p.hasGps ? \`GPS: \${p.lat.toFixed(4)}° N, \${p.lng.toFixed(4)}° E (Live)\` : 'City Coordinates';

      const popupContent = \`
        <div class="pop-header">
          <div class="pop-name">\${p.name}</div>
          <div class="pop-badge \${badgeClass}">\${p.stageLabel}</div>
        </div>
        <div class="pop-location">📍 \${p.address}</div>
        <div class="pop-coords">\${gpsLabel}</div>
        <div class="pop-meta">
          <span>Age: \${p.age}</span>
          <span class="p-code">\${p.code}</span>
        </div>
        <button class="p-btn" onclick="selectPatient('\${p.id}')">View Patient Record →</button>
      \`;

      const marker = L.marker([p.lat, p.lng], { icon: customIcon }).addTo(map);
      marker.bindPopup(popupContent);
    });

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }

    function selectPatient(patientId) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SELECT_PATIENT', patientId: patientId }));
      } else if (window.parent) {
        window.parent.postMessage({ type: 'SELECT_PATIENT', patientId: patientId }, '*');
      }
    }
  </script>
</body>
</html>`;
  }, [markerData]);

  // Handle messages from Leaflet (web & native)
  const handleMessage = (event: any) => {
    try {
      const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      if (data && data.type === 'SELECT_PATIENT' && data.patientId && onSelectPatient) {
        const found = patients.find((p) => p.id === data.patientId);
        if (found) {
          onSelectPatient(found);
        }
      }
    } catch {}
  };

  // Web Listener
  React.useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const listener = (event: MessageEvent) => {
        if (event.data && event.data.type === 'SELECT_PATIENT') {
          handleMessage(event);
        }
      };
      window.addEventListener('message', listener);
      return () => window.removeEventListener('message', listener);
    }
  }, [patients, onSelectPatient]);

  return (
    <View 
      className="mb-5 bg-white border-2 border-[#EDE7DD] rounded-[28px] overflow-hidden"
      style={{
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
      }}
    >
      {/* Map Header */}
      <View className="p-4 pb-2.5 flex-row items-center justify-between border-b border-[#F1EBE1] bg-[#FAF8F5]">
        <View className="flex-row items-center flex-1 mr-2">
          <View className="w-8 h-8 rounded-xl bg-[#EAF7EE] border border-[#BDE5CB] items-center justify-center mr-2.5">
            <MapPin size={16} color="#16704A" />
          </View>
          <View className="flex-1">
            <Text className="text-base text-[#1E293B] font-bold" style={{ fontFamily: 'Nunito-Bold' }}>
              Patient Live Location Map
            </Text>
            <Text className="text-[#64748B] text-xs font-semibold" style={{ fontFamily: 'Nunito-SemiBold' }}>
              Leaflet • {patients.length} Registered {patients.length === 1 ? 'Location' : 'Locations'}
            </Text>
          </View>
        </View>

        {/* Legend */}
        <View className="flex-row items-center gap-1.5 flex-wrap">
          <View className="flex-row items-center bg-white px-2 py-0.5 rounded-full border border-[#EDE7DD]">
            <View className="w-2 h-2 rounded-full bg-[#16A34A] mr-1" />
            <Text className="text-[10px] text-[#475569] font-bold">Mild</Text>
          </View>
          <View className="flex-row items-center bg-white px-2 py-0.5 rounded-full border border-[#EDE7DD]">
            <View className="w-2 h-2 rounded-full bg-[#D97706] mr-1" />
            <Text className="text-[10px] text-[#475569] font-bold">Mod</Text>
          </View>
          <View className="flex-row items-center bg-white px-2 py-0.5 rounded-full border border-[#EDE7DD]">
            <View className="w-2 h-2 rounded-full bg-[#DC2626] mr-1" />
            <Text className="text-[10px] text-[#475569] font-bold">Early</Text>
          </View>
        </View>
      </View>

      {/* Map Body */}
      <View style={{ height, width: '100%', overflow: 'hidden' }}>
        {Platform.OS === 'web' ? (
          <iframe
            srcDoc={leafletHtml}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="Cognia Leaflet Map"
          />
        ) : WebViewComponent ? (
          <WebViewComponent
            originWhitelist={['*']}
            source={{ html: leafletHtml }}
            style={{ flex: 1, backgroundColor: '#FAF7F2' }}
            onMessage={(e: any) => handleMessage(e.nativeEvent)}
            javaScriptEnabled
            domStorageEnabled
          />
        ) : (
          <View style={[styles.fallback, { height }]}>
            <Text style={styles.fallbackText}>Interactive Leaflet Map available in web & mobile builds</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: '#FAF7F2',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  fallbackText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
});
