"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useUser } from "@/contexts/user-context"
import { useMemo } from "react"
import { Trophy } from "lucide-react"

type ProductRank = {
  name: string
  count: number
}

export function TopProductsCard() {
  const { orders } = useUser()

  const topProducts = useMemo(() => {
    const productCounts: { [key: string]: number } = {}

    orders
      .filter(order => order.status !== "Cancelado")
      .forEach(order => {
        order.items.forEach(item => {
          // Normalize product names (e.g., handling "Meio a Meio")
          const productName = item.productName.startsWith("½") 
            ? `Pizza Meio a Meio` 
            : item.productName;
            
          productCounts[productName] = (productCounts[productName] || 0) + item.quantity
        })
      })

    return Object.entries(productCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [orders])

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Trophy className="h-6 w-6 text-primary" />
          <div className="flex flex-col">
            <CardTitle>Produtos Mais Vendidos</CardTitle>
            <CardDescription>O ranking dos 5 produtos mais populares do dia.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {topProducts.length > 0 ? (
          <ul className="space-y-4">
            {topProducts.map((product, index) => (
              <li key={product.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-muted-foreground w-6 text-center">{index + 1}</span>
                  <span className="font-medium">{product.name}</span>
                </div>
                <span className="font-bold text-lg">{product.count}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-muted-foreground py-4">Ainda não há dados de vendas hoje.</p>
        )}
      </CardContent>
    </Card>
  )
}
