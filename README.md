# 💰 ExpensePro - Elegant Secure Finance Management

ExpensePro is a sophisticated, full-stack financial management application designed with a "Privacy-First" philosophy. It combines sleek design with powerful analytics and Zero-Knowledge encryption to help you track spending, split bills with groups, and gain deep intelligence into your financial habits without compromising your privacy.

![ExpensePro Dashboard](https://cdn.phototourl.com/free/2026-05-03-83cbac06-95d4-4ef5-9ea2-255149385975.png)

## ✨ Core Pillars

### 🔐 Zero-Knowledge Privacy Vault
Your financial data belongs to you. With the integrated **Privacy Vault**, sensitive details like transaction descriptions and amounts are encrypted on the client-side before being sent to the server. Not even the database can read your data. Shared group splits are secured with group-specific keys, ensuring only members can see the details.

### 👥 Seamless Group Splitting
Dining out? Traveling with friends? Create groups, add members, and split bills instantly. ExpensePro handles the math and keeps everyone on the same page with a dedicated activity timeline.

### 📊 Professional Analytics & Insights
Visualize your financial health with high-fidelity charts. Breakdown spending by category, track trends over time, and export professional PDF reports for your personal records or tax filings.

### 🤖 AI-Powered Intelligence
Gain conversational insights into your spending patterns. Our integrated AI assistant can answer questions about your budget, suggest saving tips, and identify unusual spending trends based on your history.

---

## 🚀 Features

- **End-to-End Encryption**: Optional vault mode to encrypt your personal and group expenses.
- **Dynamic Navigation**: Sleek, high-accessibility navigation panel for desktop and intuitive mobile-first navigation.
- **Interactive Reports**: Generate and download detailed PDF reports of your transactions and financial summaries.
- **Deep Filtering**: Filter transactions by Weekly, Monthly, Quarterly, or Yearly timeframes with full date range support.
- **Real-time Activity**: Track group expenses with a beautiful activity timeline featuring instant updates and pagination.
- **Custom Categories**: Personalize your tracking with custom categories, icons, and colors.
- **Professional UI**: Fully responsive, dark-themed interface built for a premium user experience.

---

## 🛠️ Tech Stack

- **Frontend**: [React 18](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Encryption**: [CryptoJS](https://cryptojs.gitbook.io/docs/) (AES-256)
- **State Management**: [TanStack Query v5](https://tanstack.com/query/latest)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Database**: [Prisma](https://www.prisma.io/) + PostgreSQL/SQLite
- **Backend**: [Express](https://expressjs.com/)
- **Charts**: [Recharts](https://recharts.org/)
- **AI Integration**: [Google Gemini API](https://ai.google.dev/)
- **PDF Generation**: [jsPDF](https://github.com/parallax/jsPDF)

---

## 🛠️ Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/dharmeshkota/expense-tracker.git
   cd expense-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the root directory based on `.env.example`:
   ```env
   DATABASE_URL="your-database-url"
   AUTH_SECRET="your-secret"
   GEMINI_API_KEY="your-google-ai-api-key"
   ```

4. **Initialize Database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

---

## 📸 Screenshots

| Expenses | Insights |
| :---: | :---: |
| ![Expenses](https://cdn.phototourl.com/free/2026-05-03-201399e4-9dae-45dc-9f75-bd985d01f61f.png) | ![Insights](https://cdn.phototourl.com/free/2026-05-03-5653bff3-264d-4e74-b2a0-99f3b1ed61da.png) |

| Groups | Privacy & Security |
| :---: | :---: |
| ![Groups](https://cdn.phototourl.com/free/2026-05-03-fcb9f567-e990-4d09-a19b-35c1922de833.png) | ![Privacy & Security](https://cdn.phototourl.com/free/2026-05-03-9aab3a9d-de6b-432f-aedf-78fed2ee3a5d.png) |

---

Built with ❤️ by DHARMESH KOTA.
