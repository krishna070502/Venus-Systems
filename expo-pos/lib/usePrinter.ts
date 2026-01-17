import { useState, useEffect, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    USBPrinter,
    BLEPrinter,
} from 'react-native-thermal-receipt-printer-image-qr';

export type PrinterType = 'BT' | 'USB';

export interface PrinterDevice {
    device_name: string;
    inner_mac_address: string;
    vendor_id?: string;
    product_id?: string;
}

export interface PrinterConfig {
    type: PrinterType;
    address: string;
    name: string;
}

const STORAGE_KEY = '@venuschicken/printer_config';

const checkPrinterModules = () => {
    if (!USBPrinter || !BLEPrinter) {
        Alert.alert(
            'Native Modules Missing',
            'Thermal printer features require a custom development build. Please use the EAS Build APK instead of Expo Go.'
        );
        return false;
    }
    return true;
};

export const usePrinter = () => {
    const [config, setConfig] = useState<PrinterConfig | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);

    // Load config on mount
    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (stored) {
                setConfig(JSON.parse(stored));
            }
        } catch (e) {
            console.error('Failed to load printer config', e);
        }
    };

    const saveConfig = async (newConfig: PrinterConfig) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
            setConfig(newConfig);
        } catch (e) {
            console.error('Failed to save printer config', e);
        }
    };

    const scanPrinters = useCallback(async (type: PrinterType): Promise<PrinterDevice[]> => {
        if (!checkPrinterModules()) return [];
        try {
            if (type === 'USB') {
                if (Platform.OS !== 'android') return [];
                await USBPrinter.init();
                const devices = await USBPrinter.getDeviceList();
                // Map IUSBPrinter to PrinterDevice, synthesizing inner_mac_address from vendor/product ID
                return devices.map(d => ({
                    device_name: d.device_name,
                    inner_mac_address: `${d.vendor_id}:${d.product_id}`,
                    vendor_id: d.vendor_id,
                    product_id: d.product_id
                }));
            } else {
                await BLEPrinter.init();
                const devices = await BLEPrinter.getDeviceList();
                return devices as PrinterDevice[];
            }
        } catch (e) {
            console.error('Failed to scan printers', e);
            return [];
        }
    }, []);

    const connectPrinter = useCallback(async (type: PrinterType, address: string) => {
        if (!checkPrinterModules()) return false;
        setIsConnecting(true);
        try {
            if (type === 'USB') {
                const [vendorId, productId] = address.split(':');
                await USBPrinter.init();
                await USBPrinter.connectPrinter(vendorId, productId);
            } else {
                await BLEPrinter.init();
                await BLEPrinter.connectPrinter(address);
            }
            setIsConnected(true);
            return true;
        } catch (e) {
            console.error('Failed to connect printer', e);
            Alert.alert('Printer Error', 'Could not connect to printer. Please check if it is on and in range.');
            setIsConnected(false);
            return false;
        } finally {
            setIsConnecting(false);
        }
    }, []);

    const disconnect = useCallback(async () => {
        if (!USBPrinter || !BLEPrinter) return;
        try {
            if (config?.type === 'USB') {
                await USBPrinter.closeConn();
            } else {
                await BLEPrinter.closeConn();
            }
            setIsConnected(false);
        } catch (e) {
            console.error('Failed to disconnect printer', e);
        }
    }, [config]);

    const printReceipt = useCallback(async (text: string) => {
        if (!checkPrinterModules()) return;
        try {
            if (config?.type === 'USB') {
                await USBPrinter.printRaw(text);
            } else {
                await BLEPrinter.printRaw(text);
            }
        } catch (e) {
            console.error('Failed to print', e);
            Alert.alert('Print Error', 'Failed to send data to printer.');
        }
    }, [config]);

    return {
        config,
        isConnecting,
        isConnected,
        scanPrinters,
        connectPrinter,
        saveConfig,
        printReceipt,
        disconnect,
    };
};
