import React, { useState, useEffect, useMemo } from 'react';
import {
  ClipboardCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Wrench,
  Download,
  Search,
  Filter,
  Calendar,
  UserCheck,
  RotateCcw,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Input,
  Tabs,
  Modal,
  LoadingState,
  EmptyState,
} from '../components/ui';
import { InspectionHistoryRecord, FaultHistoryRecord } from '../types/cmms.types';
import { inspectionsApiService } from '../services/inspections.service';
import { exportToCsv, exportToJson } from '../utils/export.utils';
import { CriticalityBadge } from '../components/ui/StatusBadge';

export const InspectionsAndFaultsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'inspections' | 'faults'>('inspections');
  const [inspections, setInspections] = useState<InspectionHistoryRecord[]>([]);
  const [faults, setFaults] = useState<FaultHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResult, setSelectedResult] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');

  // Selected Inspection Modal
  const [inspectedRecord, setInspectedRecord] = useState<InspectionHistoryRecord | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [inspData, faultData] = await Promise.all([
        inspectionsApiService.listInspections(),
        inspectionsApiService.listFaults(),
      ]);
      setInspections(inspData);
      setFaults(faultData);
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateWoFromFault = async (faultId: string) => {
    try {
      const res = await inspectionsApiService.createWorkOrderFromFault(faultId);
      setActionSuccessMessage(res.message);
      await loadData();
    } catch (err: any) {
      alert(`Failed to create work order from fault: ${err?.message || 'Unknown error'}`);
    }
  };

  const filteredInspections = useMemo(() => {
    return inspections.filter((i) => {
      if (selectedResult !== 'ALL' && i.overallResult !== selectedResult) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matches =
          i.inspectionNumber.toLowerCase().includes(q) ||
          i.assetCode.toLowerCase().includes(q) ||
          i.assetName.toLowerCase().includes(q) ||
          i.inspectorName.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [inspections, selectedResult, searchTerm]);

  const filteredFaults = useMemo(() => {
    return faults.filter((f) => {
      if (selectedSeverity !== 'ALL' && f.severity !== selectedSeverity) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matches =
          f.faultCode.toLowerCase().includes(q) ||
          f.assetCode.toLowerCase().includes(q) ||
          f.symptoms.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [faults, selectedSeverity, searchTerm]);

  const handleExportInspections = () => {
    exportToCsv(
      filteredInspections,
      [
        { header: 'Inspection #', accessor: 'inspectionNumber' },
        { header: 'Asset Code', accessor: 'assetCode' },
        { header: 'Asset Name', accessor: 'assetName' },
        { header: 'Inspector', accessor: 'inspectorName' },
        { header: 'Result', accessor: 'overallResult' },
        { header: 'Score (%)', accessor: 'scorePercentage' },
        { header: 'Anomalies', accessor: 'abnormalCount' },
        { header: 'Date', accessor: 'inspectedAt' },
        { header: 'Notes', accessor: (i) => i.notes || '' },
      ],
      'lumina_inspection_history'
    );
  };

  const handleExportFaults = () => {
    exportToCsv(
      filteredFaults,
      [
        { header: 'Fault Code', accessor: 'faultCode' },
        { header: 'Asset Code', accessor: 'assetCode' },
        { header: 'Asset Name', accessor: 'assetName' },
        { header: 'Severity', accessor: 'severity' },
        { header: 'Reported By', accessor: 'reportedByName' },
        { header: 'Reported At', accessor: 'reportedAt' },
        { header: 'Symptoms', accessor: 'symptoms' },
        { header: 'Linked Work Order', accessor: (f) => f.linkedWorkOrderNumber || 'None' },
        { header: 'Status', accessor: 'resolutionStatus' },
      ],
      'lumina_fault_history'
    );
  };

  const getResultBadge = (result: string) => {
    switch (result) {
      case 'pass':
        return <Badge tone="emerald">Passed (100%)</Badge>;
      case 'conditional':
        return <Badge tone="amber">Conditional Pass</Badge>;
      case 'fail':
        return <Badge tone="rose" pulseDot>Action Required</Badge>;
      default:
        return <Badge tone="slate">N/A</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gold-400">
            <ClipboardCheck className="w-4 h-4" />
            <span>Facility Quality Assurance &amp; Field Anomaly Tracking</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight mt-1">
            Inspection History &amp; Fault Logs
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Audit logs of shift checklists, physical equipment inspections, and operator abnormal observations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={activeTab === 'inspections' ? handleExportInspections : handleExportFaults}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export {activeTab === 'inspections' ? 'Inspections' : 'Faults'} (CSV)
          </Button>
        </div>
      </div>

      {actionSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-between text-emerald-300 text-xs sm:text-sm font-mono animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
          <button
            onClick={() => setActionSuccessMessage(null)}
            className="text-xs text-emerald-400/80 hover:text-emerald-200"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs */}
      <Tabs
        tabs={[
          {
            id: 'inspections',
            label: 'Inspection Records History',
            icon: <ClipboardCheck className="w-4 h-4" />,
            badge: `${filteredInspections.length} Logs`,
          },
          {
            id: 'faults',
            label: 'Operator Fault & Observation Reports',
            icon: <AlertTriangle className="w-4 h-4" />,
            badge: `${filteredFaults.length} Faults`,
          },
        ]}
        activeTab={activeTab}
        onChange={(t) => setActiveTab(t as any)}
      />

      {/* TAB 1: INSPECTIONS */}
      {activeTab === 'inspections' && (
        <Card variant="default">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-base sm:text-lg">
                Equipment Checklist Inspections
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="w-48">
                  <Input
                    placeholder="Search inspection or asset..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    leadingIcon={<Search className="w-3.5 h-3.5" />}
                    className="min-h-[38px] text-xs py-1.5"
                  />
                </div>
                <select
                  value={selectedResult}
                  onChange={(e) => setSelectedResult(e.target.value)}
                  className="min-h-[38px] text-xs bg-midnight-950 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-200"
                >
                  <option value="ALL">All Results</option>
                  <option value="pass">Passed</option>
                  <option value="conditional">Conditional</option>
                  <option value="fail">Action Required</option>
                </select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8">
                <LoadingState title="Loading Inspection History..." />
              </div>
            ) : filteredInspections.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title="No Inspection Records Found"
                  description="Adjust filter criteria or submit new shift inspections to view entries."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-midnight-950 text-slate-400 font-mono uppercase text-[11px] border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">Inspection #</th>
                      <th className="py-3.5 px-4">Asset</th>
                      <th className="py-3.5 px-4">Checklist Name</th>
                      <th className="py-3.5 px-4">Inspector</th>
                      <th className="py-3.5 px-4">Result</th>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4 text-right">Responses</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {filteredInspections.map((i) => (
                      <tr key={i.id} className="hover:bg-midnight-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-semibold text-indigo-300">
                          {i.inspectionNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-100">{i.assetCode}</div>
                          <div className="text-xs text-slate-400">{i.assetName}</div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">{i.checklistName}</td>
                        <td className="py-3.5 px-4 text-slate-300">{i.inspectorName}</td>
                        <td className="py-3.5 px-4">{getResultBadge(i.overallResult)}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-400">
                          {new Date(i.inspectedAt).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setInspectedRecord(i)}
                            leftIcon={<Eye className="w-3.5 h-3.5" />}
                          >
                            View Checklist ({i.responses?.length || 0})
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 2: OPERATOR FAULT REPORTS */}
      {activeTab === 'faults' && (
        <Card variant="default">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-base sm:text-lg">
                Equipment Fault &amp; Anomaly Observations
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="w-48">
                  <Input
                    placeholder="Search fault or symptom..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    leadingIcon={<Search className="w-3.5 h-3.5" />}
                    className="min-h-[38px] text-xs py-1.5"
                  />
                </div>
                <select
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value)}
                  className="min-h-[38px] text-xs bg-midnight-950 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-200"
                >
                  <option value="ALL">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8">
                <LoadingState title="Loading Fault History..." />
              </div>
            ) : filteredFaults.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title="No Fault Observations Recorded"
                  description="Facility operating within standard baseline tolerances."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-midnight-950 text-slate-400 font-mono uppercase text-[11px] border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">Fault Code</th>
                      <th className="py-3.5 px-4">Asset</th>
                      <th className="py-3.5 px-4">Severity</th>
                      <th className="py-3.5 px-4">Observed Symptoms</th>
                      <th className="py-3.5 px-4">Reported By</th>
                      <th className="py-3.5 px-4">Status &amp; Linked WO</th>
                      <th className="py-3.5 px-4 text-right">Corrective Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {filteredFaults.map((f) => (
                      <tr key={f.id} className="hover:bg-midnight-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-semibold text-gold-300">
                          {f.faultCode}
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          <div className="font-semibold text-slate-100">{f.assetCode}</div>
                          <div className="text-xs text-slate-400">{f.assetName}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <CriticalityBadge level={f.severity as any} />
                        </td>
                        <td className="py-3.5 px-4 text-slate-200 max-w-xs line-clamp-2">
                          {f.symptoms}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">{f.reportedByName}</td>
                        <td className="py-3.5 px-4 font-mono">
                          {f.linkedWorkOrderNumber ? (
                            <span className="text-indigo-400 font-semibold">
                              {f.linkedWorkOrderNumber}
                            </span>
                          ) : (
                            <span className="text-slate-500">No WO linked</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {!f.linkedWorkOrderId ? (
                            <Button
                              variant="gold"
                              size="sm"
                              onClick={() => handleCreateWoFromFault(f.id)}
                              leftIcon={<Wrench className="w-3.5 h-3.5" />}
                            >
                              Dispatch WO
                            </Button>
                          ) : (
                            <Badge tone="emerald">WO Dispatched</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Inspection Responses Modal */}
      {inspectedRecord && (
        <Modal
          isOpen={!!inspectedRecord}
          onClose={() => setInspectedRecord(null)}
          title={`Inspection Checklist: ${inspectedRecord.inspectionNumber}`}
          description={`${inspectedRecord.assetCode} — ${inspectedRecord.assetName} • Inspected by ${inspectedRecord.inspectorName} on ${new Date(inspectedRecord.inspectedAt).toLocaleString()}`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-midnight-950 border border-slate-800 font-mono text-xs">
              <div>
                <span className="text-slate-400">Overall Result: </span>
                <span className="font-semibold text-slate-100 uppercase">
                  {inspectedRecord.overallResult}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Score: </span>
                <span className="font-bold text-gold-300">
                  {inspectedRecord.scorePercentage}%
                </span>
              </div>
            </div>

            {inspectedRecord.notes && (
              <div className="p-3.5 rounded-xl bg-midnight-950 border border-slate-800 text-xs text-slate-300 font-mono">
                <span className="text-slate-500 block">Inspector Notes:</span>
                <p className="mt-1">{inspectedRecord.notes}</p>
              </div>
            )}

            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-300">
                Checklist Item Responses:
              </span>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {inspectedRecord.responses?.map((r, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                      r.isAnomaly
                        ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                        : 'bg-midnight-950 border-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <span className="font-medium text-slate-100">{r.question}</span>
                      {r.itemCode && (
                        <span className="text-[10px] font-mono text-slate-400 block">
                          Code: {r.itemCode}
                        </span>
                      )}
                    </div>
                    <span className="font-mono font-semibold shrink-0">
                      {r.answer}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default InspectionsAndFaultsPage;
