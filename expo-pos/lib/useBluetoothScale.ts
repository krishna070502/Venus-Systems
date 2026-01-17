import { useState, useEffect, useCallback, useRef } from 'react';
import RNBluetoothClassic, {
    BluetoothDevice
} from 'react-native-bluetooth-classic';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform, PermissionsAndroid } from 'react-native';

const STORAGE_KEY = '@scale_config';

export interface ScaleDevice {
    id: string; // MAC address or UUID
    name: string;
    slot: number; // 1-6
    connected: boolean;
}

export interface ScaleConfig {
    slots: Record<number, { id: string, name: string }>;
    activeSlot: number;
}

export function useBluetoothScale() {
    const [config, setConfig] = useState<ScaleConfig>({ slots: {}, activeSlot: 1 });
    const [connectedDevices, setConnectedDevices] = useState<Record<number, BluetoothDevice>>({});
    const [currentWeights, setCurrentWeights] = useState<Record<number, number>>({});
    const [isScanning, setIsScanning] = useState(false);
    const [discoveredDevices, setDiscoveredDevices] = useState<BluetoothDevice[]>([]);

    // Subscriptions to clean up
    const dataSubscriptions = useRef<Record<number, any>>({});

    // Load configuration on mount
    useEffect(() => {
        loadConfig();
        return () => {
            // Cleanup all connections on unmount
            Object.values(connectedDevices).forEach(device => device.disconnect());
        };
    }, []);

    const loadConfig = async () => {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (stored) {
                setConfig(JSON.parse(stored));
            }
        } catch (err) {
            console.error('Failed to load scale config:', err);
        }
    };

    const saveConfig = async (newConfig: ScaleConfig) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
            setConfig(newConfig);
        } catch (err) {
            console.error('Failed to save scale config:', err);
        }
    };

    const requestPermissions = async () => {
        if (Platform.OS === 'android') {
            if (Platform.Version >= 31) {
                const result = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                ]);
                return result['android.permission.BLUETOOTH_SCAN'] === 'granted' &&
                    result['android.permission.BLUETOOTH_CONNECT'] === 'granted';
            } else {
                const result = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
                );
                return result === 'granted';
            }
        }
        return true;
    };

    const scanDevices = async () => {
        const hasPermission = await requestPermissions();
        if (!hasPermission) {
            Alert.alert('Permission Denied', 'Bluetooth permissions are required to scan for scales.');
            return;
        }

        try {
            setIsScanning(true);
            const devices = await RNBluetoothClassic.startDiscovery();
            setDiscoveredDevices(devices);
        } catch (err) {
            Alert.alert('Scan Failed', 'Could not scan for Bluetooth devices.');
        } finally {
            setIsScanning(false);
        }
    };

    const connectToSlot = async (slot: number) => {
        const slotConfig = config.slots[slot];
        if (!slotConfig) return;

        try {
            const device = await RNBluetoothClassic.connectToDevice(slotConfig.id);
            if (device) {
                setConnectedDevices(prev => ({ ...prev, [slot]: device }));
                startReading(slot, device);
            }
        } catch (err) {
            console.error(`Failed to connect to slot ${slot}:`, err);
            Alert.alert('Connection Failed', `Could not connect to ${slotConfig.name}`);
        }
    };

    const startReading = (slot: number, device: BluetoothDevice) => {
        // Clear existing subscription if any
        if (dataSubscriptions.current[slot]) {
            dataSubscriptions.current[slot].remove();
        }

        dataSubscriptions.current[slot] = device.onDataReceived((event) => {
            const rawData = event.data;
            const parsedWeight = parseWeightData(rawData);
            if (parsedWeight !== null) {
                setCurrentWeights(prev => ({ ...prev, [slot]: parsedWeight }));
            }
        });
    };

    const parseWeightData = (data: string): number | null => {
        // Common ASCII formats:
        // ST,GS,  12.345kg\r\n
        // 12.345\n
        // +  12.345

        try {
            // Extract numeric value using regex
            const match = data.match(/[-+]?\s*(\d+(\.\d+)?)/);
            if (match) {
                return parseFloat(match[1]);
            }
        } catch (err) {
            console.warn('Failed to parse weight data:', data);
        }
        return null;
    };

    const assignDeviceToSlot = async (device: BluetoothDevice, slot: number) => {
        const newConfig = {
            ...config,
            slots: {
                ...config.slots,
                [slot]: { id: device.address, name: device.name || 'Unknown Device' }
            }
        };
        await saveConfig(newConfig);
    };

    const unassignSlot = async (slot: number) => {
        if (connectedDevices[slot]) {
            await connectedDevices[slot].disconnect();
            const newConnected = { ...connectedDevices };
            delete newConnected[slot];
            setConnectedDevices(newConnected);
        }

        const newSlots = { ...config.slots };
        delete newSlots[slot];
        const newConfig = { ...config, slots: newSlots };
        await saveConfig(newConfig);
    };

    const setActiveSlot = async (slot: number) => {
        const newConfig = { ...config, activeSlot: slot };
        await saveConfig(newConfig);
    };

    const sendLockCommand = async (slot: number, weight: number) => {
        const device = connectedDevices[slot];
        if (!device) {
            Alert.alert('Not Connected', 'Please connect the weighing machine first.');
            return;
        }

        try {
            // Standard format for many industrial indicators in India
            await device.write(`LOCK:${weight.toFixed(3)}\n`);
        } catch (err) {
            console.error('Failed to send lock command:', err);
        }
    };

    return {
        config,
        isScanning,
        discoveredDevices,
        currentWeights,
        connectedDevices,
        scanDevices,
        connectToSlot,
        assignDeviceToSlot,
        unassignSlot,
        setActiveSlot,
        sendLockCommand,
        currentWeight: currentWeights[config.activeSlot] || 0,
        isScaleConnected: !!connectedDevices[config.activeSlot],
    };
}
