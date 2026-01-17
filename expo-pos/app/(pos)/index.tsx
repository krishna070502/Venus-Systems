/**
 * POS Home Screen - Venus POS
 * ===========================
 * Main POS interface for creating sales
 * Features:
 * - Multi-item cart (add multiple SKUs)
 * - Bidirectional input: Weight-based OR Amount-based entry
 * - Tablet optimized layout (8-14 inch screens)
 * - CASH and UPI payment methods only
 */

import React, { useState, useEffect, useCallback, memo } from 'react';
import {
    View,
    Text,
    FlatList,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    Modal,
    useWindowDimensions,
    ScrollView,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useAuth } from '../../lib/useAuth';
import { usePOS } from '../../lib/usePOS';
import { useBluetoothScale } from '../../lib/useBluetoothScale';
import { SKUWithPrice } from '../../lib/api';

type PaymentMethod = 'CASH' | 'UPI';

interface CartItem {
    sku: SKUWithPrice;
    weight: number;
    rate: number;
    amount: number;
}

// Separate component for cart item row to prevent keyboard dismiss on re-render
interface CartItemRowProps {
    item: CartItem;
    isTablet: boolean;
    onUpdate: (skuId: string, field: 'weight' | 'amount', value: number) => void;
    onRemove: (skuId: string) => void;
    currentScaleWeight?: number;
    onLockWeight?: (weight: number) => void;
    isScaleConnected?: boolean;
}

const CartItemRow = memo(({
    item,
    isTablet,
    onUpdate,
    onRemove,
    currentScaleWeight = 0,
    onLockWeight,
    isScaleConnected = false
}: CartItemRowProps) => {
    // Local state for inputs - prevents keyboard dismiss
    const [weightInput, setWeightInput] = useState(item.weight > 0 ? item.weight.toString() : '');
    const [amountInput, setAmountInput] = useState(item.amount > 0 ? item.amount.toString() : '');

    const isOverLimit = item.weight > 0 && currentScaleWeight > (item.weight + 0.005); // 5g tolerance

    const handleWeightBlur = () => {
        const value = parseFloat(weightInput) || 0;
        onUpdate(item.sku.id, 'weight', value);
    };

    const handleAmountBlur = () => {
        const value = parseFloat(amountInput) || 0;
        onUpdate(item.sku.id, 'amount', value);
    };

    const handleCaptureWeight = () => {
        if (currentScaleWeight > 0) {
            const val = currentScaleWeight.toFixed(3);
            setWeightInput(val);
            onUpdate(item.sku.id, 'weight', currentScaleWeight);
        }
    };

    // Sync with parent state when item changes externally
    useEffect(() => {
        setWeightInput(item.weight > 0 ? item.weight.toFixed(3) : '');
        setAmountInput(item.amount > 0 ? item.amount.toFixed(2) : '');
    }, [item.weight, item.amount]);

    return (
        <View style={[
            cartItemStyles.cartItem,
            isTablet && cartItemStyles.cartItemTablet,
            isOverLimit && cartItemStyles.cartItemOverlimit
        ]}>
            <View style={cartItemStyles.cartItemHeader}>
                <View style={cartItemStyles.cartItemInfo}>
                    <Text style={[cartItemStyles.cartItemName, isTablet && cartItemStyles.cartItemNameTablet]}>
                        {item.sku.name}
                    </Text>
                    <Text style={cartItemStyles.cartItemRate}>₹{item.rate.toFixed(2)}/kg</Text>
                </View>
                <TouchableOpacity
                    style={cartItemStyles.removeButton}
                    onPress={() => onRemove(item.sku.id)}
                >
                    <Text style={cartItemStyles.removeButtonText}>✕</Text>
                </TouchableOpacity>
            </View>

            {/* Bidirectional Inputs */}
            <View style={cartItemStyles.cartInputRow}>
                <View style={cartItemStyles.cartInputGroup}>
                    <Text style={cartItemStyles.cartInputLabel}>Weight (kg)</Text>
                    <View style={cartItemStyles.inputWrapper}>
                        <TextInput
                            style={[cartItemStyles.cartInput, isTablet && cartItemStyles.cartInputTablet, { flex: 1 }]}
                            placeholder="0.000"
                            placeholderTextColor="#999"
                            value={weightInput}
                            onChangeText={setWeightInput}
                            onBlur={handleWeightBlur}
                            onSubmitEditing={handleWeightBlur}
                            keyboardType="decimal-pad"
                            returnKeyType="done"
                        />
                        {isScaleConnected && (
                            <TouchableOpacity style={cartItemStyles.scaleActionBtn} onPress={handleCaptureWeight}>
                                <Text style={styles.scaleActionEmoji}>📥</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
                <Text style={cartItemStyles.inputSeparator}>↔</Text>
                <View style={cartItemStyles.cartInputGroup}>
                    <Text style={cartItemStyles.cartInputLabel}>Amount (₹)</Text>
                    <View style={cartItemStyles.inputWrapper}>
                        <TextInput
                            style={[cartItemStyles.cartInput, isTablet && cartItemStyles.cartInputTablet, { flex: 1 }]}
                            placeholder="0.00"
                            placeholderTextColor="#999"
                            value={amountInput}
                            onChangeText={setAmountInput}
                            onBlur={handleAmountBlur}
                            onSubmitEditing={handleAmountBlur}
                            keyboardType="decimal-pad"
                            returnKeyType="done"
                        />
                        {isScaleConnected && (
                            <TouchableOpacity style={cartItemStyles.scaleActionBtn} onPress={() => onLockWeight?.(item.weight)}>
                                <Text style={styles.scaleActionEmoji}>🔒</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
            {isOverLimit && (
                <View style={cartItemStyles.warningStrip}>
                    <Text style={cartItemStyles.warningText}>⚠️ WEIGHT OVER LIMIT: {currentScaleWeight.toFixed(3)}kg</Text>
                </View>
            )}
        </View>
    );
});

// Styles for CartItemRow (defined separately to avoid re-creation)
const cartItemStyles = StyleSheet.create({
    cartItem: {
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    cartItemTablet: {
        padding: 16,
    },
    cartItemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    cartItemInfo: {
        flex: 1,
    },
    cartItemName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    cartItemNameTablet: {
        fontSize: 16,
    },
    cartItemRate: {
        fontSize: 12,
        color: '#1E4DD8',
        marginTop: 2,
    },
    removeButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#fee2e2',
        alignItems: 'center',
        justifyContent: 'center',
    },
    removeButtonText: {
        color: '#dc2626',
        fontSize: 14,
        fontWeight: '600',
    },
    cartInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    cartInputGroup: {
        flex: 1,
    },
    cartInputLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: '#666',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    cartInput: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 10,
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
        color: '#333',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    cartInputTablet: {
        fontSize: 18,
        padding: 12,
    },
    inputSeparator: {
        fontSize: 16,
        color: '#999',
        marginTop: 16,
    },
    cartItemOverlimit: {
        backgroundColor: '#fee2e2',
        borderColor: '#ef4444',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    scaleActionBtn: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: '#eef2ff',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#c7d2fe',
    },
    warningStrip: {
        marginTop: 8,
        backgroundColor: '#ef4444',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 4,
        alignItems: 'center',
    },
    warningText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
});


export default function POSHomeScreen() {
    const router = useRouter();
    const { width, height } = useWindowDimensions();
    const isLandscape = width > height;
    const isTablet = width >= 600;

    const { profile, signOut, storeIds, hasPermission } = useAuth();
    const {
        config: scaleConfig,
        currentWeight: currentScaleWeight,
        isScaleConnected,
        setActiveSlot,
        sendLockCommand
    } = useBluetoothScale();

    const {
        skus,
        activeStoreId,
        setActiveStore,
        isLoadingSKUs,
        isCreatingSale,
        error,
        fetchSKUs,
        createSale,
        clearError,
        lastSale,
    } = usePOS();

    const [cart, setCart] = useState<CartItem[]>([]);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
    const [cashReceived, setCashReceived] = useState('');
    const [showStoreSelector, setShowStoreSelector] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Check permissions and store selection
    useEffect(() => {
        if (!profile) return;

        if (!hasPermission('sales.create')) {
            Alert.alert(
                'Access Denied',
                'You do not have permission to create sales.',
                [{ text: 'OK', onPress: () => signOut() }]
            );
            return;
        }

        if (storeIds.length > 1 && !activeStoreId) {
            setShowStoreSelector(true);
        } else if (storeIds.length === 1 && !activeStoreId) {
            setActiveStore(storeIds[0]);
        }
    }, [profile, storeIds, activeStoreId]);

    // Fetch SKUs when store is selected
    useEffect(() => {
        if (activeStoreId) {
            fetchSKUs();
        }
    }, [activeStoreId]);

    // Navigate to receipt when sale is created
    useEffect(() => {
        if (lastSale) {
            router.push({
                pathname: '/(pos)/receipt',
                params: {
                    saleId: lastSale.id,
                    receiptNumber: lastSale.receipt_number,
                    totalAmount: lastSale.total_amount,
                    paymentMethod: lastSale.payment_method,
                },
            });
        }
    }, [lastSale]);

    // Show errors
    useEffect(() => {
        if (error) {
            Alert.alert('Error', error, [{ text: 'OK', onPress: clearError }]);
        }
    }, [error]);

    // Add item to cart
    const addToCart = (sku: SKUWithPrice) => {
        const existing = cart.find(item => item.sku.id === sku.id);
        if (existing) {
            Alert.alert('Already in Cart', 'This item is already in your cart');
            return;
        }

        const rate = sku.current_price != null ? Number(sku.current_price) : 0;
        setCart([...cart, {
            sku,
            weight: 0,
            rate,
            amount: 0,
        }]);
    };

    // Update cart item - bidirectional calculation
    const updateCartItem = (skuId: string, field: 'weight' | 'amount', value: number) => {
        setCart(cart.map(item => {
            if (item.sku.id !== skuId) return item;

            const updated = { ...item };
            if (field === 'weight') {
                updated.weight = value;
                updated.amount = value * updated.rate;
            } else {
                updated.amount = value;
                updated.weight = updated.rate > 0 ? value / updated.rate : 0;
            }
            return updated;
        }));
    };

    // Remove item from cart
    const removeFromCart = (skuId: string) => {
        setCart(cart.filter(item => item.sku.id !== skuId));
    };

    const filteredSKUs = skus.filter(sku =>
        sku.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sku.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Calculate totals
    const totalAmount = cart.reduce((sum, item) => sum + item.amount, 0);
    const totalWeight = cart.reduce((sum, item) => sum + item.weight, 0);

    async function handleSubmitSale() {
        if (cart.length === 0) {
            Alert.alert('Error', 'Cart is empty');
            return;
        }

        const invalidItems = cart.filter(item => item.weight <= 0);
        if (invalidItems.length > 0) {
            Alert.alert('Error', 'All items must have weight > 0');
            return;
        }

        try {
            await createSale({
                items: cart.map(item => ({
                    sku_id: item.sku.id,
                    weight: item.weight,
                    price_snapshot: item.rate,
                })),
                payment_method: paymentMethod,
            });
            setCart([]);
        } catch (err) {
            // Error is handled by usePOS
        }
    }

    function handleLogout() {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Logout', style: 'destructive', onPress: signOut },
            ]
        );
    }

    // Check if SKU is in cart
    const isInCart = (skuId: string) => cart.some(item => item.sku.id === skuId);

    // Granular responsive logic for 8-14 inch tablets
    const numColumns = isTablet
        ? (width > 1200 ? 4 : width > 900 ? 3 : 2)
        : 1;

    const productPanelRatio = isLandscape && isTablet
        ? (width > 1200 ? 0.7 : 0.65)
        : 1;

    const productItemWidth = isTablet
        ? (width * productPanelRatio - (isLandscape ? 48 : 32)) / numColumns
        : '100%';

    // Scaling factors for fonts and spacing (normalized to 10-inch ~800px width)
    const scale = isTablet ? Math.min(width / 900, 1.3) : 1;
    const scaled = (size: number) => Math.round(size * scale);

    // Product List Component
    const ProductList = () => (
        <View style={[
            styles.productPanel,
            isLandscape && isTablet && { flex: productPanelRatio }
        ]}>
            {/* Search */}
            <View style={styles.searchContainer}>
                <TextInput
                    style={[styles.searchInput, isTablet && styles.searchInputTablet]}
                    placeholder="🔍 Search products..."
                    placeholderTextColor="#999"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {/* Products */}
            {isLoadingSKUs ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#1E4DD8" />
                    <Text style={styles.loadingText}>Loading products...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredSKUs}
                    keyExtractor={(item) => item.id}
                    numColumns={numColumns}
                    key={numColumns}
                    contentContainerStyle={styles.productListContent}
                    renderItem={({ item }) => {
                        const inCart = isInCart(item.id);
                        return (
                            <TouchableOpacity
                                style={[
                                    styles.productItem,
                                    isTablet && styles.productItemTablet,
                                    { width: productItemWidth },
                                    inCart && styles.productItemInCart,
                                ]}
                                onPress={() => addToCart(item)}
                                disabled={inCart}
                            >
                                {inCart && (
                                    <View style={styles.inCartBadge}>
                                        <Text style={styles.inCartText}>✓ In Cart</Text>
                                    </View>
                                )}
                                <Text style={[
                                    styles.productName,
                                    isTablet && { fontSize: scaled(18) },
                                    inCart && styles.productNameDisabled
                                ]}>
                                    {item.name}
                                </Text>
                                <Text style={styles.productCode}>{item.code}</Text>
                                <Text style={[
                                    styles.productPrice,
                                    isTablet && { fontSize: scaled(20) }
                                ]}>
                                    ₹{item.current_price != null ? Number(item.current_price).toFixed(2) : '-.--'}/{item.unit}
                                </Text>
                            </TouchableOpacity>
                        );
                    }}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>
                            {searchQuery ? 'No products found' : 'No products available'}
                        </Text>
                    }
                />
            )}
        </View>
    );

    // Cart & Checkout Component
    const CartPanel = () => (
        <View style={[
            styles.cartPanel,
            isLandscape && isTablet && { flex: 1 - productPanelRatio, maxHeight: 'auto', borderTopWidth: 0 }
        ]}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Cart Header */}
                <View style={styles.cartHeader}>
                    <Text style={[styles.cartTitle, isTablet && styles.cartTitleTablet]}>🛒 Cart</Text>
                    <Text style={styles.cartCount}>{cart.length} items</Text>
                </View>

                {/* Scale Machine Selector */}
                <View style={styles.scaleSelector}>
                    <Text style={styles.scaleSelectorLabel}>Scale Slot:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scaleTabs}>
                        {[1, 2, 3, 4, 5, 6].map(slot => (
                            <TouchableOpacity
                                key={slot}
                                style={[
                                    styles.scaleTab,
                                    scaleConfig.activeSlot === slot && styles.scaleTabActive
                                ]}
                                onPress={() => setActiveSlot(slot)}
                            >
                                <Text style={[
                                    styles.scaleTabText,
                                    scaleConfig.activeSlot === slot && styles.scaleTabTextActive
                                ]}>{slot}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    <View style={isScaleConnected ? styles.scaleStatusDotConnected : styles.scaleStatusDotDisconnected} />
                </View>

                {/* Cart Items */}
                {cart.length === 0 ? (
                    <View style={styles.emptyCart}>
                        <Text style={styles.emptyCartText}>Tap products to add</Text>
                    </View>
                ) : (
                    cart.map((item) => (
                        <CartItemRow
                            key={item.sku.id}
                            item={item}
                            isTablet={isTablet}
                            onUpdate={updateCartItem}
                            onRemove={removeFromCart}
                            currentScaleWeight={currentScaleWeight}
                            onLockWeight={(weight) => sendLockCommand(scaleConfig.activeSlot, weight)}
                            isScaleConnected={isScaleConnected}
                        />
                    ))
                )}

                {/* Payment Method */}
                {cart.length > 0 && (
                    <View style={[styles.paymentSection, isTablet && styles.paymentSectionTablet]}>
                        <Text style={styles.sectionTitle}>Payment</Text>
                        <View style={styles.paymentGrid}>
                            <TouchableOpacity
                                style={[
                                    styles.paymentButton,
                                    isTablet && styles.paymentButtonTablet,
                                    paymentMethod === 'CASH' && styles.paymentButtonCash,
                                ]}
                                onPress={() => setPaymentMethod('CASH')}
                            >
                                <Text style={styles.paymentEmoji}>💵</Text>
                                <Text style={[
                                    styles.paymentButtonText,
                                    paymentMethod === 'CASH' && styles.paymentButtonTextActive,
                                ]}>CASH</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.paymentButton,
                                    isTablet && styles.paymentButtonTablet,
                                    paymentMethod === 'UPI' && styles.paymentButtonUPI,
                                ]}
                                onPress={() => setPaymentMethod('UPI')}
                            >
                                <Text style={styles.paymentEmoji}>📱</Text>
                                <Text style={[
                                    styles.paymentButtonText,
                                    paymentMethod === 'UPI' && styles.paymentButtonTextActive,
                                ]}>UPI</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Cash Received Input - Only for CASH */}
                        {paymentMethod === 'CASH' && cart.length > 0 && (
                            <View style={styles.cashReceivedSection}>
                                <View style={styles.cashReceivedRow}>
                                    <Text style={styles.cashReceivedLabel}>Cash Received</Text>
                                    <TextInput
                                        style={[styles.cashReceivedInput, isTablet && styles.cashReceivedInputTablet]}
                                        placeholder="₹ 0.00"
                                        placeholderTextColor="#999"
                                        value={cashReceived}
                                        onChangeText={setCashReceived}
                                        keyboardType="decimal-pad"
                                    />
                                </View>
                                {parseFloat(cashReceived) > 0 && (
                                    <View style={[
                                        styles.changeRow,
                                        parseFloat(cashReceived) >= totalAmount ? styles.changeRowPositive : styles.changeRowNegative
                                    ]}>
                                        <Text style={styles.changeLabel}>
                                            {parseFloat(cashReceived) >= totalAmount ? '💰 Change to Give' : '⚠️ Amount Short'}
                                        </Text>
                                        <Text style={[
                                            styles.changeAmount,
                                            parseFloat(cashReceived) >= totalAmount ? styles.changeAmountPositive : styles.changeAmountNegative
                                        ]}>
                                            ₹{Math.abs(parseFloat(cashReceived) - totalAmount).toFixed(2)}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                )}

                {/* Total */}
                <View style={[styles.totalCard, isTablet && styles.totalCardTablet]}>
                    <View>
                        <Text style={styles.totalLabel}>TOTAL</Text>
                        <Text style={styles.weightSummary}>{totalWeight.toFixed(3)} kg</Text>
                    </View>
                    <Text style={[styles.totalAmount, isTablet && { fontSize: scaled(32) }]}>
                        ₹{totalAmount.toFixed(2)}
                    </Text>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                    style={[
                        styles.submitButton,
                        isTablet && { paddingVertical: scaled(16) },
                        (isCreatingSale || cart.length === 0) && styles.submitButtonDisabled,
                    ]}
                    onPress={handleSubmitSale}
                    disabled={isCreatingSale || cart.length === 0}
                >
                    {isCreatingSale ? (
                        <ActivityIndicator color="#fff" size="large" />
                    ) : (
                        <Text style={[styles.submitButtonText, isTablet && { fontSize: scaled(20) }]}>
                            ✓ Complete Sale
                        </Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Store Selector Modal */}
            <Modal visible={showStoreSelector} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, isTablet && styles.modalContentTablet]}>
                        <Text style={[styles.modalTitle, isTablet && styles.modalTitleTablet]}>Select Store</Text>
                        {storeIds.map((id) => (
                            <TouchableOpacity
                                key={id}
                                style={[styles.storeButton, isTablet && styles.storeButtonTablet]}
                                onPress={() => {
                                    setActiveStore(id);
                                    setShowStoreSelector(false);
                                }}
                            >
                                <Text style={[styles.storeButtonText, isTablet && styles.storeButtonTextTablet]}>
                                    Store #{id}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </Modal>

            {/* Header Bar */}
            <View style={[styles.headerBar, isTablet && styles.headerBarTablet]}>
                <View style={styles.headerLeft}>
                    <Text style={[styles.storeBadge, isTablet && styles.storeBadgeTablet]}>
                        Store #{activeStoreId}
                    </Text>
                    <Text style={[styles.userName, isTablet && styles.userNameTablet]}>
                        {profile?.full_name || profile?.email}
                    </Text>
                </View>
                <View style={styles.headerButtons}>
                    <Link href="/(pos)/scale-config" asChild>
                        <TouchableOpacity style={[styles.configButton, isTablet && styles.configButtonTablet]}>
                            <Text style={styles.configEmoji}>⚙️</Text>
                        </TouchableOpacity>
                    </Link>
                    <TouchableOpacity onPress={handleLogout} style={[styles.logoutButton, isTablet && styles.logoutButtonTablet]}>
                        <Text style={[styles.logoutText, isTablet && styles.logoutTextTablet]}>Logout</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Main Content - Side by Side on Landscape Tablets */}
            <View style={[styles.mainContent, isLandscape && isTablet && styles.mainContentLandscape]}>
                <ProductList />
                <CartPanel />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f2f5',
    },
    // Header
    headerBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    headerBarTablet: {
        paddingHorizontal: 24,
        paddingVertical: 16,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    storeBadge: {
        backgroundColor: '#1E4DD8',
        color: '#fff',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        fontSize: 12,
        fontWeight: '600',
        overflow: 'hidden',
    },
    storeBadgeTablet: {
        fontSize: 14,
        paddingHorizontal: 14,
        paddingVertical: 6,
    },
    userName: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    userNameTablet: {
        fontSize: 16,
    },
    logoutButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
    },
    logoutButtonTablet: {
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    logoutText: {
        fontSize: 13,
        color: '#666',
        fontWeight: '500',
    },
    logoutTextTablet: {
        fontSize: 15,
    },
    headerButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    configButton: {
        padding: 8,
        backgroundColor: '#f1f5f9',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    configButtonTablet: {
        padding: 10,
    },
    configEmoji: {
        fontSize: 18,
    },
    scaleActionEmoji: {
        fontSize: 16,
    },
    // Scale Selector
    scaleSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        gap: 12,
    },
    scaleSelectorLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#64748b',
        textTransform: 'uppercase',
    },
    scaleTabs: {
        flexDirection: 'row',
        gap: 6,
    },
    scaleTab: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    scaleTabActive: {
        backgroundColor: '#1E4DD8',
        borderColor: '#1E4DD8',
    },
    scaleTabText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#64748b',
    },
    scaleTabTextActive: {
        color: '#fff',
    },
    scaleStatusDotConnected: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#22c55e',
    },
    scaleStatusDotDisconnected: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#ef4444',
    },
    // Main Content
    mainContent: {
        flex: 1,
    },
    mainContentLandscape: {
        flexDirection: 'row',
    },
    // Product Panel
    productPanel: {
        flex: 1,
    },
    productPanelLandscape: {
        flex: 0.55,
        borderRightWidth: 1,
        borderRightColor: '#e0e0e0',
    },
    searchContainer: {
        padding: 12,
    },
    searchInput: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    searchInputTablet: {
        padding: 16,
        fontSize: 18,
        borderRadius: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        color: '#666',
        fontSize: 14,
    },
    productListContent: {
        padding: 12,
        gap: 12,
    },
    productItem: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginRight: 12,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: 'transparent',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    productItemTablet: {
        padding: 20,
        borderRadius: 16,
    },
    productItemInCart: {
        borderColor: '#22c55e',
        backgroundColor: '#f0fdf4',
        opacity: 0.7,
    },
    inCartBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#22c55e',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    inCartText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '600',
    },
    productName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    productNameTablet: {
        fontSize: 18,
    },
    productNameDisabled: {
        color: '#666',
    },
    productCode: {
        fontSize: 12,
        color: '#999',
        marginBottom: 8,
    },
    productPrice: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1E4DD8',
    },
    productPriceTablet: {
        fontSize: 22,
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        marginTop: 32,
        fontSize: 16,
    },
    // Cart Panel
    cartPanel: {
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        maxHeight: 450,
    },
    cartPanelLandscape: {
        flex: 0.45,
        maxHeight: 'auto',
        borderTopWidth: 0,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    cartHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    cartTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
    },
    cartTitleTablet: {
        fontSize: 22,
    },
    cartCount: {
        fontSize: 12,
        color: '#666',
        backgroundColor: '#f0f0f0',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    emptyCart: {
        paddingVertical: 32,
        alignItems: 'center',
    },
    emptyCartText: {
        color: '#999',
        fontSize: 14,
        fontStyle: 'italic',
    },
    // Cart Item
    cartItem: {
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    cartItemTablet: {
        padding: 16,
    },
    cartItemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    cartItemInfo: {
        flex: 1,
    },
    cartItemName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    cartItemNameTablet: {
        fontSize: 16,
    },
    cartItemRate: {
        fontSize: 12,
        color: '#1E4DD8',
        marginTop: 2,
    },
    removeButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#fee2e2',
        alignItems: 'center',
        justifyContent: 'center',
    },
    removeButtonText: {
        color: '#dc2626',
        fontSize: 14,
        fontWeight: '600',
    },
    cartInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    cartInputGroup: {
        flex: 1,
    },
    cartInputLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: '#666',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    cartInput: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 10,
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
        color: '#333',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    cartInputTablet: {
        fontSize: 18,
        padding: 12,
    },
    inputSeparator: {
        fontSize: 16,
        color: '#999',
        marginTop: 16,
    },
    // Payment Section
    paymentSection: {
        marginTop: 12,
        marginBottom: 12,
    },
    paymentSectionTablet: {
        marginTop: 16,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    paymentGrid: {
        flexDirection: 'row',
        gap: 10,
    },
    paymentButton: {
        flex: 1,
        flexDirection: 'row',
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: '#f5f5f5',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    paymentButtonTablet: {
        paddingVertical: 18,
    },
    paymentButtonCash: {
        backgroundColor: '#dcfce7',
        borderColor: '#22c55e',
    },
    paymentButtonUPI: {
        backgroundColor: '#f3e8ff',
        borderColor: '#9333ea',
    },
    paymentEmoji: {
        fontSize: 20,
    },
    paymentButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#666',
    },
    paymentButtonTextActive: {
        color: '#333',
    },
    // Total
    totalCard: {
        backgroundColor: '#1E4DD8',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalCardTablet: {
        padding: 20,
    },
    totalLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.8)',
    },
    weightSummary: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.6)',
        marginTop: 2,
    },
    totalAmount: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
    },
    totalAmountTablet: {
        fontSize: 36,
    },
    // Submit Button
    submitButton: {
        backgroundColor: '#22c55e',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginBottom: 8,
    },
    submitButtonTablet: {
        padding: 20,
        borderRadius: 16,
    },
    submitButtonDisabled: {
        backgroundColor: '#93d7a8',
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    submitButtonTextTablet: {
        fontSize: 22,
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        width: '80%',
        maxWidth: 400,
    },
    modalContentTablet: {
        padding: 32,
        maxWidth: 500,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    modalTitleTablet: {
        fontSize: 24,
        marginBottom: 24,
    },
    storeButton: {
        padding: 18,
        backgroundColor: '#f5f7fa',
        borderRadius: 12,
        marginBottom: 10,
        alignItems: 'center',
    },
    storeButtonTablet: {
        padding: 22,
    },
    storeButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    storeButtonTextTablet: {
        fontSize: 18,
    },
    // Cash Received
    cashReceivedSection: {
        marginTop: 12,
    },
    cashReceivedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    cashReceivedLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    cashReceivedInput: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 12,
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#333',
        borderWidth: 2,
        borderColor: '#22c55e',
        width: 140,
    },
    cashReceivedInputTablet: {
        fontSize: 22,
        padding: 14,
        width: 180,
    },
    changeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
        padding: 12,
        borderRadius: 8,
    },
    changeRowPositive: {
        backgroundColor: '#dcfce7',
    },
    changeRowNegative: {
        backgroundColor: '#fee2e2',
    },
    changeLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    changeAmount: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    changeAmountPositive: {
        color: '#15803d',
    },
    changeAmountNegative: {
        color: '#dc2626',
    },
});
