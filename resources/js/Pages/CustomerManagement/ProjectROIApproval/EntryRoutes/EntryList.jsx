  import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
  import React, { useMemo, useState, useEffect, useRef } from "react";
  import { Head, router } from "@inertiajs/react";
  import { route } from "ziggy-js";
  import ProjectListSection from "@/Components/roi/ProjectListSection";
  import { toast } from 'sonner';
  import axios from 'axios';

  // Icons matched perfectly
  import { FaFolderOpen } from "react-icons/fa";
  import { IoTimeOutline, IoAddCircleOutline } from "react-icons/io5";
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

  export default function EntryList({
    drafts = null, // expected initial page layout props
    stats = null,  
  }) {
    const today = new Date();
    const formattedDate = new Intl.DateTimeFormat("en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    }).format(today);

    // --- Dynamic State Managers ---
    const [serverDrafts, setServerDrafts] = useState(drafts);
    const [serverStats, setServerStats] = useState(stats);
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [showDatePicker, setShowDatePicker] = useState(false);
    const datePickerRef = useRef(null);

    // Sync server props context to local component lifecycle hooks state initially
    useEffect(() => {
      if (drafts) setServerDrafts(drafts);
      if (stats) setServerStats(stats);
    }, [drafts, stats]);

    // --- Outside Click Handler for Modal Popovers ---
    useEffect(() => {
      const handler = (e) => {
        if (datePickerRef.current && !datePickerRef.current.contains(e.target)) {
          setShowDatePicker(false);
        }
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, []);

    // --- Core Async Axios Fetch Pipeline Engine ---
    const fetchFilteredData = async (pageTarget = 1, { silent = false } = {}) => {
      if (!silent) setIsLoading(true);
      else setIsRefreshing(true);
      try {
          const response = await axios.get(route("roi.entry.list"), {
              params: {
                  page: pageTarget,
                  search: search || undefined,
                  status: statusFilter !== 'all' ? statusFilter : undefined,
                  date_from: dateFrom || undefined,
                  date_to: dateTo || undefined,
              },
              headers: {
                  'X-Requested-With': 'XMLHttpRequest',
                  'Accept': 'application/json'
              }
          });

          setServerDrafts(response.data.drafts);
          setServerStats(response.data.stats);
      } catch (error) {
          console.error("Filtering error payload exception: ", error);
          if (!silent) toast.error("Failed to load filtered drafts.");
      } finally {
          setIsLoading(false);
          setIsRefreshing(false);
      }
    };

    // Debounced listener engine parsing state parameters
    useEffect(() => {
      const delayDebounceFn = setTimeout(() => {
        fetchFilteredData(1); // Reset to page 1 on search input configurations
      }, 300);

      return () => clearTimeout(delayDebounceFn);
    }, [search, statusFilter, dateFrom, dateTo]);

    // --- Auto-refresh every 60 seconds ---
    useEffect(() => {
        const interval = setInterval(() => {
            fetchFilteredData(serverDrafts?.current_page ?? 1, { silent: true } );
        }, 60_000);

        return () => clearInterval(interval);
    }, [search, statusFilter, dateFrom, dateTo, serverDrafts?.current_page]);

    // --- Tiles Setup ---
    const tiles = useMemo(() => {
      const totalDrafts = serverStats?.totalDrafts ?? serverDrafts?.total ?? 0;
      const recentlyModified = serverStats?.recentlyModifiedText ?? "—";

      return [
        {
          label: "Total Drafts",
          value: totalDrafts,
          icon: <FaFolderOpen />,
          variant: "normal",
        },
        {
          label: "Recently Modified",
          value: recentlyModified,
          icon: <IoTimeOutline />,
          variant: "normal",
        },
        {
          label: "Create New Draft",
          value: null,
          icon: <IoAddCircleOutline />,
          variant: "action",
          onClick: () => router.visit(route("roi.entry.create")),
        },
      ];
    }, [serverStats, serverDrafts]);

    const handleDelete = (row) => {
      const ref = row.reference ?? row.id;
      const processId = `delete-${row.id}`;

      toast.custom((t) => (
        <div className="flex items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-2xl min-w-[400px]">
          <div className="flex flex-col">
            <span className="text-gray-900 font-medium">Delete draft?</span>
            <span className="text-sm text-gray-500">
              Reference: <span className="font-bold text-gray-700">{ref}</span>
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => toast.dismiss(t)}
              className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                toast.dismiss(t);
                router.delete(route("roi.entry.projects.destroy", row.id), {
                  preserveScroll: true,
                  onStart: () => toast.loading("Deleting draft...", { id: processId }),
                  onSuccess: () => {
                    toast.success("Draft deleted successfully!", { id: processId });
                    fetchFilteredData(serverDrafts?.current_page ?? 1);
                  },
                  onError: () => toast.error("Delete failed. Please try again.", { id: processId }),
                });
              }}
              className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition"
            >
              Delete
            </button>
          </div>
        </div>
      ), {
        duration: Infinity,
        position: "top-center",
        unstyled: "true"
      });
    };

    // --- Table columns configuration configuration mapping ---
    const columns = useMemo(
      () => [
        {
          key: "reference",
          header: "REFERENCE",
          cell: (r) => r.isSkeleton ? (
            <div className="h-4 w-24 bg-slate-200/80 rounded animate-pulse" />
          ) : (
            <span className="text-[#195c00] font-semibold">
              {r.reference}
            </span>
          ),
        },
        {
          key: "company_sap_code",
          header: <div className="text-center w-full">SAP CODE</div>,
          cell: (r) => r.isSkeleton ? (
            <div className="h-4 w-16 bg-slate-200/80 rounded animate-pulse mx-auto" />
          ) : (
            <span className="font-mono text-sm text-[#33721c] flex justify-center items-center">
              {r.company_sap_code ?? "—"}
            </span>
          ),
        },
        {
          key: "company_name",
          header: <div className="text-center w-full">COMPANY NAME</div>,
          cell: (r) => r.isSkeleton ? (
            <div className="h-4 w-36 bg-slate-200/80 rounded animate-pulse mx-auto" />
          ) : (
            <span className="font-medium flex justify-center items-center text-center">
              {r.company_name ?? "—"}
            </span>
          ),
        },
        {
          key: "contract_years",
          header: <div className="text-center w-full">CONTRACT TERM</div>,
          cell: (r) => r.isSkeleton ? (
            <div className="h-4 w-10 bg-slate-200/80 rounded animate-pulse mx-auto" />
          ) : (
            <span className="font-medium flex justify-center items-center">
              {r.contract_years != null ? `${r.contract_years}` : "—"}
            </span>
          ),
        },
        {
          key: "contract_type",
          header: <div className="text-center w-full">CONTRACT TYPE</div>,
          cell: (r) => r.isSkeleton ? (
            <div className="h-4 w-20 bg-slate-200/80 rounded animate-pulse mx-auto" />
          ) : (
            <span className="font-medium flex justify-center items-center text-center">
              {r.contract_type ?? "—"}
            </span>
          ),
        },
        {
          key: "last_saved_at",
          header: <div className="text-center w-full">LAST SAVED</div>,
          cell: (r) => r.isSkeleton ? (
            <div className="h-4 w-16 bg-slate-200/80 rounded animate-pulse mx-auto" />
          ) : (
            <span className="text-xs text-slate-600 flex justify-center items-center">
              {r.last_saved_display ?? "—"}
            </span>
          ),
        },
        {
          header: <div className="text-center w-full">STATUS</div>,
          key: "status",
          cell: (row) => {
            if (row.isSkeleton) {
              return (
                <div className="h-5 w-20 bg-slate-200/80 rounded-full animate-pulse mx-auto" />
              );
            }

            const statusLower = row.status?.toLowerCase() ?? '';
            const isDraft = statusLower === 'draft';
            const isSentBack = statusLower === 'returned' || statusLower === 'sent back';
            const isWithdrawn = statusLower === 'widthrawn' || statusLower === 'withdrawn';


            return (
              <div className="flex justify-center items-center">
                <span className={`
                  px-2 rounded-full text-[9px] font-bold uppercase tracking-wider      
                  md:text-[8px] md:px-1
                  lg:text-[9px] lg:px-[6px]
                  xl:text-[10px] xl:px-2
                  ${isSentBack 
                    ? "bg-red-100 text-red-700 border border-red-200" 
                    : isDraft
                    ? "bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]" 
                    : isWithdrawn
                    ? "bg-[#0565D2]/15  border-[#0565D2]/50 text-[#0565D2]" 
                    : "bg-gray-100 text-gray-700 border border-gray-200"
                  }
                `}>
                  {row.status}
                </span>
              </div>
            );
          }
        },
        {
          key: "actions",
          header: <div className="text-center w-full">ACTIONS</div>,
          cell: (r) => r.isSkeleton ? (
            <div className="flex justify-center items-center gap-2">
              <div className="h-7 w-8 bg-slate-200/80 rounded-md animate-pulse" />
              <div className="h-7 w-8 bg-slate-200/80 rounded-md animate-pulse" />
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 md:gap-1">
              <button
                className="py-2 md:px-1 md:py-1 rounded-md border border-[#B5EBA2]/70 bg-[#B5EBA2]/35 text-[#289800] font-semibold"
                onClick={() => router.visit(route("roi.entry.projects.show", r.id))}
              >
                <MdEdit className="text-[10px] md:text-xs lg:text-sm xl:text-base" />
              </button>

              <button
                className="px-2 py-2  md:px-1 md:py-1 rounded-md border border-[#F27373] text-red-500 font-semibold hover:bg-[#F27373]/10"
                onClick={() => handleDelete(r)}
              >
                <MdDelete className="text-[10px] md:text-xs lg:text-sm xl:text-base" />
              </button>
            </div>
          ),
        },
      ],
      []
    );

    // Intercepting data array mapping logic to display inline loader skeletons beautifully
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
      serverDrafts && typeof serverDrafts.current_page === "number"
        ? {
            page: serverDrafts.current_page,
            perPage: serverDrafts.per_page ?? 10,
            total: serverDrafts.total ?? rows.length,
            onPageChange: (p) => fetchFilteredData(p),
          }
        : null;

    // Helpers for structural active indicators
    const hasDateFilter = dateFrom || dateTo;
    const dateLabel = (() => {
      if (dateFrom && dateTo) return `${formatDateLabel(dateFrom)} – ${formatDateLabel(dateTo)}`;
      if (dateFrom) return `From ${formatDateLabel(dateFrom)}`;
      if (dateTo) return `Until ${formatDateLabel(dateTo)}`;
      return null;
    })();

    const handleDateClear = () => {
      setDateFrom("");
      setDateTo("");
      setShowDatePicker(false);
    };

    // --- Search Control Bar Markup Segment Layout ---
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
              focus:outline-none focus:ring-[3px] focus:ring-[#4FA34E]/15 focus:border-[#4FA34E]
              transition-[border-color,box-shadow] duration-150"
          />
        </div>

        <div className="relative h-6 flex items-center flex-shrink-0">
          <MdOutlineFilterAlt className="absolute left-2.5 text-slate-400 text-sm pointer-events-none z-10" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 w-28 sm:w-32 pl-8 pr-6 py-0 text-[13px] border border-gray-200 rounded-lg bg-white text-black appearance-none cursor-pointer
              focus:outline-none flex items-center focus:ring-[3px] focus:ring-[#4FA34E]/15 focus:border-[#4FA34E]
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
            className={`h-8 flex items-center gap-1.5 px-2.5 text-[13px] font-medium border rounded-lg transition-all duration-150 whitespace-nowrap
              ${hasDateFilter
                ? "border-[#4FA34E]/40 bg-[#E9F7E7] text-[#2DA300]"
                : "border-gray-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-gray-300"
              }`}
          >
            <MdDateRange size={15} className={hasDateFilter ? "text-[#4FA34E]" : "text-slate-400"} />
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
        <Head title="ROI Entry" />

        <div className="min-h-screen flex flex-col">
          <div className="flex-1 pb-24">
            {/* HEADER */}
            <div className="px-4 sm:px-6 lg:px-10 pt-8 pb-3 flex justify-between items-end">
              <div className="flex items-baseline gap-1">
                <h1 className="font-semibold text-sm text-slate-500 hidden sm:block">Project ROI Approval</h1>
                <span className="text-slate-400 hidden sm:block">/</span>
                <p className="text-2xl sm:text-3xl font-semibold text-slate-900">Entry</p>
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
              pagination={isLoading ? null : pagination} // Hide pagination cleanly during skeleton loads
              searchControl={searchControl}
              loading={false} // Prevents the main component section from dimming down or locking interaction layouts
              emptyText={isLoading ? "Loading records..." : "No matching records found."}
            />
          </div>
          <FlashMessages />
          
          <div className="sticky bottom-0 z-40 bg-[#FBFFFA] backdrop-blur shadow-[5px_0px_4px_0px_rgba(181,235,162,100)] border-t border-black/10">
            <div className="px-4 sm:px-10 py-3 flex items-center justify-end">
            </div>
          </div>
        </div>
      </>
    );
  }

  EntryList.layout = (page) => <AuthenticatedLayout children={page} />;