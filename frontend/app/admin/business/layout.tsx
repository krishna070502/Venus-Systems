'use client'

import { StoreProvider } from '@/lib/context/StoreContext'

export default function BusinessLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <StoreProvider>
            {children}
        </StoreProvider>
    )
}
