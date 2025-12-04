import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

interface AdherenceChartProps {
  weeklyData: number[];
  overallPercentage: number;
  trend: number;
}

export default function AdherenceChart({ 
  weeklyData, 
  overallPercentage, 
  trend 
}: AdherenceChartProps) {
  const days = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']; // Domingo a Sábado
  
  const getBarColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-green-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getBarBgColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-green-100';
    if (percentage >= 75) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-slate-800">
          Aderência Semanal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-slate-800">
            {overallPercentage}%
          </span>
          <span className={`text-sm px-2 py-1 rounded-full flex items-center gap-1 ${
            trend >= 0 ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'
          }`}>
            <TrendingUp className="w-3 h-3" />
            {trend >= 0 ? '+' : ''}{trend}% esta semana
          </span>
        </div>
        
        <div className="grid grid-cols-7 gap-2">
          {weeklyData.map((percentage, index) => (
            <div key={index} className="text-center">
              <div className="text-xs text-slate-500 mb-1">{days[index]}</div>
              <div className="h-16 rounded-full flex items-end justify-center relative">
                <div 
                  className={`w-3 rounded-full transition-all ${getBarColor(percentage)}`}
                  style={{ height: `${Math.max(percentage, 5)}%` }}
                />
              </div>
              <div className="text-xs text-slate-600 mt-1">{percentage}%</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
