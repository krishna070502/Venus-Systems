/**
 * POS Group Layout
 * ================
 * Layout for POS screens with header
 */

import { Stack } from 'expo-router';

export default function POSLayout() {
    return (
        <Stack
            screenOptions={{
                headerStyle: {
                    backgroundColor: '#1E4DD8',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                    fontWeight: 'bold',
                },
            }}
        >
            <Stack.Screen
                name="index"
                options={{
                    title: 'Venus POS',
                }}
            />
            <Stack.Screen
                name="receipt"
                options={{
                    title: 'Receipt',
                    headerBackVisible: false,
                }}
            />
        </Stack>
    );
}
