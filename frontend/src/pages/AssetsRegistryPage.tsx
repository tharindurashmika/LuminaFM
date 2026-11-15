import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Cpu,
  Search,
  Filter,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  MapPin,
  Network,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Layers,
  ArrowUpDown,
  Download,
} from 'lucide-react';
import { AssetStatus, AssetSummary } from '../types/cmms.types';
import { assetsApiService } from '../services/assets.service';
import {
  AssetStatusBadge,
  CriticalityBadge,
} from '../components/ui/StatusBadge';
import { LoadingState, EmptyState, Button } from '../components/ui';
import { AssetDetailDrawer } from '../components/assets/AssetDetailDrawer';
import { exportToCsv, exportToJson } from '../utils/export.utils';

const STATUS_OPTIONS: Array<{ value: AssetStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'in_service', label: 'In Service' },
  { value: 'under_maintenance', label: 'Under Maintenance' },
  { value: 'standby', label: 'Standby' },
  { value: 'out_of_service', label: 'Out of Service' },
  { value: 'decommissioned', label: 'Decommissioned' },
];

export const AssetsRegistryPage: React.FC = () => {
  const [assets, setAssets] = useState<AssetSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filter States: Site, Category, Status, and Search
  const [selectedSiteId, setSelectedSiteId] = useState<string>('ALL');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<AssetStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination States
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(6);

  // Active Asset in Side-Drawer
  const [inspectedAsset, setInspectedAsset] = useState<AssetSummary | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    assetsApiService
      .listAssets()
      .then((data) => {
        if (isMounted) {
          setAssets(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Dynamically derive unique Sites and Categories from the tenant's Asset catalog
  const siteOptions = useMemo(() => {
    const map = new Map<string, { id: string; code: string; name: string }>();
    assets.forEach((a) => {
      if (a.site && !map.has(a.site.id)) {
        map.set(a.site.id, a.site);
      }
    });
    return Array.from(map.values());
  }, [assets]);

  const categoryOptions = useMemo(() => {
    const map = new Map<string, { id: string; code: string; name: string }>();
    assets.forEach((a) => {
      if (a.assetCategory && !map.has(a.assetCategory.id)) {
        map.set(a.assetCategory.id, a.assetCategory);
      }
    });
    return Array.from(map.values());
  }, [assets]);

  // Apply Site, Category, Status, and Search filters
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      if (selectedSiteId !== 'ALL' && asset.site.id !== selectedSiteId) {
        return false;
      }
      if (
        selectedCategoryId !== 'ALL' &&
        asset.assetCategory.id !== selectedCategoryId
      ) {
        return false;
      }
      if (selectedStatus !== 'ALL' && asset.status !== selectedStatus) {
        return false;
      }
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchesCode = asset.assetCode.toLowerCase().includes(q);
        const matchesName = asset.name.toLowerCase().includes(q);
        const matchesSerial =
          asset.serialNumber?.toLowerCase().includes(q) ?? false;
        const matchesLocation = asset.location.name.toLowerCase().includes(q);
        const matchesCategory = asset.assetCategory.name
          .toLowerCase()
          .includes(q);
        if (
          !matchesCode &&
          !matchesName &&
          !matchesSerial &&
          !matchesLocation &&
          !matchesCategory
        ) {
          return false;
        }
      }
      return true;
    });
  }, [
    assets,
    selectedSiteId,
    selectedCategoryId,
    selectedStatus,
    searchQuery,
  ]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSiteId, selectedCategoryId, selectedStatus, searchQuery, pageSize]);

  // Sorting states
  const [sortField, setSortField] = useState<'assetCode' | 'name' | 'category' | 'criticality' | 'status'>('assetCode');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: 'assetCode' | 'name' | 'category' | 'criticality' | 'status') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedAssets = useMemo(() => {
    const sorted = [...filteredAssets];
    sorted.sort((a, b) => {
      let valA = '';
      let valB = '';
      if (sortField === 'assetCode') {
        valA = a.assetCode;
        valB = b.assetCode;
      } else if (sortField === 'name') {
        valA = a.name;
        valB = b.name;
      } else if (sortField === 'category') {
        valA = a.assetCategory?.name || '';
        valB = b.assetCategory?.name || '';
      } else if (sortField === 'criticality') {
        valA = a.criticality;
        valB = b.criticality;
      } else if (sortField === 'status') {
        valA = a.status;
        valB = b.status;
      }
      const cmp = valA.localeCompare(valB);
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [filteredAssets, sortField, sortDirection]);

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(sortedAssets.length / pageSize));
  const paginatedAssets = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return sortedAssets.slice(startIdx, startIdx + pageSize);
  }, [sortedAssets, currentPage, pageSize]);

  const handleExportCsv = () => {
    exportToCsv(
      sortedAssets,
      [
        { header: 'Asset Code', accessor: 'assetCode' },
        { header: 'Asset Name', accessor: 'name' },
        { header: 'Serial #', accessor: (a) => a.serialNumber || 'N/A' },
        { header: 'Site', accessor: (a) => a.site?.name || '' },
        { header: 'Location', accessor: (a) => a.location?.name || '' },
        { header: 'Category', accessor: (a) => a.assetCategory?.name || '' },
        { header: 'Criticality', accessor: 'criticality' },
        { header: 'Status', accessor: 'status' },
      ],
      'lumina_asset_master_register'
    );
  };

  const handleResetFilters = () => {
    setSelectedSiteId('ALL');
    setSelectedCategoryId('ALL');
    setSelectedStatus('ALL');
    setSearchQuery('');
  };

  const hasActiveFilters =
    selectedSiteId !== 'ALL' ||
    selectedCategoryId !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    searchQuery.trim() !== '';

  // KPI summary metrics
  const kpiStats = useMemo(() => {
    const total = assets.length;
    const inService = assets.filter((a) => a.status === 'in_service').length;
    const critical = assets.filter((a) => a.criticality === 'critical').length;
    const maintenance = assets.filter(
      (a) => a.status === 'under_maintenance' || a.status === 'out_of_service'
    ).length;
    return { total, inService, critical, maintenance };
  }, [assets]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs md:text-sm font-medium uppercase tracking-widest text-indigo-400">
            <Cpu className="w-4 h-4" />
            <span>Asset Master Registry &amp; Dynamic Telemetry</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-100 mt-1">
            Asset Master Dashboard
          </h1>
          <p className="text-base text-slate-400 mt-0.5">
            Multi-site equipment registry with DAG hierarchy validation and schema-free EAV attribute inspection.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link to="/hierarchies">
            <Button variant="secondary" size="sm" leftIcon={<Network className="w-4 h-4 text-indigo-400" />}>
              Hierarchy Explorer
            </Button>
          </Link>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCsv}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export Register (CSV)
          </Button>
          <div className="hidden xl:flex min-h-[38px] px-3.5 py-1.5 rounded-xl bg-midnight-850 border border-slate-800/80 text-xs text-slate-200 items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>DAG Guard Active</span>
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="lumina-card p-4 md:p-5 flex items-center justify-between">
          <div>
            <span className="text-xs md:text-sm font-mono uppercase tracking-wider text-slate-400">
              Total Registered Assets
            </span>
            <div className="text-2xl md:text-3xl font-semibold font-mono text-slate-100 mt-1">
              {kpiStats.total}
            </div>
          </div>
          <div className="h-11 w-11 rounded-xl bg-indigo-950/90 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="lumina-card p-4 md:p-5 flex items-center justify-between">
          <div>
            <span className="text-xs md:text-sm font-mono uppercase tracking-wider text-slate-400">
              Active In-Service
            </span>
            <div className="text-2xl md:text-3xl font-semibold font-mono text-emerald-400 mt-1">
              {kpiStats.inService}
            </div>
          </div>
          <div className="h-11 w-11 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="lumina-card p-4 md:p-5 flex items-center justify-between border-gold-500/30">
          <div>
            <span className="text-xs md:text-sm font-mono uppercase tracking-wider text-gold-300">
              Criticality: Critical
            </span>
            <div className="text-2xl md:text-3xl font-semibold font-mono text-gold-400 mt-1">
              {kpiStats.critical}
            </div>
          </div>
          <div className="h-11 w-11 rounded-xl bg-gold-500/15 border border-gold-500/40 flex items-center justify-center text-gold-400 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="lumina-card p-4 md:p-5 flex items-center justify-between">
          <div>
            <span className="text-xs md:text-sm font-mono uppercase tracking-wider text-slate-400">
              Maintenance / Outage
            </span>
            <div className="text-2xl md:text-3xl font-semibold font-mono text-amber-300 mt-1">
              {kpiStats.maintenance}
            </div>
          </div>
          <div className="h-11 w-11 rounded-xl bg-amber-950/60 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Bar (Touch-Friendly >=48px Height Inputs & Dropdowns) */}
      <div className="lumina-card p-4 md:p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
          {/* Search Input */}
          <div className="md:col-span-2 lg:col-span-4">
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-2">
              Search Equipment
            </label>
            <div className="relative">
              <Search className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search code (BLR-001), name, serial, location..."
                className="lumina-input pl-11 min-h-[48px] text-base"
              />
            </div>
          </div>

          {/* Site Filter */}
          <div className="lg:col-span-3">
            <label
              htmlFor="filter-site"
              className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-2"
            >
              Filter by Site
            </label>
            <select
              id="filter-site"
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="lumina-input min-h-[48px] text-base"
            >
              <option value="ALL">All Sites ({siteOptions.length})</option>
              {siteOptions.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name} ({site.code})
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="lg:col-span-2">
            <label
              htmlFor="filter-category"
              className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-2"
            >
              Filter by Category
            </label>
            <select
              id="filter-category"
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="lumina-input min-h-[48px] text-base"
            >
              <option value="ALL">All Categories ({categoryOptions.length})</option>
              {categoryOptions.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="lg:col-span-2">
            <label
              htmlFor="filter-status"
              className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-2"
            >
              Filter by Status
            </label>
            <select
              id="filter-status"
              value={selectedStatus}
              onChange={(e) =>
                setSelectedStatus(e.target.value as AssetStatus | 'ALL')
              }
              className="lumina-input min-h-[48px] text-base"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters Button (48px height touch target) */}
          <div className="lg:col-span-1 flex justify-end">
            <button
              type="button"
              onClick={handleResetFilters}
              disabled={!hasActiveFilters}
              title="Reset Filters"
              className={`w-full min-h-[48px] min-w-[44px] px-4 rounded-xl text-sm font-mono flex items-center justify-center gap-2 border transition-colors ${
                hasActiveFilters
                  ? 'bg-gold-500/15 text-gold-300 border-gold-500/40 hover:bg-gold-500/25'
                  : 'bg-midnight-950/50 text-slate-600 border-slate-800/70 cursor-not-allowed'
              }`}
            >
              <RotateCcw className="w-4 h-4 shrink-0" />
              <span className="lg:hidden">Reset Filters</span>
            </button>
          </div>
        </div>
      </div>

      {/* Responsive Asset Master Container (Stacked Cards on `< lg`, Full Table on `lg:`+) */}
      <div className="lumina-card overflow-hidden">
        <div className="px-5 py-4 bg-midnight-950/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Filter className="w-4 h-4 text-indigo-400" />
            <span>
              Showing{' '}
              <strong className="font-mono text-slate-100">
                {filteredAssets.length === 0
                  ? 0
                  : (currentPage - 1) * pageSize + 1}
              </strong>
              –
              <strong className="font-mono text-slate-100">
                {Math.min(currentPage * pageSize, filteredAssets.length)}
              </strong>{' '}
              of{' '}
              <strong className="font-mono text-gold-400">
                {filteredAssets.length}
              </strong>{' '}
              matching assets
            </span>
          </div>

          <span className="text-xs md:text-sm font-mono text-slate-400">
            Tap any equipment card or row to open the Dynamic EAV Attribute Drawer
          </span>
        </div>

        {/* ===================================================================
            A. TABLET PORTRAIT (`md:`) & MOBILE STACKED CARD VIEW (`lg:hidden`)
           =================================================================== */}
        <div className="lg:hidden p-4 sm:p-5">
          {isLoading ? (
            <LoadingState
              title="Loading Tenant Asset Registry..."
              description="Retrieving physical locations, technical systems, and dynamic equipment attributes."
            />
          ) : paginatedAssets.length === 0 ? (
            <EmptyState
              title="No Assets Match Criteria"
              description="No equipment found matching the selected Site, Category, or Status filters."
              actionLabel="Clear Active Filters"
              onAction={handleResetFilters}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paginatedAssets.map((asset) => {
                const isSelected = inspectedAsset?.id === asset.id;
                return (
                  <div
                    key={asset.id}
                    onClick={() => setInspectedAsset(asset)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setInspectedAsset(asset);
                      }
                    }}
                    className={`p-5 rounded-xl border transition-all flex flex-col justify-between gap-4 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-950/60 border-gold-500/60 shadow-glow-gold'
                        : 'bg-midnight-950/85 border-slate-800/90 hover:border-indigo-500/40'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Card Header: Asset Code + Criticality & Status */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono text-sm font-semibold px-3 py-1.5 rounded-lg bg-indigo-950 text-gold-300 border border-gold-500/40">
                          {asset.assetCode}
                        </span>
                        <div className="flex items-center gap-2">
                          <CriticalityBadge level={asset.criticality} />
                          <AssetStatusBadge status={asset.status} />
                        </div>
                      </div>

                      {/* Equipment Name & OEM */}
                      <div>
                        <h3 className="text-base md:text-lg font-semibold text-slate-100 leading-snug">
                          {asset.name}
                        </h3>
                        <p className="text-sm text-slate-400 mt-1 font-mono">
                          {asset.brand?.name ?? 'OEM'}{' '}
                          {asset.model?.modelNumber
                            ? `• ${asset.model.modelNumber}`
                            : ''}{' '}
                          • SN: {asset.serialNumber || 'N/A'}
                        </p>
                      </div>

                      {/* Site, Physical Location, System & Category Metadata */}
                      <div className="p-3.5 rounded-xl bg-midnight-900/90 border border-slate-800/80 space-y-2 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-400">Category:</span>
                          <span className="font-mono text-indigo-300 font-medium">
                            {asset.assetCategory.name}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-400">Site:</span>
                          <span className="text-slate-200 font-medium truncate">
                            {asset.site.name}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-400 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                            Location:
                          </span>
                          <span className="text-slate-300 truncate">
                            {asset.location.name}
                          </span>
                        </div>
                        {asset.system && (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-400 flex items-center gap-1">
                              <Network className="w-3.5 h-3.5 text-gold-400" />
                              System:
                            </span>
                            <span className="font-mono text-xs text-gold-300">
                              {asset.system.code}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Full-Width 48px Touch Action Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setInspectedAsset(asset);
                      }}
                      className="w-full min-h-[48px] px-4 py-3 rounded-xl text-sm font-mono font-semibold bg-indigo-950/90 hover:bg-gold-500/20 text-gold-300 border border-gold-500/40 flex items-center justify-center gap-2 transition-all"
                    >
                      <SlidersHorizontal className="w-4 h-4 text-gold-400" />
                      <span>Inspect Dynamic EAV Attributes</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ===================================================================
            B. DESKTOP & TABLET LANDSCAPE FULL DATA TABLE (`hidden lg:block`)
           =================================================================== */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/90 bg-midnight-950/90 text-xs font-mono uppercase tracking-wider text-slate-400">
                <th
                  onClick={() => handleSort('assetCode')}
                  className="py-4 px-5 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Asset Code</span>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('name')}
                  className="py-4 px-4 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Equipment Name &amp; OEM</span>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </th>
                <th className="py-4 px-4">Site &amp; Physical Location</th>
                <th
                  onClick={() => handleSort('category')}
                  className="py-4 px-4 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Category</span>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('criticality')}
                  className="py-4 px-4 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Criticality</span>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="py-4 px-4 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Status</span>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </th>
                <th className="py-4 px-5 text-right">Telemetry / EAV</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8">
                    <LoadingState
                      title="Loading Tenant Asset Registry..."
                      description="Retrieving hierarchical asset tree and dynamic attributes..."
                    />
                  </td>
                </tr>
              ) : paginatedAssets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8">
                    <EmptyState
                      title="No Assets Match Criteria"
                      description="No equipment found matching the selected Site, Category, or Status filters."
                      actionLabel="Clear Active Filters"
                      onAction={handleResetFilters}
                    />
                  </td>
                </tr>
              ) : (
                paginatedAssets.map((asset) => {
                  const isSelected = inspectedAsset?.id === asset.id;
                  return (
                    <tr
                      key={asset.id}
                      onClick={() => setInspectedAsset(asset)}
                      className={`group cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-indigo-950/50'
                          : 'hover:bg-midnight-850/90'
                      }`}
                    >
                      {/* Asset Code & Serial */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold px-3 py-1.5 rounded-lg bg-indigo-950/90 text-indigo-300 border border-indigo-500/30 group-hover:border-gold-500/50 group-hover:text-gold-300 transition-colors">
                            {asset.assetCode}
                          </span>
                        </div>
                        <div className="text-xs font-mono text-slate-500 mt-1">
                          SN: {asset.serialNumber || 'N/A'}
                        </div>
                      </td>

                      {/* Equipment Name & Brand/Model */}
                      <td className="py-4 px-4">
                        <div className="text-base font-semibold text-slate-100 group-hover:text-gold-300 transition-colors">
                          {asset.name}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                          <span>
                            {asset.brand?.name ?? 'OEM'}{' '}
                            {asset.model?.modelNumber
                              ? `• ${asset.model.modelNumber}`
                              : ''}
                          </span>
                          {asset.system && (
                            <span className="inline-flex items-center gap-1 font-mono text-xs text-indigo-400">
                              <Network className="w-3.5 h-3.5" />
                              {asset.system.code}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Site & Location */}
                      <td className="py-4 px-4">
                        <div className="font-medium text-slate-200">
                          {asset.site.name}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span className="truncate max-w-[230px]">
                            {asset.location.name}
                          </span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-midnight-950 border border-slate-800 text-xs font-mono text-slate-200">
                          {asset.assetCategory.name}
                        </span>
                      </td>

                      {/* Criticality */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <CriticalityBadge level={asset.criticality} />
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <AssetStatusBadge status={asset.status} />
                      </td>

                      {/* Touch Action (>=44px height) */}
                      <td className="py-4 px-5 whitespace-nowrap text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectedAsset(asset);
                          }}
                          className="inline-flex items-center justify-center gap-2 min-h-[44px] min-w-[44px] px-4 py-2 rounded-xl text-xs font-mono font-medium bg-midnight-950 text-indigo-300 border border-indigo-500/30 group-hover:bg-gold-500/15 group-hover:text-gold-300 group-hover:border-gold-500/40 transition-all"
                        >
                          <SlidersHorizontal className="w-4 h-4" />
                          <span>Inspect EAV</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table / Card Grid Footer & Touch Pagination Controls */}
        <div className="px-5 py-4 bg-midnight-950/85 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="min-h-[44px] min-w-[68px] bg-midnight-900 border border-slate-700/80 rounded-xl px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value={5}>5</option>
              <option value={6}>6</option>
              <option value={8}>8</option>
              <option value={12}>12</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-midnight-900 border border-slate-800 text-slate-200 hover:border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              aria-label="Previous Page"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(
              (pageNum) => {
                const isActive = pageNum === currentPage;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`min-h-[44px] min-w-[44px] px-3.5 rounded-xl text-sm font-mono font-semibold border transition-all ${
                      isActive
                        ? 'bg-gold-500/20 text-gold-300 border-gold-500/50 shadow-glow-gold'
                        : 'bg-midnight-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              }
            )}

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-midnight-900 border border-slate-800 text-slate-200 hover:border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              aria-label="Next Page"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Slide-Over Asset Detail & Dynamic Attributes Drawer */}
      <AssetDetailDrawer
        asset={inspectedAsset}
        onClose={() => setInspectedAsset(null)}
      />
    </div>
  );
};

export default AssetsRegistryPage;
