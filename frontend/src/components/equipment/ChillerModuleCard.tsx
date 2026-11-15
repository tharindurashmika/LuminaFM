import React, { useState } from 'react';
import { Card, Badge, Button } from '../ui';
import {
  Snowflake,
  ShieldCheck,
  AlertTriangle,
  Activity,
  Zap,
  CheckCircle2,
  Layers,
  Wrench,
  Thermometer,
} from 'lucide-react';

export const ChillerModuleCard: React.FC = () => {
  // Demonstration simulated telemetry state for water-cooled chiller
  const [telemetry] = useState({
    chwSupplyTemp: 6.8,
    chwReturnTemp: 12.4,
    cwSupplyTemp: 29.5,
    cwReturnTemp: 35.8,
    evapApproach: 1.1,
    condApproach: 2.7, // Warning threshold breached (> 2.5°C) -> Scaling indicator!
    oilPressureDiff: 1.7,
    kwPerTon: 0.61,
    cop: 5.76,
  });

  const [decisionCheckResult, setDecisionCheckResult] = useState<string | null>(null);

  // Test strict isolation: attempting to link Boiler ANP to Chiller
  const handleTestBoilerAnpCrossApplication = () => {
    setDecisionCheckResult(
      'BLOCKED BY FRAMEWORK: Cannot apply Boiler ANP model (ANP-KINGSBURY-FIRETUBE-v1.0.0) to Water-Cooled Chiller. Chiller requires independent peer-reviewed validation (ASHRAE/AHRI). Cross-module reuse prohibited.'
    );
  };

  return (
    <Card className="p-6 bg-midnight-900 border-midnight-700/80 shadow-2xl space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-midnight-700/60">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-indigo-950/80 border border-indigo-800/60 text-indigo-400">
            <Snowflake className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-semibold text-white tracking-wide">
                Extensible Module: Water-Cooled Centrifugal Chiller
              </h3>
              <Badge tone="indigo" size="sm">
                v1.0.0 Plugin
              </Badge>
              <Badge tone="slate" size="sm">
                AHRI 550/590
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Polymorphic Equipment Module Contract Demonstration • Asset Category: <code className="text-indigo-300">chillers</code>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Badge tone="emerald" size="md">
            Operating (850 TR Load)
          </Badge>
          <span className="text-xs text-slate-400 font-mono">CHLR-002</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* COP Efficiency */}
        <div className="p-4 rounded-xl bg-midnight-850 border border-midnight-700/80">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Operating COP</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            {telemetry.cop.toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Target &ge; 5.80 COP</p>
        </div>

        {/* Energy Intensity (kW/TR) */}
        <div className="p-4 rounded-xl bg-midnight-850 border border-midnight-700/80">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Power Intensity</span>
            <Activity className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-indigo-400 font-mono">
            {telemetry.kwPerTon.toFixed(2)}{' '}
            <span className="text-xs text-slate-400">kW/TR</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">AHRI Benchmark &le; 0.60</p>
        </div>

        {/* Evaporator Approach */}
        <div className="p-4 rounded-xl bg-midnight-850 border border-midnight-700/80">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Evap Approach</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {telemetry.evapApproach.toFixed(1)}°C
          </div>
          <p className="text-[11px] text-emerald-400/90 mt-1">Clean Tube (&le; 1.5°C)</p>
        </div>

        {/* Condenser Approach - WARNING */}
        <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/60">
          <div className="flex items-center justify-between text-xs text-amber-300 mb-1">
            <span>Cond Approach</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono">
            {telemetry.condApproach.toFixed(1)}°C
          </div>
          <p className="text-[11px] text-amber-300 font-medium mt-1">Scale Alert (&gt; 2.5°C)</p>
        </div>
      </div>

      {/* Real-time Telemetry & Subsystems Demonstration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Water Temperatures & Oil Circuit */}
        <div className="p-4 rounded-xl bg-midnight-850 border border-midnight-700/80 space-y-3">
          <div className="flex items-center justify-between border-b border-midnight-700/60 pb-2">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center">
              <Thermometer className="w-4 h-4 mr-1.5 text-indigo-400" />
              Thermal Circuit Telemetry
            </span>
            <span className="text-xs text-slate-400 font-mono">R134a Flooded</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-midnight-800/80">
              <span className="text-slate-400">Chilled Water Supply / Return:</span>
              <span className="font-mono text-slate-200">
                {telemetry.chwSupplyTemp}°C / {telemetry.chwReturnTemp}°C (&Delta;T = {(telemetry.chwReturnTemp - telemetry.chwSupplyTemp).toFixed(1)}°C)
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-midnight-800/80">
              <span className="text-slate-400">Condenser Water Supply / Return:</span>
              <span className="font-mono text-slate-200">
                {telemetry.cwSupplyTemp}°C / {telemetry.cwReturnTemp}°C (&Delta;T = {(telemetry.cwReturnTemp - telemetry.cwSupplyTemp).toFixed(1)}°C)
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-midnight-800/80">
              <span className="text-slate-400">Lubrication Oil Differential:</span>
              <span className="font-mono text-emerald-400">{telemetry.oilPressureDiff} bar (Nominal &le; 2.4 bar)</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Compressor Motor Loading:</span>
              <span className="font-mono text-slate-200">76.4% RLA (420 kW input)</span>
            </div>
          </div>
        </div>

        {/* Right: Decoupled Decision Support Engine & Safety Gate */}
        <div className="p-4 rounded-xl bg-midnight-850 border border-midnight-700/80 space-y-3">
          <div className="flex items-center justify-between border-b border-midnight-700/60 pb-2">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center">
              <ShieldCheck className="w-4 h-4 mr-1.5 text-indigo-400" />
              Dedicated Decision Support Model
            </span>
            <Badge tone="indigo" size="sm">
              RCM Engine
            </Badge>
          </div>

          <div className="text-xs space-y-2">
            <div className="p-2.5 rounded-lg bg-midnight-900 border border-midnight-700 text-slate-300">
              <div className="font-semibold text-indigo-300">Model: CHILLER-RCM-ASHRAE-v1.0.0</div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Evaluates tube fouling resistance, refrigerant containment, and oil spectrometry.
                <strong className="text-amber-400 block mt-1">
                  Strict Rule: Boiler ANP models are decoupled and prohibited on Chillers without independent validation.
                </strong>
              </p>
            </div>

            <Button
              variant="secondary"
              size="sm"
              className="w-full text-xs border border-amber-600/50 text-amber-300 hover:bg-amber-950/40"
              onClick={handleTestBoilerAnpCrossApplication}
            >
              Test Cross-Module Rejection (Attempt Boiler ANP Application)
            </Button>

            {decisionCheckResult && (
              <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/70 text-[11px] text-rose-200 font-mono leading-relaxed">
                {decisionCheckResult}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Subsystem DAG & PM Routines Footer */}
      <div className="p-3.5 rounded-xl bg-midnight-850/80 border border-midnight-700/60 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2 text-slate-300">
          <Layers className="w-4 h-4 text-indigo-400" />
          <span>6 Physical Subsystems: Compressor, Evaporator, Condenser, Lubrication, Purge, VFD</span>
        </div>

        <div className="flex items-center space-x-2 text-slate-400">
          <Wrench className="w-4 h-4 text-amber-400" />
          <span>Active PM: Quarterly Condenser Tube Brushing (Due in 14 days)</span>
        </div>
      </div>
    </Card>
  );
};
