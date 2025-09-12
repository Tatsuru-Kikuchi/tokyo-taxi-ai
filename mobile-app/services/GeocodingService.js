// mobile-app/services/GeocodingService.js
// Integration with JAGeocoder backend for precise Japanese geocoding

class GeocodingService {
  constructor(backendUrl) {
    this.backendUrl = backendUrl;
    this.cache = new Map(); // Cache geocoding results
  }

  /**
   * Geocode a Japanese address to coordinates
   * @param {string} address - Japanese address
   * @returns {Promise<Object>} Geocoded result
   */
  async geocodeAddress(address) {
    if (!address || !address.trim()) {
      return null;
    }

    const cleanAddress = address.trim();
    
    // Check cache first
    if (this.cache.has(cleanAddress)) {
      return this.cache.get(cleanAddress);
    }

    try {
      const response = await fetch(`${this.backendUrl}/api/geocode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: cleanAddress,
        }),
        timeout: 10000,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Cache the result
          this.cache.set(cleanAddress, data.result);
          return data.result;
        }
      }

      return null;
    } catch (error) {
      console.log('Geocoding error:', error);
      return null;
    }
  }

  /**
   * Reverse geocode coordinates to Japanese address
   * @param {number} latitude 
   * @param {number} longitude 
   * @returns {Promise<Object>} Reverse geocoded result
   */
  async reverseGeocode(latitude, longitude) {
    if (!latitude || !longitude) {
      return null;
    }

    const cacheKey = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await fetch(`${this.backendUrl}/api/reverse-geocode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: latitude,
          longitude: longitude,
        }),
        timeout: 10000,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          this.cache.set(cacheKey, data.result);
          return data.result;
        }
      }

      return null;
    } catch (error) {
      console.log('Reverse geocoding error:', error);
      return null;
    }
  }

  /**
   * Calculate realistic fare using actual distance
   * @param {string} stationName - Pickup station
   * @param {string} destinationAddress - Destination address
   * @returns {Promise<Object>} Fare calculation with real distance
   */
  async calculateRealisticFare(stationName, destinationAddress) {
    try {
      const response = await fetch(`${this.backendUrl}/api/calculate-fare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          station: stationName,
          destination: destinationAddress,
        }),
        timeout: 15000,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          return {
            distance: data.distance_km,
            baseFare: data.base_fare,
            totalFare: data.total_fare,
            breakdown: data.breakdown,
            isRealDistance: true,
          };
        }
      }

      return null;
    } catch (error) {
      console.log('Fare calculation error:', error);
      return null;
    }
  }

  /**
   * Get address suggestions for autocomplete
   * @param {string} partialAddress - Partial address input
   * @returns {Promise<Array>} Array of address suggestions
   */
  async getSuggestions(partialAddress) {
    if (!partialAddress || partialAddress.length < 2) {
      return [];
    }

    try {
      // This could be extended to provide address suggestions
      // For now, just return the geocoded result if valid
      const result = await this.geocodeAddress(partialAddress);
      if (result) {
        return [{
          address: result.formatted_address,
          coordinates: {
            latitude: result.latitude,
            longitude: result.longitude,
          },
          confidence: result.confidence,
        }];
      }

      return [];
    } catch (error) {
      console.log('Suggestions error:', error);
      return [];
    }
  }

  /**
   * Clear geocoding cache
   */
  clearCache() {
    this.cache.clear();
  }
}

// Enhanced CustomerScreen with JAGeocoder integration
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import allStationsData from '../data/all_japan_stations.json';

export default function CustomerScreenWithGeocoding({
  location,
  backendStatus,
  onModeSwitch,
  onBackToSelection,
  backendUrl
}) {
  const [selectedStation, setSelectedStation] = useState(null);
  const [destination, setDestination] = useState('');
  const [customDestination, setCustomDestination] = useState('');
  const [fare, setFare] = useState(null);
  const [isCalculatingFare, setIsCalculatingFare] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [geocodingService] = useState(new GeocodingService(backendUrl));

  useEffect(() => {
    // Initialize geocoding service and check if it's available
    checkGeocodingAvailability();
  }, []);

  useEffect(() => {
    if (selectedStation && destination) {
      calculateEnhancedFare();
    }
  }, [selectedStation, destination]);

  const checkGeocodingAvailability = async () => {
    try {
      // Test with a simple Tokyo address
      const testResult = await geocodingService.geocodeAddress('東京都');
      if (testResult) {
        console.log('✅ JAGeocoder backend available');
      } else {
        console.log('⚠️ JAGeocoder backend not available, using fallback');
      }
    } catch (error) {
      console.log('JAGeocoder test failed:', error);
    }
  };

  const calculateEnhancedFare = async () => {
    if (!selectedStation || !destination) return;

    setIsCalculatingFare(true);

    try {
      // Try to get realistic fare calculation using JAGeocoder
      const realisticFare = await geocodingService.calculateRealisticFare(
        selectedStation.name,
        destination
      );

      if (realisticFare) {
        // Use real distance-based fare
        setFare({
          amount: realisticFare.totalFare,
          distance: realisticFare.distance,
          surge: 0, // Apply surge separately if needed
          goSavings: Math.round(realisticFare.totalFare * 0.15),
          breakdown: realisticFare.breakdown,
          isRealDistance: true,
        });
      } else {
        // Fallback to estimation
        calculateFallbackFare();
      }
    } catch (error) {
      console.log('Enhanced fare calculation failed:', error);
      calculateFallbackFare();
    } finally {
      setIsCalculatingFare(false);
    }
  };

  const calculateFallbackFare = () => {
    // Your existing fare calculation logic as fallback
    const baseFare = 500;
    let estimatedDistance = 2.5;
    
    // Existing estimation logic...
    const destinationStr = destination?.toString() || '';
    
    if (destinationStr.includes('羽田空港') || destinationStr.includes('成田空港')) {
      estimatedDistance = destinationStr.includes('羽田') ? 22 : 65;
    } else if (destinationStr.length < 30 && !destinationStr.includes('県')) {
      estimatedDistance = 2 + Math.random() * 3;
    }

    let totalFare = baseFare + (estimatedDistance * 200);
    totalFare = Math.max(totalFare, 500);

    setFare({
      amount: totalFare,
      distance: estimatedDistance,
      surge: 0,
      goSavings: Math.round(totalFare * 0.15),
      isRealDistance: false,
    });
  };

  const handleDestinationInput = async (text) => {
    setCustomDestination(text);

    if (text.length >= 3) {
      try {
        const suggestions = await geocodingService.getSuggestions(text);
        setAddressSuggestions(suggestions);
        setShowSuggestions(suggestions.length > 0);
      } catch (error) {
        console.log('Suggestion error:', error);
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (suggestion) => {
    setDestination(suggestion.address);
    setCustomDestination('');
    setShowSuggestions(false);
  };

  const renderEnhancedFareDisplay = () => {
    if (!fare) return null;

    return (
      <View style={styles.fareContainer}>
        <Text style={styles.fareTitle}>
          💰 料金見積もり {fare.isRealDistance ? '(実距離計算)' : '(推定)'}
        </Text>
        
        {isCalculatingFare ? (
          <ActivityIndicator size="large" color="#2e7d32" />
        ) : (
          <View style={styles.fareDetails}>
            <Text style={styles.fareAmount}>¥{fare.amount.toLocaleString()}</Text>
            <Text style={styles.fareDistance}>
              距離: {fare.isRealDistance ? '実測' : '約'}{fare.distance}km
            </Text>
            
            {fare.breakdown && (
              <View style={styles.fareBreakdown}>
                <Text style={styles.breakdownTitle}>内訳:</Text>
                <Text style={styles.breakdownItem}>基本料金: ¥{fare.breakdown.base}</Text>
                {fare.breakdown.distance > 0 && (
                  <Text style={styles.breakdownItem}>距離料金: ¥{fare.breakdown.distance}</Text>
                )}
                {fare.breakdown.time > 0 && (
                  <Text style={styles.breakdownItem}>時間料金: ¥{fare.breakdown.time}</Text>
                )}
              </View>
            )}
            
            <Text style={styles.goComparison}>
              GOより¥{fare.goSavings.toLocaleString()}お得！
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderAddressInput = () => (
    <View style={styles.addressInputContainer}>
      <Text style={styles.customInputLabel}>住所を入力:</Text>
      <TextInput
        style={styles.customInput}
        value={customDestination}
        onChangeText={handleDestinationInput}
        placeholder="例: 愛知県春日井市○○町1-2-3"
        onSubmitEditing={() => {
          if (customDestination.trim()) {
            setDestination(customDestination.trim());
            setCustomDestination('');
            setShowSuggestions(false);
          }
        }}
      />
      
      {showSuggestions && (
        <View style={styles.suggestionsContainer}>
          {addressSuggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestionItem}
              onPress={() => selectSuggestion(suggestion)}
            >
              <Text style={styles.suggestionText}>{suggestion.address}</Text>
              <Text style={styles.suggestionConfidence}>
                信頼度: {Math.round(suggestion.confidence * 100)}%
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Your existing header and station selection */}
      
      {/* Enhanced address input with suggestions */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>📍 目的地</Text>
        {renderAddressInput()}
        
        {destination && (
          <View style={styles.selectedDestination}>
            <Text style={styles.selectedDestinationText}>選択済み: {destination}</Text>
          </View>
        )}
      </View>

      {/* Enhanced fare display */}
      {renderEnhancedFareDisplay()}

      {/* Your existing booking button and modals */}
    </ScrollView>
  );
}

const enhancedStyles = StyleSheet.create({
  addressInputContainer: {
    position: 'relative',
  },
  suggestionsContainer: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderTopWidth: 0,
    borderRadius: 8,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    maxHeight: 200,
  },
  suggestionItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionText: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 4,
  },
  suggestionConfidence: {
    fontSize: 12,
    color: '#666666',
  },
  fareBreakdown: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  breakdownItem: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  selectedDestination: {
    backgroundColor: '#e3f2fd',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  selectedDestinationText: {
    fontSize: 14,
    color: '#1976d2',
    fontWeight: '500',
  },
});

export { GeocodingService };
export default CustomerScreenWithGeocoding;
