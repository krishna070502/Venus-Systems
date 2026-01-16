# Frontend Overview

The Venus-System frontend is built with **Next.js 14** using the App Router pattern.

## Directory Structure

```
frontend/
├── app/                    # App Router pages
│   ├── admin/             # Admin dashboard pages (48 files)
│   │   ├── activity-logs/ # Activity monitoring
│   │   ├── ai-settings/   # AI configuration
│   │   ├── business/      # Business management
│   │   ├── health/        # System health
│   │   ├── logs/          # Audit logs
│   │   ├── permissions/   # Permission management
│   │   ├── roles/         # Role management
│   │   ├── settings/      # System settings
│   │   ├── test/          # Test dashboard
│   │   └── users/         # User management
│   ├── auth/              # Authentication pages
│   │   └── login/         # Login page
│   ├── stack/             # Landing page
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── admin/             # Admin UI components
│   ├── ai/                # AI chat widget
│   ├── pos/               # Point of Sale
│   ├── poultry/           # Business components
│   └── ui/                # Base UI library
├── lib/                   # Utilities
│   ├── api/               # API client
│   ├── auth/              # Auth hooks
│   ├── context/           # React contexts
│   ├── supabase/          # Supabase client
│   └── types/             # TypeScript types
├── public/                # Static assets
├── next.config.js         # Next.js config
├── tailwind.config.js     # Tailwind CSS config
└── tsconfig.json          # TypeScript config
```

## Technology Stack

| Technology | Purpose |
|------------|---------|
| Next.js 14 | React framework with App Router |
| React | UI library |
| TypeScript | Type safety |
| Tailwind CSS | Utility-first styling |
| Supabase Auth Helpers | Authentication |
| Lucide React | Icon library |

## Key Configuration Files

### next.config.js

```javascript
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
}
```

### Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME="Venus Chicken"
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Routing

### App Router Structure

| Route | Page | Permission |
|-------|------|------------|
| `/` | Home/Landing | Public |
| `/auth/login` | Login | Public |
| `/admin` | Admin Dashboard | `systemdashboard.view` |
| `/admin/users` | User Management | `users.read` |
| `/admin/roles` | Role Management | `roles.read` |
| `/admin/permissions` | Permission Management | `permissions.read` |
| `/admin/logs` | Audit Logs | `system.logs` |
| `/admin/activity-logs` | Activity Logs | `system.logs` |
| `/admin/settings` | System Settings | `system.settings` |
| `/admin/health` | Health Dashboard | `system.admin` |
| `/admin/ai-settings` | AI Configuration | `ai.admin` |

### Business Routes

| Route | Page | Permission |
|-------|------|------------|
| `/admin/business/shops` | Shop Management | `shops.sidebar` |
| `/admin/business/inventory/*` | Inventory | `inventory.sidebar` |
| `/admin/business/sales/*` | Sales/POS | `sales.sidebar` |
| `/admin/business/settlements` | Settlements | `settlements.sidebar` |
| `/admin/business/variance` | Variance | `variance.sidebar` |

---

## Styling

### Tailwind Configuration

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { ... },
        secondary: { ... },
        destructive: { ... },
        muted: { ... },
        accent: { ... },
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
  ],
}
```

### CSS Variables

```css
/* globals.css */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --secondary: 210 40% 96.1%;
  --muted: 210 40% 96.1%;
  --accent: 210 40% 96.1%;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
}
```

---

## Related Pages

- [[Components]] - UI component library
- [[State-Management]] - Hooks and context
- [[API-Client]] - Backend integration
- [[Authentication]] - Auth system
