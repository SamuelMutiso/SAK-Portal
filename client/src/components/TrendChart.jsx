import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const LEVEL_TICKS = { 1: "BE", 2: "AE", 3: "ME", 4: "EE" };

export default function TrendChart({ points, scale, height = 260 }) {
  if (points.length < 2) {
    return <p className="text-sm text-brand-400">The trend appears after two assessments.</p>;
  }

  const marks = scale === "marks";

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#E1EAF5" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#3D63A0" }} interval={0} angle={-30} textAnchor="end" height={50} />
          <YAxis
            domain={marks ? [0, 100] : [1, 4]}
            ticks={marks ? [0, 25, 50, 75, 100] : [1, 2, 3, 4]}
            tickFormatter={(value) => (marks ? `${value}%` : LEVEL_TICKS[value])}
            tick={{ fontSize: 11, fill: "#3D63A0" }}
            width={40}
          />
          <Tooltip formatter={(value) => (marks ? [`${value}%`, "Mean"] : [value.toFixed(1), "Average level"])} />
          <Line type="monotone" dataKey="value" isAnimationActive={false} stroke="#1E3A6B" strokeWidth={3} dot={{ r: 4, fill: "#DDA22E", stroke: "#1E3A6B" }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
