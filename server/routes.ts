import { Express } from 'express';
import prisma from './db.js';

export function setupRoutes(app: Express) {
  // Middleware to check if user is authenticated
  const isAuthenticated = (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ error: 'Unauthorized' });
  };

  // Expense Routes
  app.get('/api/expenses', isAuthenticated, async (req: any, res) => {
    const expenses = await prisma.expense.findMany({
      where: { userId: req.user.id },
      orderBy: { date: 'desc' },
    });
    res.json(expenses);
  });

  app.post('/api/expenses', isAuthenticated, async (req: any, res) => {
    const { amount, category, description, date } = req.body;
    const expense = await prisma.expense.create({
      data: {
        amount: parseFloat(amount),
        category,
        description,
        date: new Date(date),
        userId: req.user.id,
      },
    });
    res.json(expense);
  });

  app.delete('/api/expenses/:id', isAuthenticated, async (req: any, res) => {
    try {
      const expenseId = req.params.id;
      const userId = req.user.id;

      const expense = await prisma.expense.findUnique({
        where: { id: expenseId }
      });

      if (!expense) {
        return res.status(404).json({ error: 'Expense not found' });
      }

      if (expense.userId !== userId) {
        return res.status(403).json({ error: 'Unauthorized to delete this expense' });
      }

      await prisma.expense.delete({
        where: { id: expenseId }
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Delete expense error:', error);
      res.status(500).json({ error: 'Failed to delete expense' });
    }
  });

  // Recurring Bill Routes
  app.get('/api/bills', isAuthenticated, async (req: any, res) => {
    const bills = await prisma.recurringBill.findMany({
      where: { userId: req.user.id },
      orderBy: { dueDate: 'asc' },
    });
    res.json(bills);
  });

  app.post('/api/bills', isAuthenticated, async (req: any, res) => {
    const { name, amount, dueDate, month, year } = req.body;
    const bill = await prisma.recurringBill.create({
      data: {
        name,
        amount: parseFloat(amount),
        dueDate: parseInt(dueDate),
        month: parseInt(month),
        year: parseInt(year),
        userId: req.user.id,
      },
    });
    res.json(bill);
  });

  app.patch('/api/bills/:id', isAuthenticated, async (req: any, res) => {
    const { isPaid } = req.body;
    const bill = await prisma.recurringBill.update({
      where: { id: req.params.id, userId: req.user.id },
      data: { isPaid },
    });
    res.json(bill);
  });

  app.delete('/api/bills/:id', isAuthenticated, async (req: any, res) => {
    try {
      const billId = req.params.id;
      const userId = req.user.id;
      
      const bill = await prisma.recurringBill.findUnique({
        where: { id: billId }
      });

      if (!bill) {
        return res.status(404).json({ error: 'Bill not found' });
      }

      if (bill.userId !== userId) {
        return res.status(403).json({ error: 'Unauthorized to delete this bill' });
      }

      await prisma.recurringBill.delete({
        where: { id: billId }
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Delete bill error:', error);
      res.status(500).json({ error: 'Failed to delete bill' });
    }
  });

  // Budget Routes
  app.get('/api/budget', isAuthenticated, async (req: any, res) => {
    const { month, year } = req.query;
    const budget = await prisma.budget.findUnique({
      where: {
        userId_month_year: {
          userId: req.user.id,
          month: parseInt(month as string),
          year: parseInt(year as string),
        },
      },
    });
    res.json(budget);
  });

  app.post('/api/budget', isAuthenticated, async (req: any, res) => {
    const { totalSalary, month, year } = req.body;
    const budget = await prisma.budget.upsert({
      where: {
        userId_month_year: {
          userId: req.user.id,
          month: parseInt(month),
          year: parseInt(year),
        },
      },
      update: { totalSalary: parseFloat(totalSalary) },
      create: {
        totalSalary: parseFloat(totalSalary),
        month: parseInt(month),
        year: parseInt(year),
        userId: req.user.id,
      },
    });
    res.json(budget);
  });

  // Dashboard Stats
  app.get('/api/stats', isAuthenticated, async (req: any, res) => {
    const { month, year } = req.query;
    const m = parseInt(month as string);
    const y = parseInt(year as string);

    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0);

    const expenses = await prisma.expense.findMany({
      where: {
        userId: req.user.id,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const budget = await prisma.budget.findUnique({
      where: {
        userId_month_year: {
          userId: req.user.id,
          month: m,
          year: y,
        },
      },
    });

    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
    const categoryBreakdown = expenses.reduce((acc: any, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {});

    res.json({
      totalSalary: budget?.totalSalary || 0,
      totalSpent,
      remaining: (budget?.totalSalary || 0) - totalSpent,
      categoryBreakdown: Object.entries(categoryBreakdown).map(([name, value]) => ({ name, value })),
      recentExpenses: expenses.slice(0, 5),
    });
  });

  // Reset Data Route
  app.post('/api/reset', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      await prisma.$transaction([
        prisma.expense.deleteMany({ where: { userId } }),
        prisma.recurringBill.deleteMany({ where: { userId } }),
        prisma.budget.deleteMany({ where: { userId } }),
      ]);
      res.json({ success: true });
    } catch (error) {
      console.error('Reset data error:', error);
      res.status(500).json({ error: 'Failed to reset data' });
    }
  });
}
