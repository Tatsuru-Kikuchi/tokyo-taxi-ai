        {/* Fare and time estimate */}
        {selectedDestination && (
          <View style={styles.estimateContainer}>
            <View style={styles.estimateRow}>
              <View style={styles.estimateItem}>
                <Text style={styles.estimateLabel}>予想料金</Text>
                <Text style={styles.estimateValue}>
                  ¥{estimatedFare ? estimatedFare.toLocaleString() : '---'}
                </Text>
                {surgeMultiplier > 1 && (
                  <Text style={styles.surgeText}>サージ {surgeMultiplier}x</Text>
                )}
              </View>
              <View style={styles.estimateItem}>
                <Text style={styles.estimateLabel}>到着予定</Text>
                <Text style={styles.estimateValue}>
                  {estimatedTime ? `${estimatedTime}分` : '---'}
                </Text>
                {trafficData?.congestionLevel === 'heavy' && (
                  <Text style={styles.trafficDelayText}>渋滞あり</Text>
                )}
              </View>
            </View>
            
            {weatherData && weatherData.rainProbability > 60 && (
              <View style={styles.weatherImpactContainer}>
                <Text style={styles.weatherImpactText}>
                  ☔ 雨予報のため需要が高まっています
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Driver info during ride */}
        {currentRide && currentRide.driverInfo && (
          <View style={styles.driverInfoContainer}>
            <Text style={styles.driverInfoTitle}>ドライバー情報</Text>
            <View style={styles.driverDetails}>
              <Text style={styles.driverName}>{currentRide.driverInfo.name}</Text>
              <Text style={styles.driverRating}>⭐ {currentRide.driverInfo.rating}</Text>
            </View>
            <Text style={styles.driverVehicle}>
              {currentRide.driverInfo.vehicle} • {currentRide.driverInfo.plateNumber}
            </Text>
            <Text style={styles.driverETA}>
              到着予定: {currentRide.eta}分
            </Text>
          </View>
        )}

        {/* Book button */}
        <TouchableOpacity
          style={[
            styles.bookButton,
            { backgroundColor: bookingStatus === 'idle' ? '#4A90E2' : '#999' }
          ]}
          onPress={bookRide}
          disabled={bookingStatus !== 'idle' || !selectedDestination || loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.bookButtonText}>
              {bookingStatus === 'idle' && '配車を依頼'}
              {bookingStatus === 'searching' && 'ドライバーを探しています...'}
              {bookingStatus === 'confirmed' && 'ドライバーが向かっています'}
              {bookingStatus === 'driver_assigned' && `${currentRide?.driverInfo?.name}が向かっています`}
            </Text>
          )}
        </TouchableOpacity>

        {/* Cancel button */}
        {bookingStatus !== 'idle' && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              Alert.alert(
                'キャンセル確認',
                '本当にキャンセルしますか？',
                [
                  { text: 'いいえ', style: 'cancel' },
                  { text: 'はい', onPress: resetBooking }
                ]
              );
            }}
          >
            <Text style={styles.cancelButtonText}>キャンセル</Text>
          </TouchableOpacity>
        )}

        {/* Available drivers count */}
        <View style={styles.driversInfoContainer}>
          <Text style={styles.driversInfoText}>
            🚕 近くのドライバー: {nearbyDrivers.length}台
          </Text>
          {surgeMultiplier > 1 && (
            <Text style={styles.surgeInfoText}>
              ⚡ 高需要エリア (料金 {surgeMultiplier}倍)
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  map: {
    flex: 1,
  },
  topPanel: {
    position: 'absolute',
    top: 40,
    left: 10,
    right: 10,
    backgroundColor: 'white',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  weatherAlert: {
    backgroundColor: '#FFF3CD',
    padding: 10,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE69C',
  },
  weatherAlertText: {
    fontSize: 12,
    color: '#856404',
    fontWeight: '500',
  },
  trafficInfo: {
    backgroundColor: '#D1ECF1',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#BEE5EB',
  },
  trafficTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0C5460',
    marginBottom: 5,
  },
  trafficAlert: {
    fontSize: 12,
    color: '#0C5460',
    marginTop: 2,
  },
  searchContainer: {
    padding: 15,
  },
  searchInput: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchResults: {
    maxHeight: 200,
    backgroundColor: 'white',
  },
  searchResultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchResultText: {
    fontSize: 14,
    color: '#333',
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  estimateContainer: {
    marginBottom: 15,
  },
  estimateRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
  },
  estimateItem: {
    alignItems: 'center',
  },
  estimateLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  estimateValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  surgeText: {
    fontSize: 11,
    color: '#FF6B6B',
    marginTop: 2,
    fontWeight: '600',
  },
  trafficDelayText: {
    fontSize: 11,
    color: '#FF9800',
    marginTop: 2,
    fontWeight: '600',
  },
  weatherImpactContainer: {
    backgroundColor: '#E3F2FD',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  weatherImpactText: {
    fontSize: 13,
    color: '#1976D2',
    textAlign: 'center',
  },
  driverInfoContainer: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  driverInfoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 10,
  },
  driverDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  driverName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  driverRating: {
    fontSize: 14,
    color: '#FFB800',
  },
  driverVehicle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  driverETA: {
    fontSize: 14,
    color: '#4A90E2',
    marginTop: 5,
    fontWeight: '600',
  },
  bookButton: {
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 10,
  },
  bookButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 10,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  driversInfoContainer: {
    alignItems: 'center',
    paddingTop: 10,
  },
  driversInfoText: {
    fontSize: 14,
    color: '#666',
  },
  surgeInfoText: {
    fontSize: 13,
    color: '#FF6B6B',
    marginTop: 5,
    fontWeight: '600',
  },
  userMarker: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userMarkerInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4A90E2',
    borderWidth: 3,
    borderColor: 'white',
  },
  markerText: {
    fontSize: 30,
  },
  driverMarkerText: {
    fontSize: 25,
  },
  assignedDriverMarker: {
    fontSize: 30,
  },
});