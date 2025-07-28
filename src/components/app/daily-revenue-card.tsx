"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useEffect, useState, useMemo } from "react"
import { DollarSign, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

export function DailyRevenueCard() {
  const [revenueData, setRevenueData] = useState<{ todayRevenue: number; yesterdayRevenue: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRevenueData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/orders/revenue-stats');
        if (!response.ok) {
          throw new Error('Failed to fetch revenue data');
        }
        const data = await response.json();
        setRevenueData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRevenueData();
  }, []);

  const { todayRevenue, percentageChange } = useMemo(() => {
    if (!revenueData) {
      return { todayRevenue: 0, percentageChange: null };
    }

    const { todayRevenue, yesterdayRevenue } = revenueData;
    
    let percentageChange: number | null = null;
    if (yesterdayRevenue > 0) {
      percentageChange = ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100;
    } else if (todayRevenue > 0) {
      percentageChange = 100; // If yesterday was 0 and today is > 0, it's a 100% increase
    }

    return { todayRevenue, percentageChange };
  }, [revenueData]);

  const TrendIcon = percentageChange === null || percentageChange === 0 ? Minus : percentageChange > 0 ? TrendingUp : TrendingDown;
  const trendColor = percentageChange === null || percentageChange === 0 ? "text-muted-foreground" : percentageChange > 0 ? "text-emerald-500" : "text-red-500";

  if (isLoading) {
    return (
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Faturamento do Dia</CardTitle>
          <DollarSign className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2 mt-2" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="text-sm font-medium text-red-500">Erro</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-red-400">{error}</p>
            </CardContent>
        </Card>
    )
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Faturamento do Dia</CardTitle>
        <DollarSign className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {todayRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </div>
        <div className={cn("text-xs flex items-center gap-1", trendColor)}>
            <TrendIcon className="h-4 w-4" />
            {percentageChange !== null ? (
                <span>{percentageChange.toFixed(1)}% em relação a ontem</span>
            ) : (
                <span>Sem dados de ontem para comparar</span>
            )}
        </div>
      </CardContent>
    </Card>
  )
}
