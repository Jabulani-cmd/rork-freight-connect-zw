import React, { useState, useCallback, useRef, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Modal, FlatList, ActivityIndicator, Keyboard } from 'react-native';
import { Text, Button, TextInput, IconButton } from 'react-native-paper';
import { Colors } from '@/constants/colors';
import MapView, { Marker, Region } from 'react-native-maps';
import { MapPin, Search, X, Navigation } from 'lucide-react-native';
import * as Location from 'expo-location';

interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
}

interface LocationPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (location: LocationData) => void;
  title: string;
  initialLocation?: LocationData;
}

interface SearchResult {
  latitude: number;
  longitude: number;
  address: string;
  displayName: string;
}

const NOMINATIM = 'https://nominatim.openstreetmap.org';

async function geocodeSearch(query: string): Promise<SearchResult[]> {
  try {
    const q = encodeURIComponent(query);
    const url = `${NOMINATIM}/search?q=${q}&format=json&addressdetails=1&limit=8&countrycodes=zw`;
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'FreightConnectZW/1.0',
      },
    });
    if (!res.ok) return [];
    const data: any[] = await res.json();
    return data.map((d) => ({
      latitude: parseFloat(d.lat),
      longitude: parseFloat(d.lon),
      address: d.display_name as string,
      displayName: d.display_name as string,
    }));
  } catch (e) {
    console.log('[geocode] failed', e);
    return [];
  }
}

async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const url = `${NOMINATIM}/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'FreightConnectZW/1.0' },
    });
    if (!res.ok) return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
    const data = await res.json();
    return (data?.display_name as string) || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  }
}

export default function LocationPicker({
  visible,
  onClose,
  onSelect,
  title,
  initialLocation,
}: LocationPickerProps) {
  const mapRef = useRef<MapView | null>(null);
  const initialRegion = useRef<Region>({
    latitude: initialLocation?.latitude || -17.8252,
    longitude: initialLocation?.longitude || 31.0335,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  }).current;
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(
    initialLocation || null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isReverseLoading, setIsReverseLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      const res = await geocodeSearch(searchQuery.trim());
      setResults(res);
      setIsSearching(false);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  const handleSelectResult = useCallback((r: SearchResult) => {
    Keyboard.dismiss();
    const loc: LocationData = {
      latitude: r.latitude,
      longitude: r.longitude,
      address: r.address,
    };
    setSelectedLocation(loc);
    setSearchQuery('');
    setResults([]);
    mapRef.current?.animateToRegion(
      { latitude: r.latitude, longitude: r.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 },
      500
    );
  }, []);

  const handleMapPress = useCallback(async (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setSelectedLocation({
      latitude,
      longitude,
      address: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
    });
    setIsReverseLoading(true);
    const address = await reverseGeocode(latitude, longitude);
    setSelectedLocation({ latitude, longitude, address });
    setIsReverseLoading(false);
  }, []);

  const handleCurrentLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Location permission is required');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };

      mapRef.current?.animateToRegion(newRegion, 500);
      setIsReverseLoading(true);
      const address = await reverseGeocode(location.coords.latitude, location.coords.longitude);
      setSelectedLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address,
      });
      setIsReverseLoading(false);
    } catch (error) {
      console.error('Failed to get current location:', error);
      setIsReverseLoading(false);
    }
  }, []);

  const handleConfirm = useCallback(() => {
    if (selectedLocation) {
      onSelect(selectedLocation);
      onClose();
    }
  }, [selectedLocation, onSelect, onClose]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <IconButton icon={() => <X size={24} color={Colors.text} />} onPress={onClose} />
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={{ width: 48 }} />
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search address, suburb, city..."
            mode="outlined"
            style={styles.searchInput}
            left={<TextInput.Icon icon={() => <Search size={20} color={Colors.primary} />} />}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.primary}
            testID="location-search-input"
          />
          {(isSearching || results.length > 0) && (
            <View style={styles.resultsBox}>
              {isSearching && (
                <View style={styles.resultLoading}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.resultLoadingText}>Searching...</Text>
                </View>
              )}
              <FlatList
                data={results}
                keyExtractor={(_, i) => String(i)}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.resultItem}
                    onPress={() => handleSelectResult(item)}
                  >
                    <MapPin size={16} color={Colors.primary} />
                    <Text style={styles.resultText} numberOfLines={2}>
                      {item.displayName}
                    </Text>
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                style={{ maxHeight: 240 }}
              />
            </View>
          )}
        </View>

        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={initialRegion}
          onPress={handleMapPress}
        >
          {selectedLocation && (
            <Marker
              coordinate={{
                latitude: selectedLocation.latitude,
                longitude: selectedLocation.longitude,
              }}
            >
              <View style={styles.marker}>
                <MapPin size={24} color={Colors.primary} />
              </View>
            </Marker>
          )}
        </MapView>

        <TouchableOpacity
          style={styles.currentLocationButton}
          onPress={handleCurrentLocation}
          testID="current-location-button"
        >
          <Navigation size={24} color={Colors.primary} />
        </TouchableOpacity>

        {selectedLocation && (
          <View style={styles.bottomSheet}>
            <View style={styles.locationInfo}>
              <MapPin size={24} color={Colors.primary} />
              <View style={styles.locationTextContainer}>
                <Text style={styles.locationAddress} numberOfLines={3}>
                  {isReverseLoading ? 'Resolving address...' : selectedLocation.address}
                </Text>
                <Text style={styles.locationCoords}>
                  {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                </Text>
              </View>
            </View>
            <Button
              mode="contained"
              onPress={handleConfirm}
              style={styles.confirmButton}
              disabled={isReverseLoading}
              testID="confirm-location-button"
            >
              Confirm Location
            </Button>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingHorizontal: 8,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: Colors.text },
  searchContainer: { padding: 16, backgroundColor: Colors.surface, zIndex: 20 },
  searchInput: { backgroundColor: Colors.background },
  resultsBox: {
    marginTop: 8,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  resultItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  resultText: { flex: 1, color: Colors.text, fontSize: 13 },
  separator: { height: 1, backgroundColor: Colors.border },
  resultLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  resultLoadingText: { color: Colors.textSecondary, fontSize: 13 },
  map: { flex: 1 },
  marker: {
    backgroundColor: Colors.surface,
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  currentLocationButton: {
    position: 'absolute',
    right: 16,
    bottom: 200,
    backgroundColor: Colors.surface,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  bottomSheet: {
    backgroundColor: Colors.surface,
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  locationInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  locationTextContainer: { flex: 1 },
  locationAddress: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 4 },
  locationCoords: { fontSize: 11, color: Colors.textSecondary },
  confirmButton: { borderRadius: 12, backgroundColor: Colors.primary },
});
