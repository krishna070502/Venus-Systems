/**
 * Receipt Screen - Venus POS
 * ==========================
 * Displays sale confirmation and receipt details
 * Optimized for tablet screens
 */

import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { usePOS } from '../../lib/usePOS';
import { usePrinter } from '../../lib/usePrinter';
import { Alert } from 'react-native';

export default function ReceiptScreen() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isTablet = width >= 600;

    const { receiptNumber, totalAmount, paymentMethod } = useLocalSearchParams<{
        saleId: string;
        receiptNumber: string;
        totalAmount: string;
        paymentMethod: string;
    }>();
    const { clearLastSale } = usePOS();
    const { config: printerConfig, printReceipt, isConnected: isPrinterConnected, connectPrinter } = usePrinter();

    async function handlePrint() {
        if (!printerConfig) {
            Alert.alert('Printer Not Configured', 'Please go to Scale Configuration to set up a printer.');
            return;
        }

        // Connect if not already connected
        if (!isPrinterConnected) {
            const success = await connectPrinter(printerConfig.type, printerConfig.address);
            if (!success) return;
        }

        const dateStr = new Date().toLocaleString();

        // Basic ESC/POS formatting (approximate for 58mm)
        const receiptText =
            `\x1B\x61\x01` + // Center align
            `VENUS CHICKEN\n` +
            `--------------------------------\n` +
            `\x1B\x61\x00` + // Left align
            `Receipt: #${receiptNumber}\n` +
            `Date: ${dateStr}\n` +
            `--------------------------------\n` +
            `\x1B\x61\x01` + // Center align
            `\x1B\x21\x30` + // Large text
            `TOTAL: RS ${parseFloat(totalAmount).toFixed(2)}\n` +
            `\x1B\x21\x00` + // Normal text
            `--------------------------------\n` +
            `Payment: ${paymentMethod}\n` +
            `--------------------------------\n` +
            `\x1B\x61\x01` + // Center align
            `Thank you for visiting!\n\n\n\n`;

        await printReceipt(receiptText);
    }

    function handleNewSale() {
        clearLastSale();
        router.replace('/(pos)');
    }

    const getPaymentEmoji = () => {
        switch (paymentMethod) {
            case 'CASH': return '💵';
            case 'UPI': return '📱';
            case 'CARD': return '💳';
            case 'BANK': return '🏦';
            default: return '💰';
        }
    };

    return (
        <View style={styles.container}>
            <View style={[styles.content, isTablet && styles.contentTablet]}>
                {/* Success Animation */}
                <View style={styles.successContainer}>
                    <View style={[styles.checkmark, isTablet && styles.checkmarkTablet]}>
                        <Text style={[styles.checkmarkText, isTablet && styles.checkmarkTextTablet]}>✓</Text>
                    </View>
                    <Text style={[styles.successTitle, isTablet && styles.successTitleTablet]}>
                        Sale Complete!
                    </Text>
                </View>

                {/* Receipt Card */}
                <View style={[styles.receiptCard, isTablet && styles.receiptCardTablet]}>
                    <View style={styles.receiptHeader}>
                        <Text style={styles.receiptTitle}>RECEIPT</Text>
                        <Text style={[styles.receiptNumber, isTablet && styles.receiptNumberTablet]}>
                            #{receiptNumber}
                        </Text>
                    </View>

                    <View style={styles.divider} />

                    {/* Total Amount - Prominent */}
                    <View style={[styles.totalSection, isTablet && styles.totalSectionTablet]}>
                        <Text style={styles.totalLabel}>Total Amount</Text>
                        <Text style={[styles.totalValue, isTablet && styles.totalValueTablet]}>
                            ₹{parseFloat(totalAmount).toFixed(2)}
                        </Text>
                    </View>

                    <View style={styles.divider} />

                    {/* Payment Method */}
                    <View style={styles.paymentSection}>
                        <Text style={styles.paymentLabel}>Payment Method</Text>
                        <View style={styles.paymentBadge}>
                            <Text style={[styles.paymentEmoji, isTablet && styles.paymentEmojiTablet]}>
                                {getPaymentEmoji()}
                            </Text>
                            <Text style={[styles.paymentValue, isTablet && styles.paymentValueTablet]}>
                                {paymentMethod}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <Text style={[styles.thankYou, isTablet && styles.thankYouTablet]}>
                        Thank you for your purchase!
                    </Text>
                </View>

                {/* Action Buttons */}
                <View style={[styles.buttonRow, isTablet && styles.buttonRowTablet]}>
                    <TouchableOpacity
                        style={[styles.printButton, isTablet && styles.printButtonTablet]}
                        onPress={handlePrint}
                    >
                        <Text style={[styles.buttonText, isTablet && styles.buttonTextTablet]}>
                            🖨️ Print Receipt
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.newSaleButton, isTablet && styles.newSaleButtonTablet]}
                        onPress={handleNewSale}
                    >
                        <Text style={[styles.buttonText, isTablet && styles.buttonTextTablet]}>
                            ＋ New Sale
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Footer */}
                <Text style={[styles.footer, isTablet && styles.footerTablet]}>
                    Venus Chicken - POS System
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f2f5',
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    contentTablet: {
        padding: 48,
        maxWidth: 600,
        alignSelf: 'center',
        width: '100%',
    },
    successContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    checkmark: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#22c55e',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#22c55e',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    checkmarkTablet: {
        width: 140,
        height: 140,
        borderRadius: 70,
    },
    checkmarkText: {
        fontSize: 56,
        color: '#fff',
        fontWeight: 'bold',
    },
    checkmarkTextTablet: {
        fontSize: 80,
    },
    successTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
    },
    successTitleTablet: {
        fontSize: 36,
    },
    receiptCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 28,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 6,
    },
    receiptCardTablet: {
        padding: 40,
        borderRadius: 24,
    },
    receiptHeader: {
        alignItems: 'center',
        marginBottom: 16,
    },
    receiptTitle: {
        fontSize: 12,
        color: '#999',
        letterSpacing: 2,
        marginBottom: 8,
    },
    receiptNumber: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1E4DD8',
    },
    receiptNumberTablet: {
        fontSize: 36,
    },
    divider: {
        height: 1,
        backgroundColor: '#e0e0e0',
        marginVertical: 20,
    },
    totalSection: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    totalSectionTablet: {
        paddingVertical: 20,
    },
    totalLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    totalValue: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#22c55e',
    },
    totalValueTablet: {
        fontSize: 64,
    },
    paymentSection: {
        alignItems: 'center',
    },
    paymentLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 12,
    },
    paymentBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f7fa',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
        gap: 10,
    },
    paymentEmoji: {
        fontSize: 24,
    },
    paymentEmojiTablet: {
        fontSize: 32,
    },
    paymentValue: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    paymentValueTablet: {
        fontSize: 22,
    },
    thankYou: {
        textAlign: 'center',
        fontSize: 16,
        color: '#666',
        fontStyle: 'italic',
    },
    thankYouTablet: {
        fontSize: 18,
    },
    buttonRow: {
        flexDirection: 'column',
        gap: 12,
        marginTop: 32,
    },
    buttonRowTablet: {
        flexDirection: 'row',
        gap: 20,
    },
    printButton: {
        flex: 1,
        backgroundColor: '#64748b',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
    },
    printButtonTablet: {
        padding: 24,
        borderRadius: 20,
    },
    newSaleButton: {
        flex: 1,
        backgroundColor: '#1E4DD8',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
    },
    newSaleButtonTablet: {
        padding: 24,
        borderRadius: 20,
    },
    buttonText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    buttonTextTablet: {
        fontSize: 24,
    },
    footer: {
        textAlign: 'center',
        color: '#999',
        fontSize: 12,
        marginTop: 32,
    },
    footerTablet: {
        fontSize: 14,
        marginTop: 40,
    },
});
