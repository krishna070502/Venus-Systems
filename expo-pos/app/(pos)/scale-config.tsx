import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    ScrollView,
    Alert,
    useWindowDimensions
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useBluetoothScale } from '../../lib/useBluetoothScale';
import { usePrinter, PrinterType, PrinterDevice } from '../../lib/usePrinter';

export default function ScaleConfigScreen() {
    const { width } = useWindowDimensions();
    const isTablet = width >= 600;
    const router = useRouter();
    const {
        config,
        isScanning,
        discoveredDevices,
        scanDevices,
        assignDeviceToSlot,
        unassignSlot,
        connectToSlot,
        connectedDevices,
        currentWeights
    } = useBluetoothScale();

    const {
        config: printerConfig,
        isConnecting: isPrinterConnecting,
        isConnected: isPrinterConnected,
        scanPrinters,
        connectPrinter,
        saveConfig: savePrinterConfig,
        disconnect: disconnectPrinter
    } = usePrinter();

    const [pairingSlot, setPairingSlot] = useState<number | null>(null);
    const [printerType, setPrinterType] = useState<PrinterType>('BT');
    const [discoveredPrinters, setDiscoveredPrinters] = useState<PrinterDevice[]>([]);
    const [isScanningPrinters, setIsScanningPrinters] = useState(false);
    const [isConfiguringPrinter, setIsConfiguringPrinter] = useState(false);

    const SLOTS = [1, 2, 3, 4, 5, 6];

    const handleSelectDevice = async (device: any) => {
        if (pairingSlot) {
            await assignDeviceToSlot(device, pairingSlot);
            setPairingSlot(null);
            Alert.alert('Success', `Assigned ${device.name || device.address} to Slot ${pairingSlot}`);
        }
    };

    const handleScanPrinters = async () => {
        setIsScanningPrinters(true);
        const devices = await scanPrinters(printerType);
        setDiscoveredPrinters(devices);
        setIsScanningPrinters(false);
    };

    const handleSelectPrinter = async (device: PrinterDevice) => {
        await savePrinterConfig({
            type: printerType,
            address: device.inner_mac_address,
            name: device.device_name
        });
        setIsConfiguringPrinter(false);
        Alert.alert('Success', `Printer ${device.device_name} configured as default.`);
    };

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: 'Scale Configuration',
                    headerStyle: { backgroundColor: '#1E4DD8' },
                    headerTintColor: '#fff',
                }}
            />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.sectionTitle}>Scale Slots</Text>
                <Text style={styles.subtitle}>Configure up to 6 weighing machines</Text>

                <View style={[styles.slotsGrid, isTablet && styles.slotsGridTablet]}>
                    {SLOTS.map(slot => {
                        const device = config.slots[slot];
                        const isConnected = !!connectedDevices[slot];
                        const currentWeight = currentWeights[slot] || 0;

                        return (
                            <View key={slot} style={[styles.slotCard, isTablet && styles.slotCardTablet]}>
                                <View style={styles.slotHeader}>
                                    <Text style={styles.slotNumber}>Slot {slot}</Text>
                                    {isConnected ? (
                                        <View style={styles.statusBadgeConnected}>
                                            <Text style={styles.statusText}>Connected</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.statusBadgeDisconnected}>
                                            <Text style={styles.statusText}>Offline</Text>
                                        </View>
                                    )}
                                </View>

                                {device ? (
                                    <View style={styles.deviceInfo}>
                                        <Text style={styles.deviceName} numberOfLines={1}>{device.name}</Text>
                                        <Text style={styles.deviceAddress}>{device.id}</Text>

                                        {isConnected && (
                                            <View style={styles.liveWeightBox}>
                                                <Text style={styles.liveWeightLabel}>Live:</Text>
                                                <Text style={styles.liveWeightValue}>{currentWeight.toFixed(3)} kg</Text>
                                            </View>
                                        )}

                                        <View style={styles.slotActions}>
                                            <TouchableOpacity
                                                style={[styles.actionButton, styles.connectButton, isConnected && styles.disabledButton]}
                                                onPress={() => connectToSlot(slot)}
                                                disabled={isConnected}
                                            >
                                                <Text style={styles.actionButtonText}>Connect</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.actionButton, styles.unpairButton]}
                                                onPress={() => unassignSlot(slot)}
                                            >
                                                <Text style={styles.actionButtonText}>Unpair</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ) : (
                                    <View style={styles.emptySlot}>
                                        <Text style={styles.emptyText}>Not Configured</Text>
                                        <TouchableOpacity
                                            style={styles.pairButton}
                                            onPress={() => setPairingSlot(slot)}
                                        >
                                            <Text style={styles.pairButtonText}>Pair Device</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </View>

                {/* Printer Configuration Section */}
                <View style={styles.printerSection}>
                    <Text style={styles.sectionTitle}>Thermal Printer</Text>
                    <Text style={styles.subtitle}>Configure receipt printer (Bluetooth or USB OTG)</Text>

                    <View style={[styles.slotCard, isTablet && styles.slotCardTablet, { width: '100%' }]}>
                        <View style={styles.slotHeader}>
                            <Text style={styles.slotNumber}>Default Printer</Text>
                            {isPrinterConnected ? (
                                <View style={styles.statusBadgeConnected}>
                                    <Text style={styles.statusText}>Connected</Text>
                                </View>
                            ) : (
                                <View style={styles.statusBadgeDisconnected}>
                                    <Text style={styles.statusText}>Offline</Text>
                                </View>
                            )}
                        </View>

                        {printerConfig ? (
                            <View style={styles.deviceInfo}>
                                <Text style={styles.deviceName}>{printerConfig.name}</Text>
                                <Text style={styles.deviceAddress}>{printerConfig.type} • {printerConfig.address}</Text>

                                <View style={styles.slotActions}>
                                    <TouchableOpacity
                                        style={[styles.actionButton, styles.connectButton, isPrinterConnecting && styles.disabledButton]}
                                        onPress={() => connectPrinter(printerConfig.type, printerConfig.address)}
                                        disabled={isPrinterConnecting}
                                    >
                                        {isPrinterConnecting ? (
                                            <ActivityIndicator color="#fff" size="small" />
                                        ) : (
                                            <Text style={styles.actionButtonText}>{isPrinterConnected ? 'Reconnect' : 'Connect'}</Text>
                                        )}
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.actionButton, styles.unpairButton]}
                                        onPress={() => setIsConfiguringPrinter(true)}
                                    >
                                        <Text style={[styles.actionButtonText, { color: '#64748b' }]}>Change</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.emptySlot}>
                                <Text style={styles.emptyText}>No printer configured</Text>
                                <TouchableOpacity
                                    style={styles.pairButton}
                                    onPress={() => setIsConfiguringPrinter(true)}
                                >
                                    <Text style={styles.pairButtonText}>Setup Printer</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>

                {/* Printer Setup Overlay */}
                {isConfiguringPrinter && (
                    <View style={styles.scanningSection}>
                        <View style={styles.scanHeader}>
                            <Text style={styles.sectionTitle}>Printer Setup</Text>
                            <TouchableOpacity
                                style={styles.closeScan}
                                onPress={() => setIsConfiguringPrinter(false)}
                            >
                                <Text style={styles.closeScanText}>Close</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.typeSelector}>
                            <TouchableOpacity
                                style={[styles.typeBtn, printerType === 'BT' && styles.typeBtnActive]}
                                onPress={() => setPrinterType('BT')}
                            >
                                <Text style={[styles.typeBtnText, printerType === 'BT' && styles.typeBtnTextActive]}>Bluetooth</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.typeBtn, printerType === 'USB' && styles.typeBtnActive]}
                                onPress={() => setPrinterType('USB')}
                            >
                                <Text style={[styles.typeBtnText, printerType === 'USB' && styles.typeBtnTextActive]}>USB OTG</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.scanMainButton}
                            onPress={handleScanPrinters}
                            disabled={isScanningPrinters}
                        >
                            {isScanningPrinters ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.scanButtonText}>Search for {printerType} Printers</Text>
                            )}
                        </TouchableOpacity>

                        <View style={styles.discoveryList}>
                            {discoveredPrinters.map(device => (
                                <TouchableOpacity
                                    key={device.inner_mac_address}
                                    style={styles.discoveredItem}
                                    onPress={() => handleSelectPrinter(device)}
                                >
                                    <View>
                                        <Text style={styles.discoveredName}>{device.device_name || 'Generic Printer'}</Text>
                                        <Text style={styles.discoveredAddress}>{device.inner_mac_address}</Text>
                                    </View>
                                    <Text style={styles.selectArrow}>→</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}

                {pairingSlot && (
                    <View style={styles.scanningSection}>
                        <View style={styles.scanHeader}>
                            <Text style={styles.sectionTitle}>Select Device for Slot {pairingSlot}</Text>
                            <TouchableOpacity
                                style={styles.closeScan}
                                onPress={() => setPairingSlot(null)}
                            >
                                <Text style={styles.closeScanText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.scanMainButton}
                            onPress={scanDevices}
                            disabled={isScanning}
                        >
                            {isScanning ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.scanButtonText}>Scan for Devices</Text>
                            )}
                        </TouchableOpacity>

                        <View style={styles.discoveryList}>
                            {discoveredDevices.map(device => (
                                <TouchableOpacity
                                    key={device.address}
                                    style={styles.discoveredItem}
                                    onPress={() => handleSelectDevice(device)}
                                >
                                    <View>
                                        <Text style={styles.discoveredName}>{device.name || 'Unknown Device'}</Text>
                                        <Text style={styles.discoveredAddress}>{device.address}</Text>
                                    </View>
                                    <Text style={styles.selectArrow}>→</Text>
                                </TouchableOpacity>
                            ))}
                            {discoveredDevices.length === 0 && !isScanning && (
                                <Text style={styles.noDevicesText}>No Bluetooth devices found. Make sure the scale is in pairing mode.</Text>
                            )}
                        </View>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    scrollContent: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#334155',
    },
    subtitle: {
        fontSize: 14,
        color: '#64748b',
        marginBottom: 20,
    },
    slotsGrid: {
        gap: 12,
    },
    slotsGridTablet: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    slotCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    slotCardTablet: {
        width: '48.5%', // 2 columns with gap
    },
    slotHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        paddingBottom: 8,
        marginBottom: 12,
    },
    slotNumber: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E4DD8',
    },
    statusBadgeConnected: {
        backgroundColor: '#dcfce7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusBadgeDisconnected: {
        backgroundColor: '#fee2e2',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#166534',
    },
    deviceInfo: {
        gap: 8,
    },
    deviceName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1e293b',
    },
    deviceAddress: {
        fontSize: 12,
        color: '#94a3b8',
        fontFamily: 'monospace',
    },
    liveWeightBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        padding: 8,
        borderRadius: 8,
        gap: 8,
    },
    liveWeightLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748b',
    },
    liveWeightValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1E4DD8',
    },
    slotActions: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 8,
    },
    actionButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    connectButton: {
        backgroundColor: '#1E4DD8',
    },
    unpairButton: {
        backgroundColor: '#f1f5f9',
    },
    disabledButton: {
        backgroundColor: '#94a3b8',
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    emptySlot: {
        alignItems: 'center',
        paddingVertical: 20,
        gap: 12,
    },
    emptyText: {
        color: '#94a3b8',
        fontSize: 14,
    },
    pairButton: {
        backgroundColor: '#eef2ff',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#c7d2fe',
    },
    pairButtonText: {
        color: '#1E4DD8',
        fontWeight: '600',
    },
    scanningSection: {
        marginTop: 24,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    scanHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    closeScan: {
        padding: 8,
    },
    closeScanText: {
        color: '#ef4444',
        fontWeight: '600',
    },
    scanMainButton: {
        backgroundColor: '#1E4DD8',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 16,
    },
    scanButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    discoveryList: {
        gap: 10,
    },
    discoveredItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#f8fafc',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    discoveredName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1e293b',
    },
    discoveredAddress: {
        fontSize: 12,
        color: '#64748b',
    },
    selectArrow: {
        fontSize: 20,
        color: '#1E4DD8',
    },
    noDevicesText: {
        textAlign: 'center',
        color: '#94a3b8',
        paddingVertical: 20,
    },
    printerSection: {
        marginTop: 32,
    },
    typeSelector: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    typeBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    typeBtnActive: {
        backgroundColor: '#1E4DD8',
        borderColor: '#1E4DD8',
    },
    typeBtnText: {
        fontWeight: '600',
        color: '#64748b',
    },
    typeBtnTextActive: {
        color: '#fff',
    }
});
