# 💰 ExpensePro - Modern Smart Finance Management

ExpensePro is a sophisticated, full-stack financial management application designed for the modern user. Combining sleek design with powerful AI insights, it helps you track spending, split bills with groups, and gain deep intelligence into your financial habits.

![ExpensePro Dashboard](https://cdn.phototourl.com/free/2026-05-02-d50e3377-27f3-463d-a651-72fbcfd18817.png)

## ✨ Core Pillars

### 🤖 AI-Powered Intelligence
Gain conversational insights into your spending patterns. Our integrated AI assistant can answer questions about your budget, suggest saving tips, and identify unusual spending trends.

### 👥 Seamless Group Splitting
Dining out? Traveling with friends? Create groups, add members, and split bills instantly. ExpensePro handles the math and keeps everyone on the same page.

### 📊 Professional Analytics
Visualize your financial health with high-fidelity charts. Breakdown spending by category, track income vs. expenses over time, and export professional PDF reports for your records.

### 🧩 Smart Budgeting
Set monthly targets, track utilization in real-time, and get notified when you're nearing your limits. Supports multi-currency for global compatibility.

---

## 🚀 Features

- **Dynamic Navigation**: Fixed, high-accessibility navigation panel for desktop and intuitive mobile-first navigation.
- **Deep Filtering**: Filter transactions by Weekly, Monthly, Quarterly, or Yearly timeframes with full date range support.
- **Interactive Reports**: Generate and download detailed PDF reports of your transactions and financial summaries.
- **Real-time Activity**: Track group expenses with a beautiful timeline view and instant updates.
- **Custom Categories**: Personalize your tracking with custom categories, icons, and colors.
- **AI Assistant Modal**: A persistent AI companion ready to help you navigate your finances from any page.

---

## 🛠️ Tech Stack

- **Frontend**: [React 18](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Components**: [shadcn/ui](https://ui.shadcn.com/)
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

| Expenses | Insights | Groups |
| :---: | :---: | :---: |
| ![Expenses](https://cdn.phototourl.com/free/2026-05-02-8b198475-7f34-4b6f-a1ef-899b01a09961.png) | ![Insights](https://cdn.phototourl.com/free/2026-05-02-70387d4d-b624-45a8-9d98-656aacc6dc41.png) | ![Groups](https://cdn.phototourl.com/free/2026-05-02-d31f923e-4fea-4b10-97f9-b9d1a5af4f72.png) |


Built with ❤️ by DHARMESH KOTA!
