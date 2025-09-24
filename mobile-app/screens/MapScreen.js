import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, Alert } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import Constants from 'expo-constants';
import axios from 'axios';

MapboxGL.setAccessToken(Constants.manifest.extra.mapboxAccessToken);

const MapScreen = ({ route, navigation }) => {
  const mapViewRef = useRef(null);
  const cameraRef = useRef(null);
  const { origin, destination, driverLocation, isDriver, isCustomer } = route.params || {};

  const [routeCoordinates, setRouteCoordinates] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState(null);

  useEffect(() => {
    if (!origin || !destination) {
      Alert.alert('Error', 'Origin or destination not provided for map.');
      navigation.goBack(); // Go back if no valid locations
      return;
    }
    fetchRoute();
  }, [origin, destination]);

  const fetchRoute = async () => {
    setLoadingRoute(true);
    setRouteError(null);
    try {
      const originCoords = `${origin.longitude},${origin.latitude}`;
      const destinationCoords = `${destination.longitude},${destination.latitude}`;
      const MAPBOX_DIRECTIONS_API_URL = `https://api.mapbox.com/directions/v5/mapbox/driving/${originCoords};${destinationCoords}`;

      const response = await axios.get(MAPBOX_DIRECTIONS_API_URL, {
        params: {
          alternatives: false,
          geometries: 'geojson',
          steps: false,
          access_token: Constants.manifest.extra.mapboxAccessToken,
        },
      });

      if (response.data.routes && response.data.routes.length > 0) {
        const route = response.data.routes[0];
        setRouteCoordinates(route.geometry); // GeoJSON LineString
        // Fit bounds to include the entire route
        if (mapViewRef.current && cameraRef.current) {
          const bounds = getBoundsForCoordinates([
            [origin.longitude, origin.latitude],
            [destination.longitude, destination.latitude],
          ]);
          cameraRef.current.fitBounds(
            bounds.southWest,
            bounds.northEast,
            [100, 100, 100, 100], // Padding
            2000 // Animation duration
          );
        }
      } else {
        setRouteError('No route found.');
        Alert.alert('Route Error', 'Could not find a driving route between the selected locations.');
      }
    } catch (error) {
      console.error('Error fetching route:', error);
      setRouteError('Failed to fetch route.');
      Alert.alert('Route Error', 'Failed to fetch route. Please check your internet connection.');
    } finally {
      setLoadingRoute(false);
    }
  };

  // Helper to calculate bounds for fitting
  const getBoundsForCoordinates = (coordsArray) => {
    let minLon = Infinity;
    let minLat = Infinity;
    let maxLon = -Infinity;
    let maxLat = -Infinity;

    coordsArray.forEach(coords => {
      minLon = Math.min(minLon, coords[0]);
      minLat = Math.min(minLat, coords[1]);
      maxLon = Math.max(maxLon, coords[0]);
      maxLat = Math.max(maxLat, coords[1]);
    });

    return {
      southWest: [minLon, minLat],
      northEast: [maxLon, maxLat],
    };
  };

  if (!origin || !destination) {
    return (
      <View style={styles.centered}>
        <Text>Missing route information.</Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <MapboxGL.MapView style={styles.map} ref={mapViewRef}>
        <MapboxGL.Camera
          ref={cameraRef}
          // Initial camera position, will be updated by fitBounds after route fetch
          zoomLevel={12}
          centerCoordinate={[origin.longitude, origin.latitude]}
          animationMode={'flyTo'}
          animationDuration={0} // No initial animation as fitBounds will animate
        />

        {/* Origin Marker */}
        <MapboxGL.PointAnnotation
          id="origin"
          coordinate={[origin.longitude, origin.latitude]}
        >
          <View style={styles.originMarker} />
          <MapboxGL.Callout title={isDriver ? "Pickup Location" : "Your Location"} />
        </MapboxGL.PointAnnotation>

        {/* Destination Marker */}
        <MapboxGL.PointAnnotation
          id="destination"
          coordinate={[destination.longitude, destination.latitude]}
        >
          <View style={styles.destinationMarker} />
          <MapboxGL.Callout title={isDriver ? "Drop-off Location" : "Destination"} />
        </MapboxGL.PointAnnotation>

        {/* Driver's current location marker (if applicable) */}
        {isDriver && driverLocation && (
          <MapboxGL.PointAnnotation
            id="driverCurrent"
            coordinate={[driverLocation.longitude, driverLocation.latitude]}
          >
            <View style={styles.driverMarker} />
            <MapboxGL.Callout title="Your Current Position" />
          </MapboxGL.PointAnnotation>
        )}

        {/* Route Line */}
        {routeCoordinates && (
          <MapboxGL.ShapeSource id="routeSource" shape={routeCoordinates}>
            <MapboxGL.LineLayer
              id="routeLine"
              style={{
                lineColor: isDriver ? '#007bff' : '#28a745', // Blue for driver, green for customer
                lineWidth: 5,
                lineOpacity: 0.8,
              }}
            />
          </MapboxGL.ShapeSource>
        )}
      </MapboxGL.MapView>

      {loadingRoute && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.loadingText}>Calculating route...</Text>
        </View>
      )}
      {routeError && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorText}>{routeError}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  errorOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 99, 71, 0.8)',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  errorText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  originMarker: {
    width: 25,
    height: 25,
    borderRadius: 12.5,
    backgroundColor: 'green',
    borderWidth: 3,
    borderColor: 'white',
  },
  destinationMarker: {
    width: 25,
    height: 25,
    borderRadius: 12.5,
    backgroundColor: 'red',
    borderWidth: 3,
    borderColor: 'white',
  },
  driverMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'purple',
    borderWidth: 3,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MapScreen;