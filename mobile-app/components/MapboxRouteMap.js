// mobile-app/components/MapboxRouteMap.js
// Interactive route map using Mapbox GL React Native

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';

// Initialize Mapbox with your token
MapboxGL.setAccessToken('pk.eyJ1IjoidGF0c3VydS1raWt1Y2hpIiwiYSI6ImNtZmdrOWNuNDAxcHMya3E0Z3F6ZzR6ODYifQ.DgYnz9Iwp6SBEK_AXeAEWg');

const { width, height } = Dimensions.get('window');

const MapboxRouteMap = ({ 
  pickupCoordinates, 
  destinationCoordinates, 
  pickupName, 
  destinationName,
  onRouteCalculated 
}) => {
  const [routeData, setRouteData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState([137.043394, 35.264311]); // Default to 高蔵寺駅
  const [zoomLevel, setZoomLevel] = useState(12);
  
  const cameraRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (pickupCoordinates && destinationCoordinates) {
      calculateRoute();
    }
  }, [pickupCoordinates, destinationCoordinates]);

  const calculateRoute = async () => {
    if (!pickupCoordinates || !destinationCoordinates) return;

    setIsLoading(true);

    try {
      const coordinates = `${pickupCoordinates[0]},${pickupCoordinates[1]};${destinationCoordinates[0]},${destinationCoordinates[1]}`;
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}`;
      
      const response = await fetch(`${url}?access_token=${MapboxGL.getAccessToken()}&geometries=geojson&overview=full&steps=true`);
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        
        const routeInfo = {
          geometry: route.geometry,
          distance: (route.distance / 1000).toFixed(1), // km
          duration: Math.round(route.duration / 60), // minutes
          steps: route.legs[0].steps
        };

        setRouteData(routeInfo);
        
        // Fit map to show entire route
        fitMapToRoute(routeInfo.geometry);
        
        // Callback with route data for fare calculation
        if (onRouteCalculated) {
          onRouteCalculated(routeInfo);
        }
      }
    } catch (error) {
      console.log('Route calculation error:', error);
      Alert.alert('エラー', 'ルート計算に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const fitMapToRoute = (geometry) => {
    if (!geometry || !geometry.coordinates) return;

    const coordinates = geometry.coordinates;
    
    // Calculate bounds
    let minLat = coordinates[0][1];
    let maxLat = coordinates[0][1];
    let minLng = coordinates[0][0];
    let maxLng = coordinates[0][0];

    coordinates.forEach(([lng, lat]) => {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    });

    // Add padding
    const padding = 0.01;
    const bounds = [
      [minLng - padding, minLat - padding],
      [maxLng + padding, maxLat + padding]
    ];

    // Fit camera to bounds
    if (cameraRef.current) {
      cameraRef.current.fitBounds(bounds[0], bounds[1], 50, 1000);
    }
  };

  const renderPickupMarker = () => {
    if (!pickupCoordinates) return null;

    return (
      <MapboxGL.PointAnnotation
        id="pickup"
        coordinate={pickupCoordinates}
      >
        <View style={styles.pickupMarker}>
          <Text style={styles.markerText}>出発</Text>
        </View>
        <MapboxGL.Callout title={pickupName || "出発地"} />
      </MapboxGL.PointAnnotation>
    );
  };

  const renderDestinationMarker = () => {
    if (!destinationCoordinates) return null;

    return (
      <MapboxGL.PointAnnotation
        id="destination"
        coordinate={destinationCoordinates}
      >
        <View style={styles.destinationMarker}>
          <Text style={styles.markerText}>到着</Text>
        </View>
        <MapboxGL.Callout title={destinationName || "目的地"} />
      </MapboxGL.PointAnnotation>
    );
  };

  const renderRouteLayer = () => {
    if (!routeData || !routeData.geometry) return null;

    return (
      <MapboxGL.ShapeSource id="routeSource" shape={routeData.geometry}>
        <MapboxGL.LineLayer
          id="routeLayer"
          style={{
            lineColor: '#FF6B35',
            lineWidth: 4,
            lineOpacity: 0.8,
          }}
        />
      </MapboxGL.ShapeSource>
    );
  };

  const renderRouteInfo = () => {
    if (!routeData || isLoading) return null;

    return (
      <View style={styles.routeInfoContainer}>
        <View style={styles.routeInfo}>
          <Text style={styles.routeInfoTitle}>ルート情報</Text>
          <View style={styles.routeStats}>
            <View style={styles.routeStat}>
              <Text style={styles.routeStatValue}>{routeData.distance}km</Text>
              <Text style={styles.routeStatLabel}>距離</Text>
            </View>
            <View style={styles.routeStat}>
              <Text style={styles.routeStatValue}>{routeData.duration}分</Text>
              <Text style={styles.routeStatLabel}>所要時間</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <MapboxGL.MapView
        ref={mapRef}
        style={styles.map}
        styleURL="mapbox://styles/mapbox/streets-v11"
        logoEnabled={false}
        attributionEnabled={false}
      >
        <MapboxGL.Camera
          ref={cameraRef}
          zoomLevel={zoomLevel}
          centerCoordinate={mapCenter}
          animationMode="flyTo"
          animationDuration={1000}
        />

        {renderPickupMarker()}
        {renderDestinationMarker()}
        {renderRouteLayer()}
      </MapboxGL.MapView>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>ルート計算中...</Text>
        </View>
      )}

      {renderRouteInfo()}

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.recenterButton}
          onPress={() => {
            if (routeData) {
              fitMapToRoute(routeData.geometry);
            }
          }}
        >
          <Text style={styles.recenterButtonText}>🎯 全体表示</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Enhanced CustomerScreen with map integration
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import MapboxRouteMap from '../components/MapboxRouteMap';

const CustomerScreenWithMap = ({
  location,
  backendStatus,
  onModeSwitch,
  onBackToSelection,
  backendUrl
}) => {
  const [selectedStation, setSelectedStation] = useState(null);
  const [destination, setDestination] = useState('');
  const [fare, setFare] = useState(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [routeData, setRouteData] = useState(null);

  // Sample coordinates for testing (高蔵寺駅 to your address)
  const pickupCoords = selectedStation ? 
    [137.043394, 35.264311] : null; // 高蔵寺駅
  
  const destCoords = destination ? 
    [137.023075, 35.2554861] : null; // Your address

  const handleRouteCalculated = (route) => {
    setRouteData(route);
    
    // Calculate fare based on real distance
    const realDistance = parseFloat(route.distance);
    const baseFare = 500;
    let totalFare = baseFare;
    
    if (realDistance > 1.096) {
      const additionalDistance = realDistance - 1.096;
      const units = Math.ceil(additionalDistance / 0.255);
      totalFare += units * 100;
    }

    // Add time-based fare
    const timeFare = Math.floor(route.duration / 1.5) * 40;
    totalFare += timeFare;

    // Round to nearest 10 yen
    totalFare = Math.round(totalFare / 10) * 10;
    totalFare = Math.max(totalFare, 500);

    setFare({
      amount: totalFare,
      distance: realDistance,
      duration: route.duration,
      goSavings: Math.round(totalFare * 0.15),
      isRealDistance: true
    });
  };

  const renderMapSection = () => (
    <View style={styles.mapSection}>
      <TouchableOpacity
        style={styles.mapButton}
        onPress={() => setShowMapModal(true)}
        disabled={!selectedStation || !destination}
      >
        <Text style={styles.mapButtonText}>
          {selectedStation && destination ? '📍 ルートを表示' : '🗺️ 出発地と目的地を選択'}
        </Text>
      </TouchableOpacity>

      {routeData && (
        <View style={styles.routeSummary}>
          <Text style={styles.routeSummaryText}>
            距離: {routeData.distance}km • 時間: {routeData.duration}分
          </Text>
        </View>
      )}
    </View>
  );

  const renderMapModal = () => (
    <Modal
      visible={showMapModal}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <View style={styles.mapModalContainer}>
        <View style={styles.mapModalHeader}>
          <TouchableOpacity
            style={styles.mapModalCloseButton}
            onPress={() => setShowMapModal(false)}
          >
            <Text style={styles.mapModalCloseText}>✕ 閉じる</Text>
          </TouchableOpacity>
          <Text style={styles.mapModalTitle}>ルート確認</Text>
          <View style={styles.mapModalSpacer} />
        </View>

        <MapboxRouteMap
          pickupCoordinates={pickupCoords}
          destinationCoordinates={destCoords}
          pickupName={selectedStation?.name}
          destinationName={destination}
          onRouteCalculated={handleRouteCalculated}
        />

        <View style={styles.mapModalFooter}>
          <Text style={styles.mapModalRoute}>
            {selectedStation?.name} → {destination}
          </Text>
          {fare && (
            <Text style={styles.mapModalFare}>
              予想料金: ¥{fare.amount.toLocaleString()}
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Your existing header */}
      
      {/* Map Section */}
      {renderMapSection()}
      
      {/* Your existing station and destination selection */}
      
      {/* Enhanced fare display with map data */}
      {fare && (
        <View style={styles.fareContainer}>
          <Text style={styles.fareTitle}>
            💰 料金見積もり {fare.isRealDistance ? '(実測距離)' : '(推定)'}
          </Text>
          <Text style={styles.fareAmount}>¥{fare.amount.toLocaleString()}</Text>
          <Text style={styles.fareDetails}>
            距離: {fare.distance}km • 時間: {fare.duration}分
          </Text>
          <Text style={styles.goComparison}>
            GOより¥{fare.goSavings.toLocaleString()}お得！
          </Text>
        </View>
      )}
      
      {/* Map Modal */}
      {renderMapModal()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Map Component Styles
  map: {
    flex: 1,
  },
  pickupMarker: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  destinationMarker: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  markerText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  routeInfoContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
  },
  routeInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  routeInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  routeStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  routeStat: {
    alignItems: 'center',
  },
  routeStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  routeStatLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  controls: {
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
  recenterButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  recenterButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  // CustomerScreen Styles
  mapSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginTop: 15,
    borderRadius: 10,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  mapButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  mapButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  routeSummary: {
    marginTop: 10,
    alignItems: 'center',
  },
  routeSummaryText: {
    fontSize: 14,
    color: '#666',
  },
  
  // Map Modal Styles
  mapModalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  mapModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  mapModalCloseButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  mapModalCloseText: {
    fontSize: 16,
    color: '#FF6B35',
    fontWeight: '600',
  },
  mapModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  mapModalSpacer: {
    width: 60,
  },
  mapModalFooter: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  mapModalRoute: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  mapModalFare: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
    textAlign: 'center',
    marginTop: 5,
  },
  
  fareContainer: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginTop: 15,
    borderRadius: 10,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  fareTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  fareAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 8,
  },
  fareDetails: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  goComparison: {
    fontSize: 16,
    color: '#1976d2',
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default CustomerScreenWithMap;
