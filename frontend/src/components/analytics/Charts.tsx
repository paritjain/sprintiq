import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts';
import { TimeSeriesPoint, MovementEvent } from '../../types';

interface SpeedChartProps {
  data: TimeSeriesPoint[];
  events?: MovementEvent[];
}

export const SpeedTimeChart: React.FC<SpeedChartProps> = ({ data = [], events = [] }) => {
  const validData = data.filter((d) => d.speed_mps !== null && d.speed_mps !== undefined);

  if (validData.length < 2) {
    return (
      <div className="h-64 flex flex-col items-center justify-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-500 text-sm p-4 text-center">
        <span>No calibrated velocity data points available for this session.</span>
        <span className="text-xs text-slate-600 mt-1">
          Apply 2D spatial calibration (known reference scale) during upload to unlock time-resolved speed curves.
        </span>
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={validData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="speedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10E76E" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#10E76E" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
          <XAxis
            dataKey="timestamp_s"
            stroke="#64748B"
            fontSize={11}
            tickFormatter={(val) => `${val.toFixed(1)}s`}
          />
          <YAxis
            stroke="#64748B"
            fontSize={11}
            tickFormatter={(val) => `${val} m/s`}
            domain={['auto', 'auto']}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0F172A',
              borderColor: '#334155',
              borderRadius: '12px',
              color: '#F8FAFC',
              fontSize: '12px',
            }}
            formatter={(val: any) => [`${val} m/s`, 'Speed']}
            labelFormatter={(label) => `Time: ${Number(label).toFixed(2)}s`}
          />
          <Area
            type="monotone"
            dataKey="speed_mps"
            stroke="#10E76E"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#speedGrad)"
            name="Forward Speed"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

interface TrajectoryChartProps {
  data: TimeSeriesPoint[];
  eventType: 'sprint' | 'jump';
  events?: MovementEvent[];
}

export const TrajectoryChart: React.FC<TrajectoryChartProps> = ({ data = [], eventType, events = [] }) => {
  if (!data || data.length < 2) {
    return (
      <div className="h-64 flex items-center justify-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-500 text-sm">
        Insufficient landmark frames to render continuous trajectory.
      </div>
    );
  }

  // Format data for chart
  const chartData = data.map((d) => ({
    timestamp_s: d.timestamp_s,
    // Invert normalized Y for intuitive elevation (1 - norm_y means higher values are physically higher up)
    hip_elevation: Number(((1.0 - d.hip_y_norm) * 100).toFixed(1)),
    left_ankle_elevation: d.left_ankle_y_norm ? Number(((1.0 - d.left_ankle_y_norm) * 100).toFixed(1)) : null,
    right_ankle_elevation: d.right_ankle_y_norm ? Number(((1.0 - d.right_ankle_y_norm) * 100).toFixed(1)) : null,
    confidence: Number((d.confidence * 100).toFixed(0)),
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
          <XAxis
            dataKey="timestamp_s"
            stroke="#64748B"
            fontSize={11}
            tickFormatter={(val) => `${val.toFixed(1)}s`}
          />
          <YAxis
            stroke="#64748B"
            fontSize={11}
            domain={['auto', 'auto']}
            tickFormatter={(val) => `${val}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0F172A',
              borderColor: '#334155',
              borderRadius: '12px',
              color: '#F8FAFC',
              fontSize: '12px',
            }}
            labelFormatter={(label) => `Time: ${Number(label).toFixed(2)}s`}
          />
          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />

          {/* Hip Midpoint Elevation (Body Center Proxy) */}
          <Line
            type="monotone"
            dataKey="hip_elevation"
            stroke="#06B6D4"
            strokeWidth={2.5}
            dot={false}
            name="Hip Proxy Elevation"
          />

          {eventType === 'sprint' && (
            <>
              <Line
                type="monotone"
                dataKey="left_ankle_elevation"
                stroke="#FACC15"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="4 2"
                name="Left Ankle Height"
              />
              <Line
                type="monotone"
                dataKey="right_ankle_elevation"
                stroke="#10E76E"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="4 2"
                name="Right Ankle Height"
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
