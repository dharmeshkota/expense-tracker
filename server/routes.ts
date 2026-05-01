import { Express } from 'express';
import prisma from './db.js';

export function setupRoutes(app: Express) {
  // Middleware to check if user is authenticated
  const isAuthenticated = (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ error: 'Unauthorized' });
  };

  // Auth User check
  app.get('/api/auth/me', async (req: any, res) => {
    if (req.isAuthenticated()) {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          currency: true,
          monthlyBudget: true,
          theme: true,
        }
      });
      res.json(user);
    } else {
      res.status(401).json({ error: 'Unauthorized' });
    }
  });

  // Helper to check group membership
  const isGroupMember = async (userId: string, groupId: string) => {
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId }
      }
    });
    return !!membership;
  };

  // Settings Routes
  app.patch('/api/settings', isAuthenticated, async (req: any, res) => {
    const { currency, monthlyBudget, theme, name } = req.body;
    try {
      const user = await prisma.user.update({
        where: { id: req.user.id },
        data: {
          ...(currency && { currency }),
          ...(monthlyBudget !== undefined && { monthlyBudget: parseFloat(monthlyBudget) }),
          ...(theme && { theme }),
          ...(name && { name }),
        },
      });
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update settings' });
    }
  });

  // Expense Routes
  app.get('/api/expenses', isAuthenticated, async (req: any, res) => {
    const { month, year, page = '1', limit = '10', type, startDate, endDate } = req.query;
    const p = parseInt(page as string);
    const l = parseInt(limit as string);
    
    const where: any = { userId: req.user.id };
    
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    } else if (month && year) {
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
      prisma.expense.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (p - 1) * l,
        take: l,
      }),
      prisma.expense.count({ where }),
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
    const expense = await prisma.expense.create({
      data: {
        amount: parseFloat(amount),
        category,
        description,
        type,
        date: new Date(date),
        userId: req.user.id,
        creatorId: req.user.id,
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
      
      const category = await prisma.category.upsert({
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
          type: type as string
        },
        create: {
          name,
          icon,
          color,
          excludeFromBudget: Boolean(excludeFromBudget),
          type: type as string,
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
    const { month, year, allUnpaid } = req.query;
    const userId = req.user.id;
    const where: any = { userId };
    
    if (allUnpaid === 'true') {
      const m = month ? parseInt(month as string) : new Date().getMonth() + 1;
      const y = year ? parseInt(year as string) : new Date().getFullYear();
      where.OR = [
        { isPaid: false },
        { 
          AND: [
            { isPaid: true },
            { month: m },
            { year: y }
          ]
        }
      ];
    } else if (month && year) {
      where.month = parseInt(month as string);
      where.year = parseInt(year as string);
    }
    
    const bills = await prisma.recurringBill.findMany({
      where,
      orderBy: [
        { dueDate: 'asc' },
        { year: 'desc' },
        { month: 'desc' }
      ],
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
    const { month, year, period = 'month' } = req.query;
    const userId = req.user.id;

    let startDate: Date;
    let endDate: Date;

    const now = new Date();
    const currYear = year ? parseInt(year as string) : now.getFullYear();
    const currMonth = month ? parseInt(month as string) : now.getMonth() + 1;

    if (period === 'week') {
      const today = new Date();
      startDate = new Date(today.setDate(today.getDate() - today.getDay()));
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'quarter') {
      const quarter = Math.floor((currMonth - 1) / 3);
      startDate = new Date(currYear, quarter * 3, 1);
      endDate = new Date(currYear, (quarter + 1) * 3, 0, 23, 59, 59, 999);
    } else if (period === 'year') {
      startDate = new Date(currYear, 0, 1);
      endDate = new Date(currYear, 11, 31, 23, 59, 59, 999);
    } else {
      // Default to month
      startDate = new Date(currYear, currMonth - 1, 1);
      endDate = new Date(currYear, currMonth, 0, 23, 59, 59, 999);
    }

    const [expenses, categories, budget] = await prisma.$transaction([
      prisma.expense.findMany({
        where: {
          userId,
          date: { gte: startDate, lte: endDate },
        },
      }),
      prisma.category.findMany({
        where: { userId },
      }),
      prisma.budget.findUnique({
        where: {
          userId_month_year: {
            userId,
            month: currMonth,
            year: currYear,
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

  // Group Routes
  app.get('/api/groups', isAuthenticated, async (req: any, res) => {
    const groups = await prisma.group.findMany({
      where: {
        members: {
          some: { userId: req.user.id }
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true }
            }
          }
        },
        owner: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(groups);
  });

  app.get('/api/groups/:id/activity', isAuthenticated, async (req: any, res) => {
    const groupId = req.params.id;
    const userId = req.user.id;
    const { page = '1', limit = '20' } = req.query;
    const p = parseInt(page as string);
    const l = parseInt(limit as string);

    if (!(await isGroupMember(userId, groupId))) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    const [expenses, total] = await prisma.$transaction([
      prisma.expense.findMany({
        where: { groupId },
        orderBy: [
          { date: 'desc' },
          { createdAt: 'desc' }
        ],
        skip: (p - 1) * l,
        take: l,
        include: {
          user: {
            select: { id: true, name: true, image: true }
          },
          creator: {
            select: { id: true, name: true, image: true }
          }
        }
      }),
      prisma.expense.count({ where: { groupId } })
    ]);

    res.json({
      activities: expenses,
      pagination: {
        total,
        pages: Math.ceil(total / l),
        currentPage: p,
        limit: l
      }
    });
  });

  app.delete('/api/groups/:id/split/:expenseId', isAuthenticated, async (req: any, res) => {
    const groupId = req.params.id;
    const expenseId = req.params.expenseId;
    const userId = req.user.id;

    const expense = await prisma.expense.findUnique({
      where: { id: expenseId }
    });

    if (!expense || expense.groupId !== groupId) {
      return res.status(404).json({ error: 'Split not found' });
    }

    // Only the creator (the one who paid/logged it) can delete the whole split
    const isAuthorized = expense.creatorId ? expense.creatorId === userId : expense.userId === userId;
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Only the creator can delete this split' });
    }

    // Delete all related splits (same description and date in this group)
    await prisma.expense.deleteMany({
      where: {
        groupId,
        description: expense.description,
        date: expense.date
      }
    });

    res.json({ success: true });
  });

  app.post('/api/groups', isAuthenticated, async (req: any, res) => {
    const { name, description } = req.body;
    const group = await prisma.group.create({
      data: {
        name,
        description,
        ownerId: req.user.id,
        members: {
          create: { userId: req.user.id }
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true }
            }
          }
        }
      }
    });
    res.json(group);
  });

  app.get('/api/users/search', isAuthenticated, async (req: any, res) => {
    const { email } = req.query;
    if (!email || (email as string).length < 3) return res.json([]);
    
    const users = await prisma.user.findMany({
      where: {
        email: { contains: email as string, mode: 'insensitive' },
        NOT: { id: req.user.id }
      },
      select: { id: true, name: true, email: true, image: true },
      take: 5
    });
    res.json(users);
  });

  app.post('/api/groups/:id/members', isAuthenticated, async (req: any, res) => {
    const { userId } = req.body;
    const groupId = req.params.id;
    
    // Check if requester is owner
    const group = await prisma.group.findUnique({
      where: { id: groupId }
    });

    if (!group || group.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Only group owner can add members' });
    }

    try {
      const member = await prisma.groupMember.create({
        data: { groupId, userId },
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true }
          }
        }
      });
      res.json(member);
    } catch (error) {
      res.status(400).json({ error: 'User is already a member' });
    }
  });

  app.post('/api/groups/:id/split', isAuthenticated, async (req: any, res) => {
    const { amount, description, category, date, memberIds } = req.body;
    const groupId = req.params.id;
    const userId = req.user.id;

    if (!(await isGroupMember(userId, groupId))) {
      return res.status(403).json({ error: 'Only members can split bills' });
    }
    
    // Ensure all target users are actually members
    const memberships = await prisma.groupMember.findMany({
      where: {
        groupId,
        userId: { in: memberIds }
      }
    });

    if (memberships.length !== memberIds.length) {
      return res.status(400).json({ error: 'Some users are not members of this group' });
    }

    const totalAmount = parseFloat(amount);
    const splitCount = memberIds.length;
    const individualAmount = totalAmount / splitCount;

    try {
      const expenses = await prisma.$transaction(
        memberIds.map((memberId: string) => 
          prisma.expense.create({
            data: {
              amount: individualAmount,
              description: `${description} (Split)`,
              category,
              date: new Date(date),
              userId: memberId,
              groupId,
              creatorId: userId,
              type: 'expense'
            }
          })
        )
      );
      res.json(expenses);
    } catch (error) {
      console.error('Split error:', error);
      res.status(500).json({ error: 'Failed to create split expenses' });
    }
  });

  app.delete('/api/groups/:id', isAuthenticated, async (req: any, res) => {
    const groupId = req.params.id;
    const group = await prisma.group.findUnique({ where: { id: groupId } });

    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (group.ownerId !== req.user.id) return res.status(403).json({ error: 'Only owner can delete group' });

    await prisma.group.delete({ where: { id: groupId } });
    res.json({ success: true });
  });

  app.delete('/api/groups/:id/members/:userId', isAuthenticated, async (req: any, res) => {
    const groupId = req.params.id;
    const targetUserId = req.params.userId;
    
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true }
    });

    if (!group) return res.status(404).json({ error: 'Group not found' });

    const isOwner = group.ownerId === req.user.id;
    const isSelf = targetUserId === req.user.id;

    if (!isOwner && !isSelf) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (isSelf && isOwner && group.members.length > 1) {
       return res.status(400).json({ error: 'Owner cannot leave group if other members exist. Transfer ownership or delete group.' });
    }

    await prisma.groupMember.delete({
      where: {
        groupId_userId: {
          groupId,
          userId: targetUserId
        }
      }
    });

    res.json({ success: true });
  });
}
