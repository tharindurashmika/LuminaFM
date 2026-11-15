import React, { useState, useEffect, useMemo } from 'react';
import {
  Wrench,
  ArrowRight,
  History,
  ShieldAlert,
  CheckCircle2,
  Clock,
  PlusCircle,
  Download,
  Search,
  Filter,
  DollarSign,
  Layers,
  ArrowUpDown,
  Kanban,
  Table as TableIcon,
  Eye,
  CheckSquare,
  AlertTriangle,
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
  Select,
  Tabs,
  Modal,
  LoadingState,
  EmptyState,
} from '../components/ui';
import { WorkOrderStatus, PriorityLevel } from '../types/cmms.types';
import { WorkOrderStatusBadge, CriticalityBadge } from '../components/ui/StatusBadge';
import {
  workOrdersApiService,
  WorkOrderDetail,
} from '../services/work-orders.service';
import { exportToCsv, exportToJson } from '../utils/export.utils';
import { useAuth } from '../store/AuthContext';

const VALID_NEXT_STATES: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  draft: ['open', 'cancelled'],
  open: ['approved', 'assigned', 'in_progress', 'cancelled'],
  approved: ['assigned', 'in_progress', 'cancelled'],
  assigned: ['in_progress', 'on_hold', 'cancelled'],
  in_progress: ['on_hold', 'completed', 'cancelled'],
  on_hold: ['in_progress', 'cancelled'],
  completed: ['closed', 'in_progress'],
  closed: [],
  cancelled: [],
};

const KANBAN_COLUMNS: Array<{ status: WorkOrderStatus; label: string; tone: string }> = [
  { status: 'draft', label: 'Draft', tone: 'border-slate-700' },
  { status: 'open', label: 'Open', tone: 'border-indigo-500/40' },
  { status: 'approved', label: 'Approved', tone: 'border-indigo-400/50' },
  { status: 'assigned', label: 'Assigned', tone: 'border-indigo-400/50' },
  { status: 'in_progress', label: 'In Progress', tone: 'border-gold-500/50' },
  { status: 'completed', label: 'Completed', tone: 'border-emerald-500/50' },
];

export const WorkOrdersPage: React.FC = () => {
  const { activeRole } = useAuth();
  const [viewMode, setViewMode] = useState<'board' | 'list'>('list');
  const [workOrders, setWorkOrders] = useState<WorkOrderDetail[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters & Sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'workOrderNumber' | 'priority' | 'status' | 'createdAt'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedWoDetail, setSelectedWoDetail] = useState<WorkOrderDetail | null>(null);

  // New Work Order form fields
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<PriorityLevel>('medium');
  const [newEstimatedHours, setNewEstimatedHours] = useState(2);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Transition reason modal
  const [transitionTarget, setTransitionTarget] = useState<{ id: string; action: any; label: string } | null>(null);
  const [transitionReason, setTransitionReason] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await workOrdersApiService.listWorkOrders();
      setWorkOrders(data as WorkOrderDetail[]);
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSort = (field: 'workOrderNumber' | 'priority' | 'status' | 'createdAt') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedOrders = useMemo(() => {
    let items = workOrders.filter((wo) => {
      if (selectedStatus !== 'ALL' && wo.status !== selectedStatus) return false;
      if (selectedPriority !== 'ALL' && wo.priority !== selectedPriority) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matches =
          wo.workOrderNumber.toLowerCase().includes(q) ||
          wo.title.toLowerCase().includes(q) ||
          wo.asset?.assetCode.toLowerCase().includes(q) ||
          wo.asset?.name.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });

    items.sort((a, b) => {
      let valA: string = '';
      let valB: string = '';
      if (sortField === 'workOrderNumber') {
        valA = a.workOrderNumber;
        valB = b.workOrderNumber;
      } else if (sortField === 'priority') {
        valA = a.priority;
        valB = b.priority;
      } else if (sortField === 'status') {
        valA = a.status;
        valB = b.status;
      } else if (sortField === 'createdAt') {
        valA = a.createdAt;
        valB = b.createdAt;
      }
      const cmp = valA.localeCompare(valB);
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return items;
  }, [workOrders, selectedStatus, selectedPriority, searchTerm, sortField, sortDirection]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setIsSubmitting(true);
    try {
      await workOrdersApiService.createWorkOrder({
        title: newTitle,
        description: newDesc,
        priority: newPriority,
        estimatedHours: newEstimatedHours,
      });
      setIsCreateModalOpen(false);
      setNewTitle('');
      setNewDesc('');
      await loadData();
    } catch (err: any) {
      alert(`Failed to create work order: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmTransition = async () => {
    if (!transitionTarget) return;
    try {
      const updated = await workOrdersApiService.transitionStatus(
        transitionTarget.id,
        transitionTarget.action,
        transitionReason
      );
      setTransitionTarget(null);
      setTransitionReason('');
      if (selectedWoDetail?.id === updated.id) {
        setSelectedWoDetail(updated);
      }
      await loadData();
    } catch (err: any) {
      alert(`Transition error: ${err?.message || 'State change rejected'}`);
    }
  };

  const handleExportCsv = () => {
    exportToCsv(
      filteredAndSortedOrders,
      [
        { header: 'Work Order #', accessor: 'workOrderNumber' },
        { header: 'Title', accessor: 'title' },
        { header: 'Asset Code', accessor: (w) => w.asset?.assetCode || 'N/A' },
        { header: 'Asset Name', accessor: (w) => w.asset?.name || 'N/A' },
        { header: 'Priority', accessor: 'priority' },
        { header: 'Status', accessor: 'status' },
        { header: 'Created Date', accessor: 'createdAt' },
        { header: 'Total Cost', accessor: (w) => w.costs?.totalCost || 0 },
      ],
      'lumina_work_orders'
    );
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gold-400">
            <Wrench className="w-4 h-4" />
            <span>Work Management &amp; Explicit State Machine Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight mt-1">
            Work Order Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Atomic status transitions: draft &rarr; open &rarr; approved &rarr; assigned &rarr; in_progress &rarr; completed &rarr; closed.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCsv}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export (CSV)
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            leftIcon={<PlusCircle className="w-4 h-4" />}
          >
            Create Work Order
          </Button>
        </div>
      </div>

      {/* Filter and View Mode Switcher Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-midnight-900 border border-slate-800">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="w-64">
            <Input
              placeholder="Search WO #, asset, or title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leadingIcon={<Search className="w-3.5 h-3.5" />}
              className="min-h-[38px] text-xs py-1.5"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="min-h-[38px] text-xs bg-midnight-950 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-200"
          >
            <option value="ALL">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="open">Open</option>
            <option value="approved">Approved</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="closed">Closed</option>
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="min-h-[38px] text-xs bg-midnight-950 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-200"
          >
            <option value="ALL">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5 bg-midnight-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              viewMode === 'list'
                ? 'bg-indigo-950 text-gold-300 border border-gold-500/40 shadow-glow-gold/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>Table Register</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('board')}
            className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              viewMode === 'board'
                ? 'bg-indigo-950 text-gold-300 border border-gold-500/40 shadow-glow-gold/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Kanban className="w-3.5 h-3.5" />
            <span>Kanban Board</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: TABULAR REGISTER */}
      {viewMode === 'list' && (
        <Card variant="default">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8">
                <LoadingState title="Loading Work Orders Ledger..." />
              </div>
            ) : filteredAndSortedOrders.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title="No Work Orders Found"
                  description="Adjust filter terms or create a new Work Order to populate the register."
                  actionLabel="Create Work Order"
                  onAction={() => setIsCreateModalOpen(true)}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-midnight-950 text-slate-400 font-mono uppercase text-[11px] border-b border-slate-800">
                    <tr>
                      <th
                        onClick={() => handleSort('workOrderNumber')}
                        className="py-3.5 px-4 cursor-pointer hover:text-white"
                      >
                        <div className="flex items-center gap-1">
                          <span>WO Number</span>
                          <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                        </div>
                      </th>
                      <th className="py-3.5 px-4">Title &amp; Work Scope</th>
                      <th className="py-3.5 px-4">Target Asset</th>
                      <th
                        onClick={() => handleSort('priority')}
                        className="py-3.5 px-4 cursor-pointer hover:text-white"
                      >
                        <div className="flex items-center gap-1">
                          <span>Priority</span>
                          <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('status')}
                        className="py-3.5 px-4 cursor-pointer hover:text-white"
                      >
                        <div className="flex items-center gap-1">
                          <span>Status</span>
                          <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                        </div>
                      </th>
                      <th className="py-3.5 px-4">Assigned To</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {filteredAndSortedOrders.map((wo) => (
                      <tr
                        key={wo.id}
                        onClick={() => setSelectedWoDetail(wo)}
                        className="hover:bg-midnight-800/40 cursor-pointer transition-colors"
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-indigo-300">
                          {wo.workOrderNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-100 max-w-md line-clamp-1">
                            {wo.title}
                          </div>
                          <div className="text-xs text-slate-400 line-clamp-1">
                            {wo.description}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          <span className="text-slate-200 font-semibold">
                            {wo.asset?.assetCode || 'N/A'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <CriticalityBadge level={wo.priority as any} />
                        </td>
                        <td className="py-3.5 px-4">
                          <WorkOrderStatusBadge status={wo.status} />
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">
                          {wo.assignedUser?.fullName || 'Unassigned'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedWoDetail(wo);
                            }}
                            leftIcon={<Eye className="w-3.5 h-3.5" />}
                          >
                            Details
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

      {/* VIEW 2: KANBAN BOARD */}
      {viewMode === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map((col) => {
            const columnOrders = workOrders.filter((wo) => wo.status === col.status);
            return (
              <div
                key={col.status}
                className="bg-midnight-900/90 rounded-2xl p-3 border border-slate-800 flex flex-col min-w-[260px]"
              >
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                    <WorkOrderStatusBadge status={col.status} />
                  </span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-midnight-950 text-slate-400 border border-slate-800">
                    {columnOrders.length}
                  </span>
                </div>

                <div className="space-y-3 overflow-y-auto max-h-[600px] flex-1">
                  {columnOrders.map((wo) => {
                    const nextStates = VALID_NEXT_STATES[wo.status] || [];
                    return (
                      <div
                        key={wo.id}
                        onClick={() => setSelectedWoDetail(wo)}
                        className="p-3.5 rounded-xl bg-midnight-950 border border-slate-800 hover:border-indigo-500/40 cursor-pointer space-y-2.5 transition-all shadow-md"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-gold-400">
                            {wo.workOrderNumber}
                          </span>
                          <CriticalityBadge level={wo.priority as any} />
                        </div>
                        <h4 className="text-xs font-semibold text-slate-100 line-clamp-2">
                          {wo.title}
                        </h4>
                        <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
                          <span>{wo.asset?.assetCode}</span>
                          <span>{wo.costs ? `$${wo.costs.totalCost}` : ''}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE WORK ORDER MODAL */}
      {isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Create Authorized Facility Work Order"
          description="Initiates an explicit state-machine record with unique sequence numbering."
          size="md"
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <Input
              label="Work Order Title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Centrifugal Chiller Annual Condenser Overhaul"
              required
            />

            <div className="space-y-1.5">
              <label className="block text-xs sm:text-sm font-medium text-slate-300">
                Technical Scope of Work
              </label>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={3}
                className="w-full bg-midnight-950 border border-slate-800 rounded-xl p-3 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                placeholder="Detailed mechanical tasks, safety precautions, and isolation requirements..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Priority"
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as PriorityLevel)}
                options={[
                  { value: 'urgent', label: 'Urgent' },
                  { value: 'high', label: 'High' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'low', label: 'Low' },
                ]}
              />

              <Input
                label="Estimated Labor (Hours)"
                type="number"
                min={0.5}
                step={0.5}
                value={newEstimatedHours}
                onChange={(e) => setNewEstimatedHours(Number(e.target.value))}
              />
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end gap-2.5">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
              >
                Create Work Order
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* WORK ORDER DETAIL & STATE MACHINE MODAL */}
      {selectedWoDetail && (
        <Modal
          isOpen={!!selectedWoDetail}
          onClose={() => setSelectedWoDetail(null)}
          title={`${selectedWoDetail.workOrderNumber}: ${selectedWoDetail.title}`}
          description={`Target Asset: ${selectedWoDetail.asset?.assetCode} — ${selectedWoDetail.asset?.name}`}
          size="lg"
        >
          <div className="space-y-5">
            {/* Status & Priority Badge Bar */}
            <div className="p-4 rounded-xl bg-midnight-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-mono">Current State:</span>
                <WorkOrderStatusBadge status={selectedWoDetail.status} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-mono">Priority:</span>
                <CriticalityBadge level={selectedWoDetail.priority as any} />
              </div>
            </div>

            {/* Allowed State Transitions */}
            <div className="p-4 rounded-xl bg-midnight-950 border border-indigo-500/30 space-y-2.5">
              <span className="text-xs font-semibold text-slate-200">
                Execute Allowed State Transitions:
              </span>
              <div className="flex flex-wrap gap-2">
                {(VALID_NEXT_STATES[selectedWoDetail.status] || []).length === 0 ? (
                  <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Work Order reached terminal state ({selectedWoDetail.status}).
                  </span>
                ) : (
                  (VALID_NEXT_STATES[selectedWoDetail.status] || []).map((actionState) => (
                    <Button
                      key={actionState}
                      variant="gold"
                      size="sm"
                      onClick={() =>
                        setTransitionTarget({
                          id: selectedWoDetail.id,
                          action: actionState,
                          label: actionState.toUpperCase(),
                        })
                      }
                      rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    >
                      Transition to {actionState.toUpperCase()}
                    </Button>
                  ))
                )}
              </div>
            </div>

            {/* Tasks & Checklists */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-300">
                Execution Task Checklist ({selectedWoDetail.tasks?.length || 0}):
              </span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {selectedWoDetail.tasks?.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl bg-midnight-950 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-indigo-400 font-bold">
                        #{t.sequenceNo}
                      </span>
                      <span className="text-slate-200">{t.description}</span>
                    </div>
                    <Badge
                      tone={
                        t.status === 'completed'
                          ? 'emerald'
                          : t.status === 'in_progress'
                          ? 'gold'
                          : 'slate'
                      }
                      size="sm"
                    >
                      {t.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Cost Breakdown */}
            {selectedWoDetail.costs && (
              <div className="p-4 rounded-xl bg-midnight-950 border border-slate-800 space-y-2 font-mono text-xs">
                <span className="text-slate-400 block font-semibold">
                  Financial Cost Ledger:
                </span>
                <div className="grid grid-cols-4 gap-2 text-center pt-2 border-t border-slate-800">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Labor</span>
                    <span className="text-slate-200 font-bold">${selectedWoDetail.costs.laborCost}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Parts</span>
                    <span className="text-slate-200 font-bold">${selectedWoDetail.costs.partsCost}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Contractor</span>
                    <span className="text-slate-200 font-bold">${selectedWoDetail.costs.contractorCost}</span>
                  </div>
                  <div>
                    <span className="text-gold-400 block text-[10px]">Total Cost</span>
                    <span className="text-gold-300 font-bold">${selectedWoDetail.costs.totalCost}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* STATE TRANSITION CONFIRMATION MODAL */}
      {transitionTarget && (
        <Modal
          isOpen={!!transitionTarget}
          onClose={() => setTransitionTarget(null)}
          title={`Confirm State Change to ${transitionTarget.label}`}
          description="Atomic transition recorded with audit justification."
          size="sm"
        >
          <div className="space-y-4">
            <Input
              label="Transition Notes / Justification Reason"
              value={transitionReason}
              onChange={(e) => setTransitionReason(e.target.value)}
              placeholder="e.g. Completed mechanical seal installation and passed leak test."
              required
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setTransitionTarget(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleConfirmTransition}>
                Confirm State Transition
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default WorkOrdersPage;
