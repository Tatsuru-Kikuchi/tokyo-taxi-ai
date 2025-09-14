import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Switch,
  Alert,
  Platform,
  SafeAreaView,
  WebView,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

// Backend URLs
const BACKEND_URL = 'https://tokyo-taxi-ai-production.up.railway.app';
const JAGEOCODER_URL = 'https://tokyo-taxi-jageocoder-production.up.railway.app';

export default function DriverScreen({ onModeChange, onBack }) {
  const [isIPad] = useState(Platform.isPad);
  const [isOnline, setIsOnline] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [dailyEarnings, setDailyEarnings] = useState(28500);
  const [totalRides, setTotalRides] = useState(12);
  const [averageRating, setAverageRating] = useState(4.8);
  const [autoAccept, setAutoAccept] = useState(false);
  const [showRideRequest, setShowRideRequest] = useState(false);
  const [showDemandMap, setShowDemandMap] = useState(false);
  const [currentRideRequest, setCurrentRideRequest] = useState(null);

  // Service status
  const [serviceStatus, setServiceStatus] = useState({
    backend: false,
    jageocoder: false,
    driversOnline: 0
  });

  useEffect(() => {
    initializeDriver();
    if (isOnline) {
      simulateRideRequests();
    }
  }, [isOnline]);

  const initializeDriver = async () => {
    await checkServiceStatus();
    await initializeLocation();
  };

  const checkServiceStatus = async () => {
    console.log('Checking driver services status...');

    // Check main backend
    try {
      const response = await fetch(`${BACKEND_URL}/api/health`, { timeout: 5000 });
      const data = await response.json();
      console.log('Backend status:', data.status);
      setServiceStatus(prev => ({
        ...prev,
        backend: data.status === 'healthy'
      }));
    } catch (error) {
      console.log('Backend connection failed:', error.message);
    }

    // Check JAGeocoder service
    try {
      const response = await fetch(`${JAGEOCODER_URL}/health`, { timeout: 5000 });
      const data = await response.json();
      console.log('JAGeocoder status:', data.status);
      setServiceStatus(prev => ({
        ...prev,
        jageocoder: data.status === 'healthy'
      }));
    } catch (error) {
      console.log('JAGeocoder connection failed:', error.message);
    }
  };

  const initializeLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('位置情報', '位置情報のアクセス許可が必要です');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      console.log('Driver location:', location.coords);

      // Update driver location on backend
      updateDriverLocation(location.coords);
    } catch (error) {
      console.log('Location error:', error);
      // Use Nagoya as fallback for demo
      const fallbackLocation = {
        latitude: 35.181770,
        longitude: 136.906398
      };
      setUserLocation(fallbackLocation);
      updateDriverLocation(fallbackLocation);
    }
  };

  const updateDriverLocation = async (coords) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/drivers/location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          driver_id: 'driver_001',
          latitude: coords.latitude,
          longitude: coords.longitude,
          is_online: isOnline
        })
      });

      if (response.ok) {
        console.log('Driver location updated successfully');
      } else {
        console.log('Location update failed');
      }
    } catch (error) {
      console.log('Location update error:', error.message);
    }
  };

  const toggleOnlineStatus = async () => {
    const newStatus = !isOnline;
    setIsOnline(newStatus);

    if (userLocation) {
      updateDriverLocation(userLocation);
    }

    if (newStatus) {
      Alert.alert('オンライン', 'ドライバーモードがオンになりました。配車リクエストを受信できます。');
    } else {
      Alert.alert('オフライン', 'ドライバーモードがオフになりました。');
    }
  };

  const simulateRideRequests = () => {
    if (!isOnline) return;

    // Simulate ride requests every 20-40 seconds
    const timeout = Math.random() * 20000 + 20000;

    setTimeout(() => {
      if (isOnline) {
        const requests = [
          {
            id: 'req_001',
            pickup_location: '名古屋駅',
            pickup_address: '愛知県名古屋市中村区名駅1-1-4',
            destination: '栄駅',
            estimated_fare: 1800,
            distance: 3.2,
            customer_name: '田中様',
            estimated_time: 12
          },
          {
            id: 'req_002',
            pickup_location: '金山駅',
            pickup_address: '愛知県名古屋市中区金山1-17-18',
            destination: '春日井市大留町',
            estimated_fare: 3200,
            distance: 12.5,
            customer_name: '佐藤様',
            estimated_time: 35
          },
          {
            id: 'req_003',
            pickup_location: '栄駅',
            pickup_address: '愛知県名古屋市中区栄3-4-5',
            destination: '千種駅',
            estimated_fare: 2200,
            distance: 4.1,
            customer_name: '山田様',
            estimated_time: 15
          },
          {
            id: 'req_004',
            pickup_location: '大曽根駅',
            pickup_address: '愛知県名古屋市東区大曽根3-14-35',
            destination: '愛知県春日井市大留町5-29-20',
            estimated_fare: 2800,
            distance: 8.3,
            customer_name: '鈴木様',
            estimated_time: 25
          }
        ];

        const randomRequest = requests[Math.floor(Math.random() * requests.length)];
        setCurrentRideRequest(randomRequest);
        setShowRideRequest(true);

        // Auto-accept if enabled
        if (autoAccept) {
          setTimeout(() => acceptRide(randomRequest), 2000);
        }

        // Continue simulation
        simulateRideRequests();
      }
    }, timeout);
  };

  const acceptRide = async (request) => {
    console.log('Accepting ride:', request.id);
    setShowRideRequest(false);
    setCurrentRideRequest(null);

    // Try to submit to backend
    try {
      const bookingData = {
        pickup_location: request.pickup_location,
        destination: request.destination,
        estimated_fare: request.estimated_fare,
        distance_km: request.distance,
        customer_name: request.customer_name,
        driver_id: 'driver_001',
        status: 'accepted',
        accepted_time: new Date().toISOString()
      };

      const response = await fetch(`${BACKEND_URL}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData)
      });

      if (response.ok) {
        console.log('Ride booking recorded successfully');
      } else {
        console.log('Booking recording failed');
      }
    } catch (error) {
      console.log('Booking recording error:', error.message);
    }

    // Update local stats
    setDailyEarnings(prev => prev + request.estimated_fare);
    setTotalRides(prev => prev + 1);

    Alert.alert(
      '配車受付完了',
      `${request.customer_name}の配車を受け付けました。\n` +
      `料金: ¥${request.estimated_fare.toLocaleString()}\n` +
      `距離: ${request.distance}km\n` +
      `予想時間: ${request.estimated_time}分`,
      [{ text: 'OK' }]
    );
  };

  const declineRide = () => {
    console.log('Declining ride');
    setShowRideRequest(false);
    setCurrentRideRequest(null);
  };

  const generateDemandMapHTML = () => {
    const mapboxApiKey = 'pk.eyJ1IjoidGF0c3VydS1raWt1Y2hpIiwiYSI6ImNtZmdrOWNuNDAxcHMya3E0Z3F6ZzR6ODYifQ.DgYnz9Iwp6SBEK_AXeAEWg';

    const center = userLocation ?
      [userLocation.longitude, userLocation.latitude] :
      [136.906398, 35.181770]; // Nagoya fallback

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset='utf-8' />
        <title>需要マップ - ドライバー向け</title>
        <meta name='viewport' content='initial-scale=1,maximum-scale=1,user-scalable=no' />
        <script src='https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js'></script>
        <link href='https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css' rel='stylesheet' />
        <style>
            body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
            #map { position: absolute; top: 0; bottom: 0; width: 100%; }
            .legend {
                position: absolute;
                top: 10px;
                left: 10px;
                background: rgba(255,255,255,0.95);
                padding: 15px;
                border-radius: 12px;
                font-size: 14px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                z-index: 1000;
                max-width: 280px;
            }
            .legend-title {
                font-weight: 600;
                margin-bottom: 12px;
                color: #1D1D1F;
                font-size: 16px;
            }
            .legend-item {
                display: flex;
                align-items: center;
                margin-bottom: 8px;
            }
            .legend-color {
                width: 16px;
                height: 16px;
                border-radius: 50%;
                margin-right: 10px;
                border: 2px solid rgba(255,255,255,0.8);
            }
            .high-demand { background-color: #FF4444; }
            .medium-demand { background-color: #FF9800; }
            .your-location { background-color: #00C853; }
            .stats-info {
                position: absolute;
                bottom: 10px;
                left: 10px;
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 12px;
                border-radius: 8px;
                font-size: 13px;
                z-index: 1000;
            }
        </style>
    </head>
    <body>
        <div id='map'></div>
        <div class='legend'>
            <div class='legend-title'>需要マップ</div>
            <div class='legend-item'>
                <div class='legend-color high-demand'></div>
                <span>高需要エリア (¥3,500/時)</span>
            </div>
            <div class='legend-item'>
                <div class='legend-color medium-demand'></div>
                <span>中需要エリア (¥2,800/時)</span>
            </div>
            <div class='legend-item'>
                <div class='legend-color your-location'></div>
                <span>あなたの現在地</span>
            </div>
        </div>

        <div class='stats-info'>
            <div>オンライン: ${isOnline ? 'はい' : 'いいえ'}</div>
            <div>本日の収入: ¥${dailyEarnings.toLocaleString()}</div>
            <div>配車回数: ${totalRides}回</div>
        </div>

        <script>
            mapboxgl.accessToken = '${mapboxApiKey}';

            const map = new mapboxgl.Map({
                container: 'map',
                style: 'mapbox://styles/mapbox/streets-v11',
                center: [${center[0]}, ${center[1]}],
                zoom: 12
            });

            map.on('load', function() {
                // High demand areas (major stations and business districts)
                const highDemandAreas = [
                    {
                        center: [136.881636, 35.170694],
                        name: '名古屋駅',
                        details: 'ビジネス街・新幹線ターミナル',
                        hourlyRate: '¥3,500',
                        waitingPassengers: 12
                    },
                    {
                        center: [136.908245, 35.168058],
                        name: '栄エリア',
                        details: 'ショッピング・エンターテインメント',
                        hourlyRate: '¥3,200',
                        waitingPassengers: 8
                    },
                    {
                        center: [136.900656, 35.143033],
                        name: '金山駅',
                        details: '交通ハブ・オフィス街',
                        hourlyRate: '¥2,900',
                        waitingPassengers: 5
                    }
                ];

                // Medium demand areas
                const mediumDemandAreas = [
                    {
                        center: [136.931411, 35.166584],
                        name: '千種駅',
                        details: '住宅・大学エリア',
                        hourlyRate: '¥2,400',
                        waitingPassengers: 3
                    },
                    {
                        center: [136.928358, 35.184089],
                        name: '大曽根駅',
                        details: '住宅・商業エリア',
                        hourlyRate: '¥2,600',
                        waitingPassengers: 4
                    },
                    {
                        center: [137.023075, 35.2554861],
                        name: '春日井市大留町',
                        details: '住宅エリア',
                        hourlyRate: '¥2,200',
                        waitingPassengers: 2
                    }
                ];

                // Add high demand markers
                highDemandAreas.forEach(area => {
                    new mapboxgl.Marker({
                        color: '#FF4444',
                        scale: 1.2
                    })
                    .setLngLat(area.center)
                    .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(
                        '<div style="padding: 8px; min-width: 200px;">' +
                        '<h3 style="margin: 0 0 8px 0; color: #FF4444;">' + area.name + '</h3>' +
                        '<p style="margin: 4px 0; font-size: 13px;">' + area.details + '</p>' +
                        '<div style="border-top: 1px solid #eee; padding-top: 8px; margin-top: 8px;">' +
                        '<div><strong>予想収入:</strong> ' + area.hourlyRate + '/時</div>' +
                        '<div><strong>待機中:</strong> ' + area.waitingPassengers + '人</div>' +
                        '<div style="margin-top: 8px; padding: 4px 8px; background: #fff2f2; border-radius: 4px; font-size: 12px; color: #d32f2f;">高収入エリア</div>' +
                        '</div>' +
                        '</div>'
                    ))
                    .addTo(map);

                    // Add demand circle
                    map.addSource('high-demand-' + area.name, {
                        'type': 'geojson',
                        'data': {
                            'type': 'Feature',
                            'geometry': {
                                'type': 'Point',
                                'coordinates': area.center
                            }
                        }
                    });

                    map.addLayer({
                        'id': 'high-demand-circle-' + area.name,
                        'type': 'circle',
                        'source': 'high-demand-' + area.name,
                        'paint': {
                            'circle-radius': 80,
                            'circle-color': '#FF4444',
                            'circle-opacity': 0.1,
                            'circle-stroke-width': 2,
                            'circle-stroke-color': '#FF4444',
                            'circle-stroke-opacity': 0.4
                        }
                    });
                });

                // Add medium demand markers
                mediumDemandAreas.forEach(area => {
                    new mapboxgl.Marker({
                        color: '#FF9800',
                        scale: 0.9
                    })
                    .setLngLat(area.center)
                    .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(
                        '<div style="padding: 8px; min-width: 180px;">' +
                        '<h3 style="margin: 0 0 8px 0; color: #FF9800;">' + area.name + '</h3>' +
                        '<p style="margin: 4px 0; font-size: 13px;">' + area.details + '</p>' +
                        '<div style="border-top: 1px solid #eee; padding-top: 8px; margin-top: 8px;">' +
                        '<div><strong>予想収入:</strong> ' + area.hourlyRate + '/時</div>' +
                        '<div><strong>待機中:</strong> ' + area.waitingPassengers + '人</div>' +
                        '<div style="margin-top: 8px; padding: 4px 8px; background: #fff8e1; border-radius: 4px; font-size: 12px; color: #f57c00;">中収入エリア</div>' +
                        '</div>' +
                        '</div>'
                    ))
                    .addTo(map);

                    // Add demand circle
                    map.addSource('med-demand-' + area.name, {
                        'type': 'geojson',
                        'data': {
                            'type': 'Feature',
                            'geometry': {
                                'type': 'Point',
                                'coordinates': area.center
                            }
                        }
                    });

                    map.addLayer({
                        'id': 'med-demand-circle-' + area.name,
                        'type': 'circle',
                        'source': 'med-demand-' + area.name,
                        'paint': {
                            'circle-radius': 60,
                            'circle-color': '#FF9800',
                            'circle-opacity': 0.08,
                            'circle-stroke-width': 1.5,
                            'circle-stroke-color': '#FF9800',
                            'circle-stroke-opacity': 0.3
                        }
                    });
                });

                // Add your location
                new mapboxgl.Marker({
                    color: '#00C853',
                    scale: 1.1
                })
                .setLngLat([${center[0]}, ${center[1]}])
                .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(
                    '<div style="padding: 8px;">' +
                    '<h3 style="margin: 0 0 8px 0; color: #00C853;">あなたの現在地</h3>' +
                    '<div><strong>ステータス:</strong> ${isOnline ? 'オンライン' : 'オフライン'}</div>' +
                    '<div><strong>本日の収入:</strong> ¥${dailyEarnings.toLocaleString()}</div>' +
                    '<div><strong>配車回数:</strong> ${totalRides}回</div>' +
                    '<div><strong>評価:</strong> ${averageRating}★</div>' +
                    '</div>'
                ))
                .addTo(map);

                // Add navigation controls
                map.addControl(new mapboxgl.NavigationControl(), 'top-right');
            });
        </script>
    </body>
    </html>
    `;
  };

  const renderServiceStatus = () => (
    <View style={styles.serviceStatus}>
      <Text style={styles.serviceStatusTitle}>サービス状況</Text>
      <View style={styles.serviceStatusRow}>
        <Text style={styles.serviceStatusText}>
          バックエンド: {serviceStatus.backend ? '✅' : '❌'}
        </Text>
        <Text style={styles.serviceStatusText}>
          JAGeocoder: {serviceStatus.jageocoder ? '✅' : '❌'}
        </Text>
      </View>
    </View>
  );

  const renderOnlineCard = () => (
    <View style={[styles.card, isIPad && styles.cardIPad]}>
      <View style={styles.onlineHeader}>
        <Text style={[styles.cardTitle, isIPad && styles.cardTitleIPad]}>
          ドライバーステータス
        </Text>
        <Switch
          value={isOnline}
          onValueChange={toggleOnlineStatus}
          trackColor={{ false: '#C7C7CC', true: '#34C759' }}
          thumbColor={isOnline ? '#FFFFFF' : '#F4F3F4'}
          style={isIPad && styles.switchIPad}
        />
      </View>

      <Text style={[styles.onlineStatus, isIPad && styles.onlineStatusIPad]}>
        {isOnline ? '🟢 オンライン - 配車受付中' : '🔴 オフライン'}
      </Text>

      {isOnline && (
        <View style={styles.autoAcceptContainer}>
          <Text style={[styles.autoAcceptLabel, isIPad && styles.autoAcceptLabelIPad]}>自動受付</Text>
          <Switch
            value={autoAccept}
            onValueChange={setAutoAccept}
            trackColor={{ false: '#C7C7CC', true: '#007AFF' }}
            thumbColor={autoAccept ? '#FFFFFF' : '#F4F3F4'}
            style={isIPad && styles.switchIPad}
          />
        </View>
      )}
    </View>
  );

  const renderStatsCard = () => (
    <View style={[styles.card, isIPad && styles.cardIPad]}>
      <Text style={[styles.cardTitle, isIPad && styles.cardTitleIPad]}>今日の実績</Text>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, isIPad && styles.statValueIPad]}>
            ¥{dailyEarnings.toLocaleString()}
          </Text>
          <Text style={[styles.statLabel, isIPad && styles.statLabelIPad]}>売上</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={[styles.statValue, isIPad && styles.statValueIPad]}>
            {totalRides}
          </Text>
          <Text style={[styles.statLabel, isIPad && styles.statLabelIPad]}>配車回数</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={[styles.statValue, isIPad && styles.statValueIPad]}>
            {averageRating}
          </Text>
          <Text style={[styles.statLabel, isIPad && styles.statLabelIPad]}>評価</Text>
        </View>
      </View>
    </View>
  );

  const renderAIRecommendations = () => (
    <View style={[styles.card, isIPad && styles.cardIPad]}>
      <Text style={[styles.cardTitle, isIPad && styles.cardTitleIPad]}>
        AI需要予測
      </Text>

      <View style={styles.recommendationItem}>
        <View style={styles.recommendationHeader}>
          <Text style={[styles.recommendationTitle, isIPad && styles.recommendationTitleIPad]}>
            🔥 名古屋駅周辺
          </Text>
          <Text style={[styles.demandLevel, styles.highDemand, isIPad && styles.demandLevelIPad]}>
            需要：高
          </Text>
        </View>
        <Text style={[styles.recommendationText, isIPad && styles.recommendationTextIPad]}>
          ビジネス街での会議終了時間。予想収入: ¥3,500/時
        </Text>
      </View>

      <View style={styles.recommendationItem}>
        <View style={styles.recommendationHeader}>
          <Text style={[styles.recommendationTitle, isIPad && styles.recommendationTitleIPad]}>
            📍 栄エリア
          </Text>
          <Text style={[styles.demandLevel, styles.mediumDemand, isIPad && styles.demandLevelIPad]}>
            需要：中
          </Text>
        </View>
        <Text style={[styles.recommendationText, isIPad && styles.recommendationTextIPad]}>
          ショッピングエリア。予想収入: ¥2,800/時
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.demandMapButton, isIPad && styles.demandMapButtonIPad]}
        onPress={() => setShowDemandMap(true)}
      >
        <Ionicons name="map" size={isIPad ? 28 : 20} color="#007AFF" />
        <Text style={[styles.demandMapButtonText, isIPad && styles.demandMapButtonTextIPad]}>
          需要マップを表示
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderGoComparison = () => (
    <View style={[styles.card, isIPad && styles.cardIPad, styles.comparisonCard]}>
      <Text style={[styles.cardTitle, isIPad && styles.cardTitleIPad]}>
        手数料比較
      </Text>

      <View style={styles.comparisonRow}>
        <View style={styles.comparisonItem}>
          <Text style={[styles.comparisonLabel, isIPad && styles.comparisonLabelIPad]}>
            全国AIタクシー
          </Text>
          <Text style={[styles.comparisonValue, styles.ourRate, isIPad && styles.comparisonValueIPad]}>
            15%
          </Text>
        </View>

        <View style={styles.comparisonVs}>
          <Text style={[styles.vsText, isIPad && styles.vsTextIPad]}>VS</Text>
        </View>

        <View style={styles.comparisonItem}>
          <Text style={[styles.comparisonLabel, isIPad && styles.comparisonLabelIPad]}>
            GO
          </Text>
          <Text style={[styles.comparisonValue, styles.competitorRate, isIPad && styles.comparisonValueIPad]}>
            25%
          </Text>
        </View>
      </View>

      <Text style={[styles.savingsText, isIPad && styles.savingsTextIPad]}>
        月間 ¥50,000の売上で ¥5,000 お得！
      </Text>
    </View>
  );

  const renderRideRequestModal = () => (
    <Modal
      visible={showRideRequest}
      transparent={true}
      animationType="fade"
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.rideRequestModal, isIPad && styles.rideRequestModalIPad]}>
          <Text style={[styles.modalTitle, isIPad && styles.modalTitleIPad]}>
            配車リクエスト
          </Text>

          {currentRideRequest && (
            <View style={styles.requestDetails}>
              <View style={styles.requestItem}>
                <Text style={styles.requestLabel}>乗客</Text>
                <Text style={[styles.requestValue, isIPad && styles.requestValueIPad]}>
                  {currentRideRequest.customer_name}
                </Text>
              </View>

              <View style={styles.requestItem}>
                <Text style={styles.requestLabel}>乗車地</Text>
                <Text style={[styles.requestValue, isIPad && styles.requestValueIPad]}>
                  {currentRideRequest.pickup_location}
                </Text>
              </View>

              <View style={styles.requestItem}>
                <Text style={styles.requestLabel}>目的地</Text>
                <Text style={[styles.requestValue, isIPad && styles.requestValueIPad]}>
                  {currentRideRequest.destination}
                </Text>
              </View>

              <View style={styles.requestItem}>
                <Text style={styles.requestLabel}>予想料金</Text>
                <Text style={[styles.requestValue, styles.fareValue, isIPad && styles.requestValueIPad]}>
                  ¥{currentRideRequest.estimated_fare.toLocaleString()}
                </Text>
              </View>

              <View style={styles.requestItem}>
                <Text style={styles.requestLabel}>距離・時間</Text>
                <Text style={[styles.requestValue, isIPad && styles.requestValueIPad]}>
                  {currentRideRequest.distance}km • {currentRideRequest.estimated_time}分
                </Text>
              </View>
            </View>
          )}

          <View style={styles.requestButtons}>
            <TouchableOpacity
              style={[styles.declineButton, isIPad && styles.requestButtonIPad]}
              onPress={declineRide}
            >
              <Text style={[styles.declineButtonText, isIPad && styles.requestButtonTextIPad]}>
                辞退
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.acceptButton, isIPad && styles.requestButtonIPad]}
              onPress={() => acceptRide(currentRideRequest)}
            >
              <Text style={[styles.acceptButtonText, isIPad && styles.requestButtonTextIPad]}>
                受付
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderDemandMapModal = () => (
    <Modal
      visible={showDemandMap}
      transparent={false}
      animationType="slide"
    >
      <SafeAreaView style={styles.mapModalContainer}>
        <View style={[styles.mapHeader, isIPad && styles.mapHeaderIPad]}>
          <TouchableOpacity onPress={() => setShowDemandMap(false)}>
            <Ionicons name="close" size={isIPad ? 32 : 24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={[styles.mapTitle, isIPad && styles.mapTitleIPad]}>
            需要マップ
          </Text>
          <View style={{ width: isIPad ? 32 : 24 }} />
        </View>

        <WebView
          source={{ html: generateDemandMapHTML() }}
          style={styles.webView}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={[styles.container, isIPad && styles.containerIPad]}>
      <View style={[styles.header, isIPad && styles.headerIPad]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={isIPad ? 32 : 24} color="#007AFF" />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, isIPad && styles.headerTitleIPad]}>
          ドライバー
        </Text>

        <TouchableOpacity onPress={() => onModeChange('customer')} style={styles.switchButton}>
          <Text style={[styles.switchButtonText, isIPad && styles.switchButtonTextIPad]}>
            乗客
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderServiceStatus()}
        {renderOnlineCard()}
        {renderStatsCard()}
        {renderAIRecommendations()}
        {renderGoComparison()}
      </ScrollView>

      {renderRideRequestModal()}
      {renderDemandMapModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  containerIPad: {
    paddingHorizontal: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  headerIPad: {
    paddingHorizontal: 40,
    paddingVertical: 25,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  headerTitleIPad: {
    fontSize: 24,
  },
  switchButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 20,
  },
  switchButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  switchButtonTextIPad: {
    fontSize: 18,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  serviceStatus: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2196F3',
    marginBottom: 16,
  },
  serviceStatusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 8,
  },
  serviceStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  serviceStatusText: {
    fontSize: 14,
    color: '#1976D2',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardIPad: {
    padding: 30,
    borderRadius: 16,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 16,
  },
  cardTitleIPad: {
    fontSize: 24,
    marginBottom: 24,
  },
  onlineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  switchIPad: {
    transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }],
  },
  onlineStatus: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 16,
  },
  onlineStatusIPad: {
    fontSize: 20,
  },
  autoAcceptContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  autoAcceptLabel: {
    fontSize: 16,
    color: '#1D1D1F',
  },
  autoAcceptLabelIPad: {
    fontSize: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  statValueIPad: {
    fontSize: 32,
  },
  statLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  statLabelIPad: {
    fontSize: 18,
  },
  recommendationItem: {
    marginBottom: 16,
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  recommendationTitleIPad: {
    fontSize: 20,
  },
  demandLevel: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  demandLevelIPad: {
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  highDemand: {
    backgroundColor: '#FFE5E5',
    color: '#D32F2F',
  },
  mediumDemand: {
    backgroundColor: '#FFF3E0',
    color: '#F57C00',
  },
  recommendationText: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
  recommendationTextIPad: {
    fontSize: 18,
  },
  demandMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
  },
  demandMapButtonIPad: {
    padding: 18,
    borderRadius: 12,
  },
  demandMapButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
    marginLeft: 8,
  },
  demandMapButtonTextIPad: {
    fontSize: 20,
  },
  comparisonCard: {
    backgroundColor: '#F0F8FF',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  comparisonItem: {
    alignItems: 'center',
    flex: 1,
  },
  comparisonVs: {
    marginHorizontal: 20,
  },
  vsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
  },
  vsTextIPad: {
    fontSize: 20,
  },
  comparisonLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
    textAlign: 'center',
  },
  comparisonLabelIPad: {
    fontSize: 18,
  },
  comparisonValue: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  comparisonValueIPad: {
    fontSize: 36,
  },
  ourRate: {
    color: '#34C759',
  },
  competitorRate: {
    color: '#FF3B30',
  },
  savingsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    textAlign: 'center',
  },
  savingsTextIPad: {
    fontSize: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rideRequestModal: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    maxWidth: 400,
    width: '90%',
  },
  rideRequestModalIPad: {
    padding: 40,
    maxWidth: 600,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1D1D1F',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalTitleIPad: {
    fontSize: 28,
  },
  requestDetails: {
    marginBottom: 24,
  },
  requestItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  requestLabel: {
    fontSize: 16,
    color: '#8E8E93',
  },
  requestValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1D1D1F',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  requestValueIPad: {
    fontSize: 20,
  },
  fareValue: {
    color: '#34C759',
    fontWeight: 'bold',
  },
  requestButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  declineButton: {
    flex: 1,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingVertical: 16,
    marginRight: 8,
    alignItems: 'center',
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#34C759',
    borderRadius: 12,
    paddingVertical: 16,
    marginLeft: 8,
    alignItems: 'center',
  },
  requestButtonIPad: {
    paddingVertical: 24,
    borderRadius: 16,
  },
  declineButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  acceptButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  requestButtonTextIPad: {
    fontSize: 20,
  },
  mapModalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  mapHeaderIPad: {
    paddingHorizontal: 40,
    paddingVertical: 25,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  mapTitleIPad: {
    fontSize: 24,
  },
  webView: {
    flex: 1,
  },
});
