import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Head, router } from '@inertiajs/react';
import { route } from 'ziggy-js';
import ProjectListSection from '@/Components/roi/ProjectListSection';
import { formatLastSaved } from '@/utils/dateUtils';
import axios from 'axios';

import { FaFolderOpen } from 'react-icons/fa';
import { IoTimeOutline, IoAddCircleOutline } from 'react-icons/io5';
import toast, { Toaster } from 'react-hot-toast';
import { MdDelete, MdEdit, MdSearch, MdOutlineFilterAlt, MdDateRange, MdClose } from 'react-icons/md';
import FlashMessages from '@/Components/FlashMessages';

// Matching Date Utility Engine
function formatDateLabel(dateStr) {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-');
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'long', day: '2-digit', year: 'numeric',
  });
}

export default function SprfEntryList({
  drafts = null,
  stats = null,
}) {
  const today = new Date();
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).format(today);

  // --- Dynamic State Managers ---
  const [serverDrafts, setServerDrafts] = useState(drafts);
  const [serverStats, setServerStats] = useState(stats);
  const [isLoading, setIsLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef(null);

  // Sync server props to local state on initial load / navigation
  useEffect(() => {
    if (drafts) setServerDrafts(drafts);
    if (stats) setServerStats(stats);
  }, [drafts, stats]);

  // --- Outside Click Handler for Date Popover ---
  useEffect(() => {
    const handler = (e) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // --- Core Async Fetch Pipeline ---
  const fetchFilteredData = async (pageTarget = 1, { silent = false } = {}) => {
    if (!silent) setIsLoading(true);
    try {
      const response = await axios.get(route('sprf.entry.list'), {
        params: {
          page: pageTarget,
          search: search || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        },
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          Accept: 'application/json',
        },
      });

      setServerDrafts(response.data.drafts);
      setServerStats(response.data.stats);
    } catch (error) {
      console.error('Filtering error payload exception: ', error);
      if (!silent) toast.error('Failed to load filtered drafts.');
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced listener for search/filter inputs
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchFilteredData(1);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, dateFrom, dateTo]);

  const tiles = useMemo(() => {
    const totalDrafts = serverStats?.totalDrafts ?? serverDrafts?.total ?? 0;
    const recentlyModified = serverStats?.recentlyModifiedText ?? '—';

    return [
      {
        label: 'Total Drafts',
        value: totalDrafts,
        icon: <FaFolderOpen />,
        variant: 'normal',
      },
      {
        label: 'Recently Modified',
        value: recentlyModified,
        icon: <IoTimeOutline />,
        variant: 'normal',
      },
      {
        label: 'Create New Draft',
        value: null,
        icon: <IoAddCircleOutline />,
        variant: 'action',
        onClick: () => router.visit(route('sprf.entry.create')),
      },
    ];
  }, [serverStats, serverDrafts]);

  const handleDelete = (row) => {
    const ref = row.sprf_no ?? row.id;

    toast(
      (t) => {
        const handleOutsideClick = (e) => {
          if (!e.target.closest('[data-toast]')) {
            toast.dismiss(t.id);
            document.removeEventListener('mousedown', handleOutsideClick);
          }
        };

        document.addEventListener('mousedown', handleOutsideClick);

        return (
          <span data-toast className="flex items-center gap-3">
            <span>
              Delete draft <b>{ref}</b>? This cannot be undone.
            </span>

            <button
              onClick={() => {
                toast.dismiss(t.id);
                document.removeEventListener('mousedown', handleOutsideClick);

                router.delete(route('sprf.entry.projects.destroy', row.id), {
                  preserveScroll: true,
                  onStart: () => {
                    toast.loading('Deleting draft...', { id: 'deleteDraft' });
                  },
                  onSuccess: () => {
                    toast.success('Draft deleted successfully!', { id: 'deleteDraft' });
                    fetchFilteredData(serverDrafts?.current_page ?? 1);
                  },
                  onError: () => {
                    toast.error('Delete failed. Please try again.', { id: 'deleteDraft' });
                  },
                });
              }}
              className="bg-red-500 text-white px-3 py-1 rounded text-sm"
            >
              Delete
            </button>

            <button
              onClick={() => {
                toast.dismiss(t.id);
                document.removeEventListener('mousedown', handleOutsideClick);
              }}
              className="bg-gray-300 text-gray-800 px-3 py-1 rounded text-sm"
            >
              Cancel
            </button>
          </span>
        );
      },
      {
        duration: Infinity,
        style: {
          maxWidth: '500px',
          padding: '16px 20px',
          fontSize: '15px',
        },
      }
    );
  };

  const columns = useMemo(
    () => [
      {
        key: 'sprf_no',
        header: 'SPRF #',
        cell: (r) =>
          r.isSkeleton ? (
            <div className="h-4 w-20 bg-slate-200/80 rounded animate-pulse" />
          ) : (
            <span className="text-[#195c00] font-semibold">
              {r.sprf_no ?? '—'}
            </span>
          ),
      },
      {
        key: 'sub_category',
        header: <div className="text-center w-full">SUB CATEGORY</div>,
        cell: (r) =>
          r.isSkeleton ? (
            <div className="h-4 w-24 bg-slate-200/80 rounded animate-pulse mx-auto" />
          ) : (
            <span className="font-medium flex justify-center items-center">
              {r.sub_category ?? '—'}
            </span>
          ),
      },
      {
        key: 'company_name',
        header: <div className="text-center w-full">ACCOUNT</div>,
        cell: (r) =>
          r.isSkeleton ? (
            <div className="h-4 w-32 bg-slate-200/80 rounded animate-pulse mx-auto" />
          ) : (
            <span className="font-medium flex justify-center items-center">
              {r.company_name ?? '—'}
            </span>
          ),
      },
      {
        key: 'account_manager',
        header: <div className="text-center w-full">ACCOUNT MANAGER</div>,
        cell: (r) =>
          r.isSkeleton ? (
            <div className="h-4 w-28 bg-slate-200/80 rounded animate-pulse mx-auto" />
          ) : (
            <span className="font-medium flex justify-center items-center">
              {r.account_manager ?? '—'}
            </span>
          ),
      },
      {
        key: 'last_saved_at',
        header: <div className="text-center w-full">LAST SAVED</div>,
        cell: (r) =>
          r.isSkeleton ? (
            <div className="h-4 w-16 bg-slate-200/80 rounded animate-pulse mx-auto" />
          ) : (
            <span className="flex justify-center items-center text-[11px] text-slate-500">
              {formatLastSaved(r.last_saved_at)}
            </span>
          ),
      },
      {
        key: 'status',
        header: <div className="text-center w-full">STATUS</div>,
        cell: (row) => {
          if (row.isSkeleton) {
            return <div className="h-5 w-20 bg-slate-200/80 rounded-full animate-pulse mx-auto" />;
          }

          const isReturned = row.status === 'returned';

          return (
            <div className="flex justify-center items-center">
              <span
                className={`px-2 rounded-full text-[9px] font-bold uppercase tracking-wider md:text-[8px] md:px-1 lg:text-[9px] lg:px-[6px] xl:text-[10px] xl:px-2 border ${
                  isReturned
                    ? 'bg-red-100 text-red-700 border-red-200'
                    : 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]'
                }`}
              >
                {row.status ?? '—'}
              </span>
            </div>
          );
        },
      },
      {
        key: 'actions',
        header: <div className="text-center w-full">ACTIONS</div>,
        cell: (r) =>
          r.isSkeleton ? (
            <div className="flex justify-center items-center gap-2">
              <div className="h-7 w-8 bg-slate-200/80 rounded-md animate-pulse" />
              <div className="h-7 w-8 bg-slate-200/80 rounded-md animate-pulse" />
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 md:gap-1">
              <button
                className="py-2 md:px-1 md:py-1 rounded-md border border-[#B5EBA2]/70 bg-[#B5EBA2]/35 text-[#289800] font-semibold"
                onClick={() => router.visit(route('sprf.entry.projects.show', r.id))}
              >
                <MdEdit className="text-[10px] md:text-xs lg:text-sm xl:text-base" />
              </button>

              <button
                className="px-2 py-2 md:px-1 md:py-1 rounded-md border border-[#F27373] text-red-500 font-semibold hover:bg-[#F27373]/10"
                onClick={() => handleDelete(r)}
              >
                <MdDelete className="text-[10px] md:text-xs lg:text-sm xl:text-base" />
              </button>
            </div>
          ),
      },
    ],
    [serverDrafts]
  );

  // Show skeleton rows while loading, otherwise real data
  const rows = useMemo(() => {
    if (isLoading) {
      return Array.from({ length: 5 }, (_, index) => ({
        id: `skeleton-row-${index}`,
        isSkeleton: true,
      }));
    }
    return serverDrafts?.data ?? [];
  }, [isLoading, serverDrafts]);

  const pagination =
    serverDrafts && typeof serverDrafts.current_page === 'number'
      ? {
          page: serverDrafts.current_page,
          perPage: serverDrafts.per_page ?? 10,
          total: serverDrafts.total ?? rows.length,
          onPageChange: (p) => fetchFilteredData(p),
        }
      : null;

  // Helpers for date filter display
  const hasDateFilter = dateFrom || dateTo;
  const dateLabel = (() => {
    if (dateFrom && dateTo) return `${formatDateLabel(dateFrom)} – ${formatDateLabel(dateTo)}`;
    if (dateFrom) return `From ${formatDateLabel(dateFrom)}`;
    if (dateTo) return `Until ${formatDateLabel(dateTo)}`;
    return null;
  })();

  const handleDateClear = () => {
    setDateFrom('');
    setDateTo('');
    setShowDatePicker(false);
  };

  // --- Search Control Bar ---
  const searchControl = (
    <div className="flex flex-row items-center gap-1.5 min-w-0 w-full sm:w-auto">
      <div className="relative h-6 flex items-center min-w-0 flex-1 sm:flex-none">
        <MdSearch className="absolute left-2.5 text-slate-400 text-base pointer-events-none z-10" />
        <input
          type="text"
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 w-full sm:w-52 min-w-0 pl-8 pr-3 text-[13px] border border-gray-200 rounded-lg bg-white text-black placeholder:text-slate-400
            outline-none focus:ring-0 focus:border-[#289800]
            transition-[border-color,box-shadow] duration-150"
        />
      </div>

      <div className="relative h-6 flex items-center flex-shrink-0">
        <MdOutlineFilterAlt className="absolute left-2.5 text-slate-400 text-sm pointer-events-none z-10" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-8 w-28 sm:w-32 pl-8 pr-6 py-0 text-[13px] border border-gray-200 rounded-lg bg-white text-black appearance-none cursor-pointer
            flex items-center outline-none focus:ring-0 focus:border-[#289800]
            transition-[border-color,box-shadow] duration-150"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="returned">Returned</option>
          <option value="withdrawn">Withdrawn</option>
        </select>
      </div>

      <div className="relative flex-shrink-0" ref={datePickerRef}>
        <button
          type="button"
          onClick={() => setShowDatePicker((p) => !p)}
          className={`h-8 flex items-center gap-1.5 px-2.5 text-[13px] font-medium border rounded-lg transition-all duration-150 whitespace-nowrap outline-none focus:ring-0 focus:border-[#289800]
            ${hasDateFilter
              ? 'border-[#4FA34E]/40 bg-[#E9F7E7] text-[#2DA300]'
              : 'border-gray-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-gray-300'
            }`}
        >
          <MdDateRange size={15} className={hasDateFilter ? 'text-[#4FA34E]' : 'text-slate-400'} />
          {hasDateFilter && (
            <span className="hidden sm:inline text-[12px] max-w-[180px] truncate">{dateLabel}</span>
          )}
          {hasDateFilter && (
            <span
              className="ml-0.5 flex items-center text-[#2DA300] hover:text-red-400 transition-colors"
              onMouseDown={(e) => { e.stopPropagation(); handleDateClear(); }}
            >
              <MdClose size={13} />
            </span>
          )}
        </button>

        {showDatePicker && (
          <div className="absolute right-0 top-11 z-50 w-64 bg-white border border-gray-200 rounded-2xl shadow-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <MdDateRange size={16} className="text-[#4FA34E]" />
              <span className="text-[12px] font-semibold text-slate-700 tracking-wide">Filter by Date</span>
            </div>
            <div className="space-y-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full h-8 px-2 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:border-[#4FA34E]"
              />
              <input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full h-8 px-2 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:border-[#4FA34E]"
              />
            </div>
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={handleDateClear}
                className="flex-1 h-8 text-[11px] font-medium border border-gray-200 rounded-lg text-slate-500 hover:bg-slate-50"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setShowDatePicker(false)}
                className="flex-1 h-8 text-[11px] font-semibold rounded-lg text-white bg-[#4FA34E] hover:bg-[#3d8f3c]"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <Head title="SPRF Entry" />

      <div className="min-h-screen flex flex-col">
        <div className="flex-1 pb-24">
          <div className="px-2 pt-8 pb-3 flex justify-between mx-10 md:mx-4 lg:mx-5 xl:mx-10">
            <div className="flex gap-1">
              <h1 className="font-semibold mt-3">Project SPRF</h1>
              <p className="mt-3">/</p>
              <p className="text-3xl font-semibold">Entry</p>
            </div>

            <div className="flex flex-col gap-1 items-end">
              <h1 className="text-xs text-right text-slate-500">{formattedDate}</h1>
            </div>
          </div>

          <ProjectListSection
            tiles={tiles}
            tableTitle="In-Progress Drafts"
            columns={columns}
            rows={rows}
            rowKey={(r) => String(r.id)}
            pagination={isLoading ? null : pagination}
            searchControl={searchControl}
            emptyText={isLoading ? 'Loading records...' : 'No matching records found.'}
          />
        </div>

        <Toaster />
        <FlashMessages />
      </div>
    </>
  );
}

SprfEntryList.layout = (page) => <AuthenticatedLayout children={page} />;