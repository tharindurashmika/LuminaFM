import React, { useState, useMemo } from 'react';
import {
  Network,
  MapPin,
  Cpu,
  Layers,
  ChevronRight,
  ChevronDown,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Building2,
  SlidersHorizontal,
  FolderTree,
  Eye,
  Download,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  Tabs,
  Input,
  LoadingState,
  EmptyState,
} from '../components/ui';
import { EquipmentHierarchyNode, AssetStatus, CriticalityLevel } from '../types/cmms.types';
import { AssetStatusBadge, CriticalityBadge } from '../components/ui/StatusBadge';
import { exportToJson } from '../utils/export.utils';

// High-fidelity facility hierarchy tree representing Colombo Grand Complex
const PHYSICAL_LOCATION_TREE: EquipmentHierarchyNode = {
  id: 'loc-site-1',
  code: 'COLOMBO-SITE',
  name: 'Colombo Grand Hospitality Complex',
  type: 'site',
  children: [
    {
      id: 'loc-bld-1',
      code: 'BLD-MAIN',
      name: 'Main Hotel Tower & Podium',
      type: 'building',
      children: [
        {
          id: 'loc-flr-b1',
          code: 'FLR-B1',
          name: 'Basement Level 1 (Engineering Plant)',
          type: 'floor',
          children: [
            {
              id: 'loc-rm-blr',
              code: 'RM-BLR-01',
              name: 'Central Boiler & Steam Generation Room',
              type: 'room',
              assetCount: 3,
              children: [
                {
                  id: 'a1000000-0000-0000-0000-000000000001',
                  code: 'BLR-001',
                  name: 'Main High-Pressure Steam Boiler (1,100 kg/h)',
                  type: 'asset',
                  categoryName: 'Steam Boilers',
                  status: 'in_service',
                  criticality: 'critical',
                  modelNumber: 'CB-PACK-1100',
                  children: [
                    { id: 'c-1', code: 'BLR-BRN-01', name: 'Dual-Fuel Rotary Cup Burner', type: 'component', status: 'in_service' },
                    { id: 'c-2', code: 'BLR-SV-01', name: 'Primary Safety Pop Relief Valve (10.5 bar)', type: 'component', status: 'in_service' },
                    { id: 'c-3', code: 'BLR-LWCO-01', name: 'Primary Low Water Cutoff Chamber', type: 'component', status: 'in_service' },
                  ],
                },
                {
                  id: 'a2000000-0000-0000-0000-000000000002',
                  code: 'P-001',
                  name: 'Multi-Stage Centrifugal Feedwater Pump A',
                  type: 'asset',
                  categoryName: 'Centrifugal Pumps',
                  status: 'under_maintenance',
                  criticality: 'high',
                  modelNumber: 'CR-32-6',
                },
                {
                  id: 'a2000000-0000-0000-0000-000000000006',
                  code: 'P-002',
                  name: 'Multi-Stage Centrifugal Feedwater Pump B (Standby)',
                  type: 'asset',
                  categoryName: 'Centrifugal Pumps',
                  status: 'standby',
                  criticality: 'high',
                  modelNumber: 'CR-32-6',
                },
              ],
            },
            {
              id: 'loc-rm-chl',
              code: 'RM-CHL-01',
              name: 'Central Refrigeration & Chiller Room',
              type: 'room',
              assetCount: 2,
              children: [
                {
                  id: 'a3000000-0000-0000-0000-000000000003',
                  code: 'CHL-001',
                  name: '500-Ton Water-Cooled Centrifugal Chiller 1',
                  type: 'asset',
                  categoryName: 'Centrifugal Chillers',
                  status: 'in_service',
                  criticality: 'high',
                  modelNumber: 'YORK-YK-500',
                },
                {
                  id: 'a3000000-0000-0000-0000-000000000007',
                  code: 'CHL-002',
                  name: '500-Ton Water-Cooled Centrifugal Chiller 2',
                  type: 'asset',
                  categoryName: 'Centrifugal Chillers',
                  status: 'in_service',
                  criticality: 'high',
                  modelNumber: 'YORK-YK-500',
                },
              ],
            },
          ],
        },
        {
          id: 'loc-flr-rf',
          code: 'FLR-ROOF',
          name: 'Main Tower Rooftop Plant',
          type: 'floor',
          children: [
            {
              id: 'loc-rm-ahu',
              code: 'RM-AHU-RF',
              name: 'Rooftop Ventilation & Cooling Towers Yard',
              type: 'room',
              assetCount: 2,
              children: [
                {
                  id: 'a5000000-0000-0000-0000-000000000005',
                  code: 'AHU-001',
                  name: 'Central Lobby Air Handling Unit',
                  type: 'asset',
                  categoryName: 'Air Handling Units',
                  status: 'in_service',
                  criticality: 'medium',
                  modelNumber: 'CARRIER-39HQ',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'loc-bld-util',
      code: 'BLD-POWER',
      name: 'Independent Utility & Power Substation Building',
      type: 'building',
      children: [
        {
          id: 'loc-rm-gen',
          code: 'RM-GEN-01',
          name: 'Emergency Standby Generator Enclosure',
          type: 'room',
          assetCount: 1,
          children: [
            {
              id: 'a4000000-0000-0000-0000-000000000004',
              code: 'GEN-001',
              name: '1,250 kVA Standby Diesel Generator Set',
              type: 'asset',
              categoryName: 'Diesel Generators',
              status: 'in_service',
              criticality: 'critical',
              modelNumber: 'CUMMINS-QST30',
            },
          ],
        },
      ],
    },
  ],
};

const TECHNICAL_SYSTEM_TREE: EquipmentHierarchyNode = {
  id: 'sys-site-1',
  code: 'SYS-ROOT',
  name: 'Facility Engineering Systems Taxonomy',
  type: 'site',
  children: [
    {
      id: 'sys-stm',
      code: 'SYS-STM',
      name: 'Steam & Thermal Generation System',
      type: 'system',
      children: [
        {
          id: 'sys-stm-prod',
          code: 'SUB-STM-GEN',
          name: 'Primary Steam Boiler Generation Loop',
          type: 'subsystem',
          assetCount: 3,
          children: [
            {
              id: 'a1000000-0000-0000-0000-000000000001',
              code: 'BLR-001',
              name: 'Main High-Pressure Steam Boiler (1,100 kg/h)',
              type: 'asset',
              status: 'in_service',
              criticality: 'critical',
              locationName: 'Basement Boiler Room',
            },
            {
              id: 'a2000000-0000-0000-0000-000000000002',
              code: 'P-001',
              name: 'Multi-Stage Centrifugal Feedwater Pump A',
              type: 'asset',
              status: 'under_maintenance',
              criticality: 'high',
              locationName: 'Basement Boiler Room',
            },
            {
              id: 'a2000000-0000-0000-0000-000000000006',
              code: 'P-002',
              name: 'Multi-Stage Centrifugal Feedwater Pump B (Standby)',
              type: 'asset',
              status: 'standby',
              criticality: 'high',
              locationName: 'Basement Boiler Room',
            },
          ],
        },
      ],
    },
    {
      id: 'sys-hvac',
      code: 'SYS-HVAC',
      name: 'Chilled Water & Air Conditioning System',
      type: 'system',
      children: [
        {
          id: 'sys-hvac-prod',
          code: 'SUB-CHW-PLANT',
          name: 'Primary Central Chilled Water Generation',
          type: 'subsystem',
          assetCount: 2,
          children: [
            {
              id: 'a3000000-0000-0000-0000-000000000003',
              code: 'CHL-001',
              name: '500-Ton Water-Cooled Centrifugal Chiller 1',
              type: 'asset',
              status: 'in_service',
              criticality: 'high',
              locationName: 'Central Chiller Room',
            },
            {
              id: 'a3000000-0000-0000-0000-000000000007',
              code: 'CHL-002',
              name: '500-Ton Water-Cooled Centrifugal Chiller 2',
              type: 'asset',
              status: 'in_service',
              criticality: 'high',
              locationName: 'Central Chiller Room',
            },
          ],
        },
        {
          id: 'sys-hvac-dist',
          code: 'SUB-AIR-DIST',
          name: 'Air Handling & Climate Distribution',
          type: 'subsystem',
          assetCount: 1,
          children: [
            {
              id: 'a5000000-0000-0000-0000-000000000005',
              code: 'AHU-001',
              name: 'Central Lobby Air Handling Unit',
              type: 'asset',
              status: 'in_service',
              criticality: 'medium',
              locationName: 'Rooftop Plant Yard',
            },
          ],
        },
      ],
    },
    {
      id: 'sys-elec',
      code: 'SYS-ELEC',
      name: 'Electrical Power Generation & Distribution',
      type: 'system',
      children: [
        {
          id: 'sys-elec-emg',
          code: 'SUB-EMG-POWER',
          name: 'Standby Emergency Generation & ATS',
          type: 'subsystem',
          assetCount: 1,
          children: [
            {
              id: 'a4000000-0000-0000-0000-000000000004',
              code: 'GEN-001',
              name: '1,250 kVA Standby Diesel Generator Set',
              type: 'asset',
              status: 'in_service',
              criticality: 'critical',
              locationName: 'Generator Enclosure',
            },
          ],
        },
      ],
    },
  ],
};

export const EquipmentHierarchyPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'physical' | 'technical'>('physical');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'loc-site-1': true,
    'loc-bld-1': true,
    'loc-flr-b1': true,
    'loc-rm-blr': true,
    'sys-site-1': true,
    'sys-stm': true,
    'sys-stm-prod': true,
    'sys-hvac': true,
    'sys-hvac-prod': true,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNode, setSelectedNode] = useState<EquipmentHierarchyNode | null>(null);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }));
  };

  const expandAll = () => {
    const allIds: Record<string, boolean> = {};
    const traverse = (node: EquipmentHierarchyNode) => {
      allIds[node.id] = true;
      node.children?.forEach(traverse);
    };
    traverse(activeTab === 'physical' ? PHYSICAL_LOCATION_TREE : TECHNICAL_SYSTEM_TREE);
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    setExpandedNodes({});
  };

  const handleExportTree = () => {
    const treeData = activeTab === 'physical' ? PHYSICAL_LOCATION_TREE : TECHNICAL_SYSTEM_TREE;
    exportToJson(treeData, `lumina_equipment_hierarchy_${activeTab}`);
  };

  const renderTree = (node: EquipmentHierarchyNode, depth: number = 0) => {
    const isExpanded = !!expandedNodes[node.id];
    const hasChildren = node.children && node.children.length > 0;
    const isAsset = node.type === 'asset' || node.type === 'component';
    const isSelected = selectedNode?.id === node.id;

    // Filter check
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchesSelf = node.name.toLowerCase().includes(q) || node.code.toLowerCase().includes(q);
      const matchesChild = JSON.stringify(node.children || '').toLowerCase().includes(q);
      if (!matchesSelf && !matchesChild) return null;
    }

    const getNodeIcon = () => {
      switch (node.type) {
        case 'site':
          return <Building2 className="w-4 h-4 text-gold-400" />;
        case 'building':
          return <Layers className="w-4 h-4 text-indigo-400" />;
        case 'floor':
        case 'room':
          return <MapPin className="w-4 h-4 text-slate-400" />;
        case 'system':
        case 'subsystem':
          return <Network className="w-4 h-4 text-indigo-400" />;
        case 'asset':
          return <Cpu className="w-4 h-4 text-gold-400" />;
        case 'component':
          return <div className="w-2 h-2 rounded-full bg-slate-500" />;
        default:
          return <FolderTree className="w-4 h-4 text-slate-400" />;
      }
    };

    return (
      <div key={node.id} className="select-none">
        <div
          onClick={() => {
            if (hasChildren) toggleNode(node.id);
            setSelectedNode(node);
          }}
          className={`flex items-center justify-between py-2 px-3 rounded-xl cursor-pointer transition-all duration-150 text-sm ${
            isSelected
              ? 'bg-indigo-950/80 text-white border border-gold-500/40 shadow-glow-indigo/40'
              : 'hover:bg-midnight-800 text-slate-300'
          }`}
          style={{ paddingLeft: `${depth * 20 + 12}px` }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNode(node.id);
                }}
                className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white"
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            ) : (
              <div className="w-5" />
            )}

            {getNodeIcon()}

            <span className="font-mono text-xs text-indigo-400/90 font-medium">
              {node.code}
            </span>
            <span className="truncate font-medium text-slate-100">
              {node.name}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {node.assetCount !== undefined && node.assetCount > 0 && (
              <span className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-500/30">
                {node.assetCount} assets
              </span>
            )}
            {node.criticality && <CriticalityBadge level={node.criticality} />}
            {node.status && <AssetStatusBadge status={node.status} />}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="border-l border-slate-800/80 ml-6">
            {node.children!.map((child) => renderTree(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const activeTree = activeTab === 'physical' ? PHYSICAL_LOCATION_TREE : TECHNICAL_SYSTEM_TREE;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gold-400">
            <Network className="w-4 h-4" />
            <span>Dual-Hierarchy Asset Registry Architecture</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight mt-1">
            Equipment Hierarchy Explorer
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Independent self-referencing trees for Physical Space vs. Technical Engineering Systems.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportTree}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export Hierarchy JSON
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Tabs
          tabs={[
            {
              id: 'physical',
              label: '1. Physical Location Tree',
              icon: <MapPin className="w-4 h-4" />,
              badge: 'Site → Room',
            },
            {
              id: 'technical',
              label: '2. Technical System Tree',
              icon: <Network className="w-4 h-4" />,
              badge: 'System → Asset',
            },
          ]}
          activeTab={activeTab}
          onChange={(tab) => {
            setActiveTab(tab as any);
            setSelectedNode(null);
          }}
        />

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={expandAll}>
            Expand All
          </Button>
          <Button variant="ghost" size="sm" onClick={collapseAll}>
            Collapse All
          </Button>
        </div>
      </div>

      {/* Main Grid: Tree View vs Inspector Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Tree Container */}
        <div className="lg:col-span-8">
          <Card variant="default">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FolderTree className="w-4 h-4 text-indigo-400" />
                  <span>
                    {activeTab === 'physical'
                      ? 'Physical Spatial Hierarchy (Building/Zone/Room)'
                      : 'Technical Engineering System Hierarchy (System/Loop/Subsystem)'}
                  </span>
                </CardTitle>
                <div className="w-full sm:w-64">
                  <Input
                    placeholder="Search node or code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    leadingIcon={<Search className="w-3.5 h-3.5" />}
                    className="min-h-[38px] text-xs py-1.5"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 max-h-[700px] overflow-y-auto space-y-1">
              {renderTree(activeTree)}
            </CardContent>
          </Card>
        </div>

        {/* Selected Node Inspector Sidepanel */}
        <div className="lg:col-span-4">
          <Card variant="accent-gold" className="sticky top-24">
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-gold-400" />
                  Node Details &amp; Relationships
                </span>
                {selectedNode && (
                  <Badge tone="indigo" size="sm">
                    {selectedNode.type}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Inspect parent-child linkages and technical attributes
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {selectedNode ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-midnight-950 border border-slate-800 space-y-2">
                    <span className="text-[10px] font-mono text-gold-400 uppercase tracking-widest">
                      Selected Hierarchy Element
                    </span>
                    <h4 className="text-base font-bold text-slate-100">
                      {selectedNode.name}
                    </h4>
                    <p className="text-xs font-mono text-indigo-300">
                      Node Code: {selectedNode.code}
                    </p>
                  </div>

                  <div className="space-y-2.5 text-xs font-mono">
                    <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                      <span className="text-slate-400">Node Type:</span>
                      <span className="text-slate-200 capitalize font-medium">{selectedNode.type}</span>
                    </div>
                    {selectedNode.categoryName && (
                      <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                        <span className="text-slate-400">Equipment Category:</span>
                        <span className="text-slate-200 font-medium">{selectedNode.categoryName}</span>
                      </div>
                    )}
                    {selectedNode.modelNumber && (
                      <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                        <span className="text-slate-400">Model Number:</span>
                        <span className="text-gold-300">{selectedNode.modelNumber}</span>
                      </div>
                    )}
                    {selectedNode.status && (
                      <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                        <span className="text-slate-400">Status:</span>
                        <AssetStatusBadge status={selectedNode.status} />
                      </div>
                    )}
                    {selectedNode.criticality && (
                      <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                        <span className="text-slate-400">Criticality:</span>
                        <CriticalityBadge level={selectedNode.criticality} />
                      </div>
                    )}
                  </div>

                  {selectedNode.children && selectedNode.children.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-midnight-950 border border-slate-800 space-y-2">
                      <span className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                        <span>Direct Descendants:</span>
                        <span className="font-mono text-indigo-400">{selectedNode.children.length}</span>
                      </span>
                      <div className="space-y-1.5">
                        {selectedNode.children.map((child) => (
                          <div
                            key={child.id}
                            onClick={() => setSelectedNode(child)}
                            className="text-xs p-2 rounded-lg bg-midnight-900 hover:bg-slate-800 text-slate-300 flex items-center justify-between cursor-pointer transition-colors"
                          >
                            <span className="truncate">{child.name}</span>
                            <span className="text-[10px] font-mono text-slate-500">{child.code}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <EmptyState
                  title="No Node Selected"
                  description="Click on any Site, Building, Room, System, or Equipment node in the hierarchy tree to inspect its parameters."
                  className="p-8"
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EquipmentHierarchyPage;
