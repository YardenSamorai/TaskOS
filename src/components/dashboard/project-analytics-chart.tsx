"use client";

import { useMemo } from "react";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";

interface ProjectAnalyticsChartProps {
  tasks: any[];
}

export const ProjectAnalyticsChart = ({ tasks }: ProjectAnalyticsChartProps) => {
  // Generate data for the last 12 months
  const chartData = useMemo(() => {
    const data = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      // Count tasks created in this month
      const monthTasks = tasks.filter((task: any) => {
        if (!task.createdAt) return false;
        const createdDate = new Date(task.createdAt);
        return isWithinInterval(createdDate, { start: monthStart, end: monthEnd });
      });
      
      data.push({
        month: format(monthDate, "MMM"),
        year: format(monthDate, "yyyy"),
        count: monthTasks.length,
      });
    }
    
    return data;
  }, [tasks]);

  // Calculate chart dimensions
  const maxCount = Math.max(...chartData.map(d => d.count), 5);
  const chartHeight = 200;
  const chartWidth = 100; // percentage

  // Generate SVG path for the area chart
  const generatePath = () => {
    if (chartData.length === 0) return "";
    
    const points = chartData.map((d, i) => {
      const x = (i / (chartData.length - 1)) * 100;
      const y = chartHeight - (d.count / maxCount) * chartHeight;
      return { x, y };
    });

    // Create smooth curve
    let path = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      path += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    
    return path;
  };

  const generateAreaPath = () => {
    const linePath = generatePath();
    if (!linePath) return "";
    
    return `${linePath} L 100 ${chartHeight} L 0 ${chartHeight} Z`;
  };

  // Find the current month's data for the indicator
  const currentMonthData = chartData[chartData.length - 1];
  const currentMonthX = 100;
  const currentMonthY = chartHeight - (currentMonthData?.count || 0) / maxCount * chartHeight;

  // Calculate increase from previous period
  const recentCount = chartData.slice(-3).reduce((sum, d) => sum + d.count, 0);
  const previousCount = chartData.slice(-6, -3).reduce((sum, d) => sum + d.count, 0);
  const increase = recentCount - previousCount;

  return (
    <div className="relative">
      {/* Chart */}
      <div className="relative h-[220px] w-full">
        <svg
          viewBox={`0 0 100 ${chartHeight}`}
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          {/* Gradient definition */}
          <defs>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgb(59, 130, 246)" />
              <stop offset="100%" stopColor="rgb(139, 92, 246)" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 1, 2, 3, 4].map((i) => (
            <line
              key={i}
              x1="0"
              y1={(i / 4) * chartHeight}
              x2="100"
              y2={(i / 4) * chartHeight}
              stroke="currentColor"
              strokeOpacity="0.1"
              strokeWidth="0.5"
            />
          ))}

          {/* Area fill */}
          <path
            d={generateAreaPath()}
            fill="url(#areaGradient)"
          />

          {/* Line */}
          <path
            d={generatePath()}
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

          {/* Current point indicator */}
          <circle
            cx={currentMonthX - 5}
            cy={currentMonthY}
            r="4"
            fill="rgb(59, 130, 246)"
            stroke="white"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Increase indicator */}
        <div 
          className="absolute bg-slate-900 text-white px-3 py-1.5 rounded-lg shadow-lg text-sm font-medium"
          style={{
            right: "15%",
            top: "20%",
          }}
        >
          <span className="text-emerald-400">+{Math.max(increase, 1)}</span>
          <span className="text-slate-400 ms-1 text-xs">Tasks</span>
        </div>

        {/* Vertical indicator line */}
        <div 
          className="absolute w-0.5 bg-gradient-to-b from-blue-500 to-blue-500/0 rounded-full"
          style={{
            right: "5%",
            top: `${(currentMonthY / chartHeight) * 100}%`,
            height: `${100 - (currentMonthY / chartHeight) * 100}%`,
          }}
        />
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between mt-2 px-2">
        {chartData.filter((_, i) => i % 3 === 0 || i === chartData.length - 1).map((d, i) => (
          <span key={i} className="text-xs text-muted-foreground">
            {d.year !== chartData[0].year && i === 0 ? d.year : d.month}
          </span>
        ))}
      </div>

      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 h-[220px] flex flex-col justify-between text-xs text-muted-foreground py-2">
        {[maxCount, Math.round(maxCount * 0.75), Math.round(maxCount * 0.5), Math.round(maxCount * 0.25), 0].map((val, i) => (
          <span key={i}>{val}</span>
        ))}
      </div>
    </div>
  );
};
