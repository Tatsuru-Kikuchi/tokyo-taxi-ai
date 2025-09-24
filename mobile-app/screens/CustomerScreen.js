import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Button,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import axios from 'axios';
import MapboxGL from '@rnmapbox/maps';
import allJapanStations from '../data/all_japan_stations.json';

MapboxGL.setAccessToken(Constants.manifest.extra.mapboxAccessToken);

const BACKEND_URL = 'https://tokyo-taxi-ai-production.up.railway.app';
const GEOCODING_URL = 'https://tokyo-taxi-jageocoder-production.up.railway.app';

export default function CustomerScreen({ navigation }) {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [nearbyStations, setNearbyStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [originText, setOriginText] = useState('Fetching current location...');
  const [destinationText, setDestinationText] = useState('Select a station');
  const [destinationCoordinates, setDestinationCoordinates] = useState(null);
  const cameraRef = useRef(null);
  const mapRef = useRef(null); // Reference to the MapboxGL.MapView component

  // Haversine formula to calculate distance between two lat/lon points
  const haversineDistance = (coords1, coords2) => {
    const toRad = (x) => (x * Math.PI) / 180;
    const R = 6371e3; // metres
    const φ1 = toRad(coords1.latitude);
    const φ2 = toRad(coords2.latitude);
    const Δφ = toRad(coords2.latitude - coords1.latitude);
    const Δλ = toRad(coords2.longitude - coords1.longitude);

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in meters
  };

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        Alert.alert('Location Permission Denied', 'Please enable location services to use this app.');
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
      reverseGeocode(currentLocation.coords.latitude, currentLocation.coords.longitude);

      // Filter nearby stations
      if (allJapanStations && currentLocation) {
        const userCoords = currentLocation.coords;
        const filteredStations = allJapanStations.features
          .map((feature) => {
            const stationCoords = {
              latitude: feature.geometry.coordinates[1],
              longitude: feature.geometry.coordinates[0],
            };
            const distance = haversineDistance(userCoords, stationCoords);
            return {
              ...feature,
              distance: distance, // distance in meters
            };
          })
          .filter((station) => station.distance <= 5000) // Filter within 5km radius
          .sort((a, b) => a.distance - b.distance); // Sort by closest
        setNearbyStations(filteredStations);
      }
    })();
  }, []);

  const reverseGeocode = async (latitude, longitude) => {
    try {
      const response = await axios.get(`${GEOCODING_URL}/reverse-geocode`, {
        params: { lat: latitude, lon: longitude },
      });
      if (response.data && response.data.address) {
        setOriginText(response.data.address);
      } else {
        setOriginText('Unknown Location');
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      setOriginText('Error fetching location address');
    }
  };

  const handleSelectStation = (station) => {
    setSelectedStation(station);
    setDestinationText(station.properties.P29_001); // Assuming P29_001 is station name
    setDestinationCoordinates([station.geometry.coordinates[0], station.geometry.coordinates[1]]); // [longitude, latitude]
    if (cameraRef.current && location) {
      // Fit bounds to show both user location and selected station
      const padding = [50, 50, 50, 50]; // Top, Right, Bottom, Left
      cameraRef.current.fitBounds(
        [location.coords.longitude, location.coords.latitude], // SW coordinate (effectively origin)
        [station.geometry.coordinates[0], station.geometry.coordinates[1]], // NE coordinate (effectively destination)
        padding,
        2000 // duration
      );
    }
  };

  const handleBookTaxi = async () => {
    if (!location || !selectedStation) {
      Alert.alert('Error', 'Please select your location and a destination station.');
      return;
    }

    setBookingModalVisible(true);
  };

  const confirmBooking = async () => {
    setIsLoading(true);
    setBookingModalVisible(false); // Close modal
    try {
      const bookingData = {
        customerId: 'customer123', // Replace with actual customer ID
        pickupLocation: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          address: originText,
        },
        destination: {
          latitude: selectedStation.geometry.coordinates[1],
          longitude: selectedStation.geometry.coordinates[0],
          name: selectedStation.properties.P29_001,
        },
        fare: 0, // This would be calculated by the backend
        estimatedTime: 0, // This would be calculated by the backend
      };

      const response = await axios.post(`${BACKEND_URL}/api/bookings`, bookingData);

      if (response.status === 201) {
        Alert.alert(
          'Booking Confirmed!',
          `Your taxi has been booked to ${selectedStation.properties.P29_001}. Driver will be assigned shortly.`
        );
        // Navigate to the MapScreen with origin and destination for customer to track
        navigation.navigate('Map', {
          origin: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
          destination: {
            latitude: selectedStation.geometry.coordinates[1],
            longitude: selectedStation.geometry.coordinates[0],
          },
          isCustomer: true, // Indicate that this view is for the customer
        });
      } else {
        Alert.alert('Booking Failed', 'Something went wrong. Please try again.');
      }
    } catch (error) {
      console.error('Error booking taxi:', error);
      Alert.alert('Booking Error', 'Could not book taxi. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (errorMsg) {
    return (
      <View style={styles.centered}>
        <Text>{errorMsg}</Text>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Fetching location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapboxGL.MapView style={styles.map} ref={mapRef}>
        <MapboxGL.Camera
          ref={cameraRef}
          zoomLevel={14}
          centerCoordinate={[location.coords.longitude, location.coords.latitude]}
          animationMode="flyTo"
          animationDuration={0}
        />

        {/* User's current location marker */}
        <MapboxGL.PointAnnotation
          id="userLocation"
          coordinate={[location.coords.longitude, location.coords.latitude]}
        >
          <View style={styles.userMarker}>
            <Text style={styles.markerText}>You</Text>
          </View>
          <MapboxGL.Callout title="Your Current Location" />
        </MapboxGL.PointAnnotation>

        {/* Selected station marker */}
        {selectedStation && (
          <MapboxGL.PointAnnotation
            id="selectedStation"
            coordinate={[selectedStation.geometry.coordinates[0], selectedStation.geometry.coordinates[1]]}
          >
            <View style={styles.stationMarker}>
              <Text style={styles.markerText}>{selectedStation.properties.P29_001}</Text>
            </View>
            <MapboxGL.Callout title={selectedStation.properties.P29_001} />
          </MapboxGL.PointAnnotation>
        )}
      </MapboxGL.MapView>

      <View style={styles.bottomSheet}>
        <Text style={styles.sheetTitle}>Your Ride Details</Text>

        <View style={styles.detailRow}>
          <Text style={styles.label}>From:</Text>
          <Text style={styles.value}>{originText}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>To:</Text>
          <Text style={styles.value}>{destinationText}</Text>
        </View>

        <Text style={styles.subTitle}>Nearby Stations (within 5km):</Text>
        {nearbyStations.length > 0 ? (
          <FlatList
            horizontal
            data={nearbyStations}
            keyExtractor={(item) => item.properties.P29_001 + item.geometry.coordinates[0]} // Unique key
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.stationButton,
                  selectedStation?.properties.P29_001 === item.properties.P29_001 && styles.selectedStationButton,
                ]}
                onPress={() => handleSelectStation(item)}
              >
                <Text
                  style={[
                    styles.stationButtonText,
                    selectedStation?.properties.P29_001 === item.properties.P29_001 && styles.selectedStationButtonText,
                  ]}
                >
                  {item.properties.P29_001} ({Math.round(item.distance / 100) / 10} km)
                </Text>
              </TouchableOpacity>
            )}
            showsHorizontalScrollIndicator={false}
            style={styles.stationList}
          />
        ) : (
          <Text>No stations found nearby.</Text>
        )}

        <TouchableOpacity
          style={[styles.bookButton, !selectedStation && styles.bookButtonDisabled]}
          onPress={handleBookTaxi}
          disabled={!selectedStation || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.bookButtonText}>Book Taxi</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Booking Confirmation Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={bookingModalVisible}
        onRequestClose={() => {
          setBookingModalVisible(!bookingModalVisible);
        }}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Confirm Booking</Text>
            <Text style={styles.modalText}>
              You are about to book a taxi from <Text style={{ fontWeight: 'bold' }}>{originText}</Text> to{' '}
              <Text style={{ fontWeight: 'bold' }}>{destinationText}</Text>.
            </Text>
            <Text style={styles.modalText}>Do you want to proceed?</Text>
            <View style={styles.modalButtons}>
              <Button title="Cancel" onPress={() => setBookingModalVisible(false)} color="#dc3545" />
              <Button title="Confirm" onPress={confirmBooking} color="#28a745" />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 2, // Map takes 2/3 of the screen
  },
  bottomSheet: {
    flex: 1, // Bottom sheet takes 1/3 of the screen
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  subTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    fontWeight: 'bold',
    marginRight: 5,
  },
  value: {
    flex: 1,
  },
  stationList: {
    marginBottom: 15,
  },
  stationButton: {
    backgroundColor: '#e0e0e0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  selectedStationButton: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  stationButtonText: {
    color: '#333',
    fontSize: 14,
  },
  selectedStationButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  bookButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  bookButtonDisabled: {
    backgroundColor: '#a0c7ff',
  },
  bookButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 10,
  },
  userMarker: {
    width: 25,
    height: 25,
    borderRadius: 12.5,
    backgroundColor: '#28a745',
    borderWidth: 3,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stationMarker: {
    width: 25,
    height: 25,
    borderRadius: 12.5,
    backgroundColor: '#007bff',
    borderWidth: 3,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 10,
  },
});