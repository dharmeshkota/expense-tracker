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
    const { month, year, page = '1', limit = '10', type } = req.query;
    const p = parseInt(page as string);
    const l = parseInt(limit as string);
    
    const where: any = { userId: req.user.id };
    
    if (month && year) {
      const m = parseInt(month as string);
      const y = parseInt(year as string);
      where.date = {
        gte: new Date(y, m - 1, 1),
        lte: new Date(y, m, 0),
      };
    }

    if (type) {
      where.type = type;
    }

    const [expenses, total] = await prisma.$transaction([
      (prisma.expense as any).findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (p - 1) * l,
        take: l,
      }),
      (prisma.expense as any).count({ where }),
    ]);

    res.json({
      expenses,
      pagination: {
        total,
        pages: Math.ceil(total / l),
        currentPage: p,
        limit: l,
      }
    });
  });

  app.post('/api/expenses', isAuthenticated, async (req: any, res) => {
    const { amount, category, description, date, type = 'expense' } = req.body;
    const expense = await (prisma.expense as any).create({
      data: {
        amount: parseFloat(amount),
        category,
        description,
        type,
        date: new Date(date),
        userId: req.user.id,
      },
    });
    res.json(expense);
  });

  // Category Routes
  app.get('/api/categories', isAuthenticated, async (req: any, res) => {
    const categories = await prisma.category.findMany({
      where: { userId: req.user.id },
      orderBy: { name: 'asc' },
    });
    res.json(categories);
  });

  app.post('/api/categories', isAuthenticated, async (req: any, res) => {
    try {
      const { id, name, icon, color, excludeFromBudget, type = 'expense' } = req.body;
      
      const category = await (prisma.category as any).upsert({
        where: id ? { id } : {
          userId_name: {
            userId: req.user.id,
            name,
          },
        },
        update: { 
          icon, 
          color, 
          excludeFromBudget: Boolean(excludeFromBudget), 
          type: type 
        },
        create: {
          name,
          icon,
          color,
          excludeFromBudget: Boolean(excludeFromBudget),
          type: type,
          userId: req.user.id,
        },
      });
      res.json(category);
    } catch (error: any) {
      console.error('Category save error:', error);
      res.status(500).json({ error: error.message || 'Failed to save category' });
    }
  });

  app.delete('/api/categories/:id', isAuthenticated, async (req: any, res) => {
    await prisma.category.delete({
      where: { id: req.params.id, userId: req.user.id },
    });
    res.json({ success: true });
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

    const [expenses, categories, budget] = await prisma.$transaction([
      prisma.expense.findMany({
        where: {
          userId: req.user.id,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
      prisma.category.findMany({
        where: { userId: req.user.id },
      }),
      prisma.budget.findUnique({
        where: {
          userId_month_year: {
            userId: req.user.id,
            month: m,
            year: y,
          },
        },
      }),
    ]);

    const excludedCategoryNames = categories
      .filter(c => c.excludeFromBudget)
      .map(c => c.name);

    const totalIncome = expenses
      .filter(e => e.type === 'income')
      .reduce((sum, e) => sum + e.amount, 0);

    const totalSpent = expenses
      .filter(e => e.type === 'expense')
      .reduce((sum, e) => sum + e.amount, 0);

    const budgetSpent = expenses
      .filter(e => e.type === 'expense' && !excludedCategoryNames.includes(e.category))
      .reduce((sum, e) => sum + e.amount, 0);

    const categoryBreakdown = expenses
      .filter(e => e.type === 'expense')
      .reduce((acc: any, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount;
        return acc;
      }, {});

    res.json({
      totalSalary: budget?.totalSalary || 0,
      totalIncome,
      totalSpent,
      budgetSpent,
      remaining: (budget?.totalSalary || 0) + totalIncome - totalSpent,
      categoryBreakdown: Object.entries(categoryBreakdown).map(([name, value]) => ({ name, value })),
      recentExpenses: expenses.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5),
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
