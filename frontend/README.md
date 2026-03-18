# StockFlow — Frontend

Modern inventory management dashboard built with **React 18**, **React Router v6**, and a custom CSS design system in a deep orange + slate dark theme.

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file
cp .env.example .env.local

# 3. Start development server
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔐 Demo Credentials

| Role    | Email                     | Password   |
|---------|---------------------------|------------|
| Admin   | admin@stockflow.io        | admin123   |
| Manager | manager@stockflow.io      | manager123 |

> **Note:** The app uses mock authentication by default. To connect to real backends, update your `.env.local` with the service URLs.

---

## 📁 Project Structure

```
src/
├── App.jsx                        # Root router with all routes
├── index.js                       # Entry point
├── index.css                      # Global CSS design system
│
├── context/
│   ├── AuthContext.jsx            # Auth state, login/logout
│   └── ToastContext.jsx           # Toast notification system
│
├── components/
│   ├── layout/
│   │   ├── AppLayout.jsx          # Main authenticated layout
│   │   ├── Sidebar.jsx            # Navigation sidebar
│   │   ├── Topbar.jsx             # Top header bar
│   │   └── RouteGuards.jsx        # Protected/Admin/Public route wrappers
│   ├── ui/
│   │   ├── Icon.jsx               # Inline SVG icon library
│   │   └── FullLoader.jsx         # Full-page loading screen
│   └── charts/
│       └── Charts.jsx             # Sparkline, BarChart, DonutChart
│
├── pages/
│   ├── public/
│   │   ├── LandingPage.jsx        # Marketing landing page
│   │   ├── LoginPage.jsx          # Split-panel login
│   │   ├── RegisterPage.jsx       # Split-panel register
│   │   ├── ForgotPasswordPage.jsx # Password reset request
│   │   └── AuthHelperPages.jsx    # VerifyEmail + ResetPassword
│   ├── protected/
│   │   ├── DashboardPage.jsx      # Main KPI dashboard
│   │   ├── ProductsPage.jsx       # Product CRUD table
│   │   ├── StockPage.jsx          # Stock levels, movements, alerts
│   │   ├── SuppliersPage.jsx      # Supplier card grid
│   │   └── ProfileSettings.jsx    # Profile + Settings pages
│   ├── admin/
│   │   └── AdminPages.jsx         # AdminUsers + Reports (admin only)
│   └── errors/
│       └── ErrorPages.jsx         # 401 Unauthorized + 404 Not Found
│
└── services/
    └── api.js                     # Axios clients for all 4 microservices
```

---

## 🎨 Design System

- **Fonts:** Syne (display/headings) + DM Sans (body)
- **Palette:** Deep slate dark theme with orange `#f97316` accent
- **Animations:** CSS keyframe animations with staggered delays
- **Components:** Cards, badges, modals, tables, charts, toasts — all custom CSS

---

## 🔗 Microservice Connections

| Service   | Default URL                        | Purpose                       |
|-----------|------------------------------------|-------------------------------|
| Users     | `http://localhost:5001/api/v1/users`    | Auth, user management         |
| Products  | `http://localhost:5002/api/v1/products` | Product catalog               |
| Stock     | `http://localhost:5003/api/v1/stock`    | Inventory levels & movements  |
| Suppliers | `http://localhost:5004/api/v1/suppliers`| Supplier management           |

---

## 📦 Build for Production

```bash
npm run build
```

Output goes to `/build`. Serve with any static host (Nginx, Vercel, Netlify, S3+CloudFront).

---

## 🗺️ All Routes

| Path                    | Access      | Page                   |
|-------------------------|-------------|------------------------|
| `/`                     | Public      | Landing page           |
| `/login`                | Public only | Login (split layout)   |
| `/register`             | Public only | Register (split layout)|
| `/forgot-password`      | Public only | Forgot password        |
| `/reset-password/:token`| Public      | Reset password         |
| `/verify-email/:token`  | Public      | Email verification     |
| `/dashboard`            | Auth        | KPI Dashboard          |
| `/products`             | Auth        | Product management     |
| `/stock`                | Auth        | Stock management       |
| `/suppliers`            | Auth        | Supplier management    |
| `/profile`              | Auth        | User profile           |
| `/settings`             | Auth        | App settings           |
| `/admin/users`          | Admin only  | User management        |
| `/admin/reports`        | Admin only  | Reports & analytics    |
| `/unauthorized`         | Public      | 401 error page         |
| `*`                     | Public      | 404 not found page     |
