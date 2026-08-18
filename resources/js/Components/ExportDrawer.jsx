import React, { useState, useEffect } from 'react';
import { route } from 'ziggy-js';
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerFooter,
    DrawerClose,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export default function ExportDrawer({
    open,
    onOpenChange,
    title = 'Export Data',
    description = 'Export everything, or narrow it down by filters below.',
    exportRoute,
    searchState = {},
    statusOptions = [],
    typeOptions = [],
    showTypeFilter = true,
    typeLabel = 'Types',
    statusNote = null, // 👈 New prop for notes under status
    extraParams = {},
    delsanOptions = [
        { id: 'DBIC', name: 'DBIC' },
        { id: 'DOSC', name: 'DOSC' },
        { id: 'DDTC', name: 'DDTC' },
    ],
}) {
    const [drawerDirection, setDrawerDirection] = useState('bottom');
    const [exportDelsan, setExportDelsan] = useState('');
    const [exportTypes, setExportTypes] = useState([]);
    const [exportStatuses, setExportStatuses] = useState([]);

    // Responsive drawer direction
    useEffect(() => {
        const mql = window.matchMedia('(min-width: 768px)');
        const update = () => {
            setDrawerDirection((prev) => {
                const next = mql.matches ? 'right' : 'bottom';
                if (next !== prev) onOpenChange(false);
                return next;
            });
        };
        update();
        mql.addEventListener('change', update);
        return () => mql.removeEventListener('change', update);
    }, [onOpenChange]);

    // Pre-fill drawer selections when opened
    useEffect(() => {
        if (open) {
            const currentDelsan = Array.isArray(searchState.delsan_company)
                ? searchState.delsan_company[0] || ''
                : searchState.delsan_company || '';
            setExportDelsan(currentDelsan);

            const activeTypes = Array.isArray(searchState.type)
                ? searchState.type.map(String)
                : Array.isArray(searchState.category)
                ? searchState.category.map(String)
                : [];
            setExportTypes(activeTypes);

            const activeStatuses = Array.isArray(searchState.status)
                ? searchState.status.map(String)
                : typeof searchState.status === 'string' && searchState.status !== ''
                ? searchState.status.split(',')
                : [];
            setExportStatuses(activeStatuses);
        }
    }, [open, searchState]);

    const toggleType = (id) => {
        const strId = String(id);
        setExportTypes((prev) =>
            prev.includes(strId) ? prev.filter((v) => v !== strId) : [...prev, strId]
        );
    };

    const toggleStatus = (id) => {
        const strId = String(id);
        setExportStatuses((prev) =>
            prev.includes(strId) ? prev.filter((v) => v !== strId) : [...prev, strId]
        );
    };

    const runExport = ({ all = false } = {}) => {
        if (!exportRoute) return;

        const params = new URLSearchParams();
        params.set('search', '');

        Object.entries(extraParams).forEach(([key, val]) => {
            if (val !== undefined && val !== null) {
                params.set(key, String(val));
            }
        });

        if (all) {
            params.set('delsan_company', '');
            params.set('status', 'all');
        } else {
            params.set('delsan_company', exportDelsan || '');
            exportTypes.forEach((t) => params.append('type[]', t));
            exportStatuses.forEach((s) => params.append('status[]', s));
        }

        params.set('sort_by', searchState.sort_by || '');
        params.set('sort_order', searchState.sort_order || '');

        window.location.href = `${route(exportRoute)}?${params.toString()}`;
        onOpenChange(false);
    };

    return (
        <Drawer open={open} onOpenChange={onOpenChange} direction={drawerDirection}>
            <DrawerContent className=" flex flex-col">
                <div className="mx-auto w-full max-w-2xl flex flex-col min-h-0 flex-1">
                    <DrawerHeader>
                        <DrawerTitle>{title}</DrawerTitle>
                        <DrawerDescription>{description}</DrawerDescription>
                    </DrawerHeader>

                    <div className="px-5 pb-2 shrink-0">
                        <Button
                            type="button"
                            variant="secondary"
                            className="w-full"
                            onClick={() => runExport({ all: true })}
                        >
                            Export All
                        </Button>
                    </div>

                    <div className="px-5 py-2 flex items-center gap-2 shrink-0">
                        <div className="h-px flex-1 bg-gray-200" />
                        <span className="text-xs text-slate-400">or customize</span>
                        <div className="h-px flex-1 bg-gray-200" />
                    </div>

                    <div className="px-5 flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto">
                        {/* Delsan Company */}
                        <div className="space-y-1.5">
                            <Label>Delsan Company</Label>
                            <Select
                                value={exportDelsan || 'all'}
                                onValueChange={(v) => setExportDelsan(v === 'all' ? '' : v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All Delsan" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Delsan</SelectItem>
                                    {delsanOptions.map((opt) => (
                                        <SelectItem key={opt.id} value={opt.id}>
                                            {opt.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Statuses */}
                        {statusOptions.length > 0 && (
                            <div className="space-y-1.5">
                                <Label>Status</Label>
                                <div className="space-y-2 md:space-y-1.5">
                                    {statusOptions.map((s) => (
                                        <div key={s.id} className="flex items-center gap-2">
                                            <Checkbox
                                                id={`export-status-${s.id}`}
                                                checked={exportStatuses.includes(String(s.id))}
                                                onCheckedChange={() => toggleStatus(s.id)}
                                            />
                                            <Label
                                                htmlFor={`export-status-${s.id}`}
                                                className="font-normal text-[13px] md:text-sm"
                                            >
                                                {s.name}
                                            </Label>
                                        </div>
                                    ))}
                                </div>

                                {/* Render status note if provided */}
                                {statusNote && (
                                    <p className="text-[11px] text-slate-400 mt-2 leading-snug">
                                        {statusNote}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Contract Types / Categories */}
                        {showTypeFilter && (
                            <div className="space-y-1.5">
                                <Label>{typeLabel}</Label>
                                <div className="space-y-2 md:space-y-1.5">
                                    {typeOptions.map((t) => (
                                        <div key={t.id} className="flex items-center gap-2">
                                            <Checkbox
                                                id={`export-type-${t.id}`}
                                                checked={exportTypes.includes(String(t.id))}
                                                onCheckedChange={() => toggleType(t.id)}
                                            />
                                            <Label
                                                htmlFor={`export-type-${t.id}`}
                                                className="font-normal text-[13px] md:text-sm"
                                            >
                                                {t.name}
                                            </Label>
                                        </div>
                                    ))}
                                    {typeOptions.length === 0 && (
                                        <p className="text-xs text-slate-400">
                                            No {typeLabel.toLowerCase()} available.
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                        
                    </div>

                    <DrawerFooter className="shrink-0">
                        <Button type="button" onClick={() => runExport({ all: false })}>
                            Export Selected
                        </Button>
                        <DrawerClose asChild>
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </DrawerClose>
                    </DrawerFooter>
                </div>
            </DrawerContent>
        </Drawer>
    );
}