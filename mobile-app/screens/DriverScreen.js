import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import axios from 'axios';
import MapboxGL from '@rnmapbox/maps';

MapboxGL.setAccessToken(Constants.manifest.extra.mapboxAccessToken);

const BACKEND_URL = 'https://tokyo-taxi-ai-production.up.railway.app';
const GEOCODING_URL = 'https://tokyo-taxi-jageocoder-production.up.railway.app';

export default function DriverScreen({ navigation }) {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isDriverOnline, setIsDriverOnline] = useState(false);
  const [currentBooking, setCurrentBooking] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [originText, setOriginText] = useState('Fetching current location...');
  const [destinationText, setDestinationText] = useState('N/A');
  const locationSubscription = useRef(null);
  const bookingFetchInterval = useRef(null);
  const mapRef = useRef(null); // Reference to the MapboxGL.MapView component
  const cameraRef = useRef(null);

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
    })();

    // Cleanup on unmount
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
      if (bookingFetchInterval.current) {
        clearInterval(bookingFetchInterval.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isDriverOnline) {
      startLocationTracking();
      startFetchingBookings();
    } else {
      stopLocationTracking();
      stopFetchingBookings();
      setCurrentBooking(null); // Clear booking when offline
    }
  }, [isDriverOnline]);

  const startLocationTracking = async () => {
    if (locationSubscription.current) return; // Already tracking

    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 5000, // Update every 5 seconds
        distanceInterval: 10, // Update every 10 meters
      },
      (newLocation) => {
        setLocation(newLocation);
        // Optionally send location updates to backend here
        // sendDriverLocationToBackend(newLocation.coords);
      }
    );
  };

  const stopLocationTracking = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
  };

  const startFetchingBookings = () => {
    if (bookingFetchInterval.current) return; // Already fetching

    bookingFetchInterval.current = setInterval(fetchNewBookings, 10000); // Poll every 10 seconds
    fetchNewBookings(); // Fetch immediately on going online
  };

  const stopFetchingBookings = () => {
    if (bookingFetchInterval.current) {
      clearInterval(bookingFetchInterval.current);
      bookingFetchInterval.current = null;
    }
  };

  const fetchNewBookings = async () => {
    if (!isDriverOnline || currentBooking) return; // Only fetch if online and no current booking
    if (!location) {
        console.log("Driver location not available, skipping booking fetch.");
        return;
    }

    try {
      // In a real app, you'd send driverId and location for matching
      const response = await axios.get(`${BACKEND_URL}/api/bookings/available`, {
        params: {
          driverLat: location.coords.latitude,
          driverLon: location.coords.longitude,
        }
      });
      if (response.data && response.data.length > 0) {
        const booking = response.data[0]; // Take the first available booking
        Alert.alert(
          'New Ride Request!',
          `From: ${booking.pickupLocation.address}\nTo: ${booking.destination.name}\nAccept this ride?`,
          [
            { text: 'Decline', onPress: () => declineBooking(booking.id), style: 'cancel' },
            { text: 'Accept', onPress: () => acceptBooking(booking.id, booking) },
          ],
          { cancelable: false }
        );
      } else {
        // console.log("No new bookings available.");
      }
    } catch (error) {
      console.error('Error fetching new bookings:', error);
    }
  };

  const acceptBooking = async (bookingId, bookingDetails) => {
    setIsLoading(true);
    try {
      const response = await axios.put(`${BACKEND_URL}/api/bookings/${bookingId}/accept`, {
        driverId: 'driver123', // Replace with actual driver ID
        driverLocation: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
      });
      if (response.status === 200) {
        setCurrentBooking(bookingDetails);
        setOriginText(bookingDetails.pickupLocation.address);
        setDestinationText(bookingDetails.destination.name);
        Alert.alert('Ride Accepted!', 'Navigate to pickup location.');
        // Navigate to MapScreen to show the route to the customer's pickup
        navigation.navigate('Map', {
            origin: { // Driver's current location
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            },
            destination: { // Customer's pickup location
                latitude: bookingDetails.pickupLocation.latitude,
                longitude: bookingDetails.pickupLocation.longitude,
            },
            isDriver: true,
            driverLocation: { // Pass driver's current location to map
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            }
        });
      } else {
        Alert.alert('Error', 'Failed to accept booking. It might have been taken.');
      }
    } catch (error) {
      console.error('Error accepting booking:', error);
      Alert.alert('Error', 'Could not accept booking. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const declineBooking = async (bookingId) => {
    // Optionally send a decline signal to the backend
    try {
        await axios.put(`${BACKEND_URL}/api/bookings/${bookingId}/decline`, { driverId: 'driver123' });
        Alert.alert('Ride Declined', 'The ride request has been declined.');
    } catch (error) {
        console.error('Error declining booking:', error);
        Alert.alert('Error', 'Could not decline booking.');
    }
  };


  const completeRide = async () => {
    if (!currentBooking) return;

    setIsLoading(true);
    try {
      const response = await axios.put(`${BACKEND_URL}/api/bookings/${currentBooking.id}/complete`, {
        driverId: 'driver123', // Replace with actual driver ID
      });
      if (response.status === 200) {
        Alert.alert('Ride Completed!', 'Payment processed and ride finished.');
        setCurrentBooking(null);
        setOriginText('Fetching current location...');
        setDestinationText('N/A');
        reverseGeocode(location.coords.latitude, location.coords.longitude); // Update origin text
        // Reset map camera to driver's current location
        if (cameraRef.current && location) {
            cameraRef.current.setCamera({
                centerCoordinate: [location.coords.longitude, location.coords.latitude],
                zoomLevel: 14,
                animationMode: 'flyTo',
                animationDuration: 1000
            });
        }
      } else {
        Alert.alert('Error', 'Failed to complete ride.');
      }
    } catch (error) {
      console.error('Error completing ride:', error);
      Alert.alert('Error', 'Could not complete ride. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const startRide = () => {
    if (!currentBooking) return;
    Alert.alert('Ride Started!', 'Heading to destination.');
    // Navigate to MapScreen to show the route from pickup to final destination
    navigation.navigate('Map', {
        origin: { // Customer's pickup location
            latitude: currentBooking.pickupLocation.latitude,
            longitude: currentBooking.pickupLocation.longitude,
        },
        destination: { // Customer's final destination
            latitude: currentBooking.destination.latitude,
            longitude: currentBooking.destination.longitude,
        },
        isDriver: true,
        driverLocation: { // Pass driver's current location to map
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
        }
    });
  };

  const reverseGeocode = async (latitude, longitude) => {
    try {
      const response = await axios.get(`${GEOCODING_URL}/reverse-geocode`, {
        params: { lat: latitude, lon: longitude },
      });
      if (response.data && response.data.address) {
        if (!currentBooking) { // Only update originText if no active booking
            setOriginText(response.data.address);
        }
      } else {
        if (!currentBooking) {
            setOriginText('Unknown Location');
        }
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      if (!currentBooking) {
        setOriginText('Error fetching location address');
      }
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

        {/* Driver's current location marker */}
        <MapboxGL.PointAnnotation
          id="driverLocation"
          coordinate={[location.coords.longitude, location.coords.latitude]}
        >
          <View style={styles.driverMarker}>
            <Text style={styles.markerText}>You</Text>
          </View>
          <MapboxGL.Callout title="Your Current Location" />
        </MapboxGL.PointAnnotation>

        {/* Pickup and Destination markers for an active booking */}
        {currentBooking && (
            <>
                <MapboxGL.PointAnnotation
                    id="pickupLocation"
                    coordinate={[currentBooking.pickupLocation.longitude, currentBooking.pickupLocation.latitude]}
                >
                    <View style={styles.pickupMarker}>
                        <Text style={styles.markerText}>P</Text>
                    </View>
                    <MapboxGL.Callout title="Pickup Location" />
                </MapboxGL.PointAnnotation>

                <MapboxGL.PointAnnotation
                    id="dropoffLocation"
                    coordinate={[currentBooking.destination.longitude, currentBooking.destination.latitude]}
                >
                    <View style={styles.dropoffMarker}>
                        <Text style={styles.markerText}>D</Text>
                    </View>
                    <MapboxGL.Callout title="Drop-off Location" />
                </MapboxGL.PointAnnotation>
            </>
        )}
      </MapboxGL.MapView>

      <View style={styles.bottomSheet}>
        <Text style={styles.sheetTitle}>Driver Dashboard</Text>

        <View style={styles.statusContainer}>
          <Text style={styles.label}>Go Online:</Text>
          <Switch
            onValueChange={setIsDriverOnline}
            value={isDriverOnline}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={isDriverOnline ? '#f5dd4b' : '#f4f3f4'}
            ios_backgroundColor="#3e3e3e"
          />
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>Current Location:</Text>
          <Text style={styles.value}>{originText}</Text>
        </View>

        {currentBooking ? (
          <View>
            <Text style={styles.subTitle}>Active Ride:</Text>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Pickup:</Text>
              <Text style={styles.value}>{currentBooking.pickupLocation.address}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Drop-off:</Text>
              <Text style={styles.value}>{currentBooking.destination.name}</Text>
            </View>
            <View style={styles.actionButtons}>
                <TouchableOpacity
                    style={[styles.actionButton, styles.startButton]}
                    onPress={startRide}
                    disabled={isLoading}
                >
                    {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Start Ride</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionButton, styles.completeButton]}
                    onPress={completeRide}
                    disabled={isLoading}
                >
                    {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Complete Ride</Text>}
                </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.noBookingContainer}>
            <Text style={styles.noBookingText}>
              {isDriverOnline ? 'Waiting for ride requests...' : 'Go online to receive requests.'}
            </Text>
            {isDriverOnline && isLoading && <ActivityIndicator size="small" color="#007bff" />}
          </View>
        )}
      </View>
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
    fontSize: 18,
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
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  actionButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  startButton: {
    backgroundColor: '#007bff',
  },
  completeButton: {
    backgroundColor: '#28a745',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noBookingContainer: {
    alignItems: 'center',
    marginTop: 30,
  },
  noBookingText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  driverMarker: {
    width: 25,
    height: 25,
    borderRadius: 12.5,
    backgroundColor: '#007bff',
    borderWidth: 3,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickupMarker: {
    width: 25,
    height: 25,
    borderRadius: 12.5,
    backgroundColor: 'red',
    borderWidth: 3,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropoffMarker: {
    width: 25,
    height: 25,
    borderRadius: 12.5,
    backgroundColor: 'green',
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