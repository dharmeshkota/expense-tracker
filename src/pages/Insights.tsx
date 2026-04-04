import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Calendar, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function Insights() {
  const [timeframe, setTimeframe] = useState('current');
  const [data, setData] = useState<any>(null);

  const fetchData = async () => {
    const now = new Date();
    let m = now.getMonth() + 1;
    let y = now.getFullYear();

    if (timeframe === 'last') {
      const lastMonth = subMonths(now, 1);
      m = lastMonth.getMonth() + 1;
      y = lastMonth.getFullYear();
    }

    const res = await fetch(`/api/stats?month=${m}&year=${y}`);
    if (res.ok) {
      const stats = await res.json();
      setData(stats);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeframe]);

  const generatePDF = () => {
    if (!data) return;

    const doc = new jsPDF();
    const now = new Date();
    const monthName = format(new Date(now.getFullYear(), (timeframe === 'current' ? now.getMonth() : now.getMonth() - 1), 1), 'MMMM yyyy');

    // Header
    doc.setFontSize(22);
    doc.setTextColor(0, 122, 255);
    doc.text('ExpensePro Report', 20, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Generated on: ${format(now, 'PPP')}`, 20, 30);
    doc.text(`Period: ${monthName}`, 20, 37);

    // Summary Section
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text('Financial Summary', 20, 50);
    
    autoTable(doc, {
      startY: 55,
      head: [['Metric', 'Amount']],
      body: [
        ['Total Salary', `$${data.totalSalary.toLocaleString()}`],
        ['Total Spent', `$${data.totalSpent.toLocaleString()}`],
        ['Remaining', `$${data.remaining.toLocaleString()}`],
        ['Savings Rate', `${Math.round((data.remaining / data.totalSalary) * 100)}%`],
      ],
      theme: 'striped',
      headStyles: { fillColor: [0, 122, 255] }
    });

    // Category Breakdown
    doc.text('Category Breakdown', 20, (doc as any).lastAutoTable.finalY + 15);
    
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Category', 'Amount', 'Percentage']],
      body: data.categoryBreakdown.map((c: any) => [
        c.name,
        `$${c.value.toLocaleString()}`,
        `${Math.round((c.value / data.totalSpent) * 100)}%`
      ]),
      theme: 'grid',
      headStyles: { fillColor: [100, 100, 100] }
    });

    // Recent Transactions
    doc.text('Recent Transactions', 20, (doc as any).lastAutoTable.finalY + 15);
    
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Date', 'Category', 'Description', 'Amount']],
      body: data.recentExpenses.map((e: any) => [
        format(new Date(e.date), 'MMM dd'),
        e.category,
        e.description || '-',
        `$${e.amount.toLocaleString()}`
      ]),
      theme: 'plain'
    });

    doc.save(`ExpensePro_Report_${monthName.replace(' ', '_')}.pdf`);
    toast.success('Report downloaded successfully!');
  };

  if (!data) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Insights</h1>
          <p className="text-muted-foreground">Analyze your spending patterns.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current Month</SelectItem>
              <SelectItem value="last">Last Month</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={generatePDF} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Download Report
          </Button>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.categoryBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="value" fill="#0088FE" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-between items-center p-4 rounded-lg bg-muted/30">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Total Salary</p>
                <p className="text-2xl font-bold">${data.totalSalary.toLocaleString()}</p>
              </div>
              <Wallet className="h-8 w-8 text-primary opacity-20" />
            </div>
            <div className="flex justify-between items-center p-4 rounded-lg bg-muted/30">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Total Spent</p>
                <p className="text-2xl font-bold text-destructive">${data.totalSpent.toLocaleString()}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-destructive opacity-20" />
            </div>
            <div className="flex justify-between items-center p-4 rounded-lg bg-primary/10">
              <div className="space-y-1">
                <p className="text-sm font-medium text-primary">Remaining</p>
                <p className="text-2xl font-bold text-primary">${data.remaining.toLocaleString()}</p>
              </div>
              <CreditCard className="h-8 w-8 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { Wallet, TrendingDown, CreditCard } from 'lucide-react';
