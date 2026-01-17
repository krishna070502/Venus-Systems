/**
 * Auth Group Layout
 * =================
 * Layout for authentication screens (login, etc.)
 */

import { Stack } from 'expo-router';

export default function AuthLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
            }}
        />
    );
}
