import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

function Index({ companies, filters }) {
    // Sync local state with backend filtering attributes
    const [searchState, setSearchState] = useState({
        search: filters.search || '',
        category: filters.category || '',
        type: filters.type || '',
        status: filters.status || '',
        per_page: filters.per_page || 12,
    });

    // Helper function to fire off updated query configurations to Laravel
    const updateFilters = (newFilters) => {
        const updated = { ...searchState, ...newFilters };
        setSearchState(updated);

        // Sends an elegant partial reload request back to the current route path
        router.get('/customerinfo/companies', updated, {
            preserveState: true,
            replace: true,
        });
    };

    return (
        <div style={{ padding: '24px', fontFamily: 'sans-serif', backgroundColor: '#111827', color: '#f3f4f6', minHeight: '100vh' }}>
            <Head title="Company Directory" />

            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>Company Directory</h1>

                {/* Filter Toolbar controls */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input
                        type="text"
                        placeholder="Search name, SAP code, address..."
                        value={searchState.search}
                        onChange={(e) => updateFilters({ search: e.target.value })}
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#1f2937', color: '#fff', minWidth: '250px' }}
                    />

                    <select
                        value={searchState.status}
                        onChange={(e) => updateFilters({ status: e.target.value })}
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#1f2937', color: '#fff' }}
                    >
                        <option value="">All Statuses</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>

                    {/* Numeric Input Filter for Items Per Page */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label htmlFor="per_page" style={{ fontSize: '14px', color: '#9ca3af' }}>
                            Items per page:
                        </label>
                        <input
                            id="per_page"
                            type="number"
                            min="1"
                            max="100"
                            value={searchState.per_page}
                            // Updates local state layout instantly on keystroke so user sees what they type
                            onChange={(e) => setSearchState({ ...searchState, per_page: e.target.value })}
                            // Only fires network requests when focus shifts away from the input element
                            onBlur={(e) => {
                                let val = parseInt(e.target.value, 10);
                                if (isNaN(val) || val < 1) val = 12; // safety fallback
                                if (val > 100) val = 100;            // matching reasonable limit caps
                                updateFilters({ per_page: val });
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.target.blur(); // Forces onBlur execution cleanly
                                }
                            }}
                            style={{ 
                                padding: '8px 12px', 
                                borderRadius: '6px', 
                                border: '1px solid #374151', 
                                backgroundColor: '#1f2937', 
                                color: '#fff',
                                width: '75px',
                                textAlign: 'center'
                            }}
                        />
                    </div>
                </div>

                {/* Companies Data Table */}
                <div style={{ backgroundColor: '#1f2937', borderRadius: '8px', overflow: 'hidden', border: '1px solid #374151' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#111827', borderBottom: '1px solid #374151' }}>
                                <th style={{ padding: '12px' }}>Company Name</th>
                                <th style={{ padding: '12px' }}>SAP Code</th>
                                <th style={{ padding: '12px' }}>Category</th>
                                <th style={{ padding: '12px' }}>Type</th>
                                <th style={{ padding: '12px' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {companies.data.length > 0 ? (
                                companies.data.map((company) => (
                                    <tr key={company.id} style={{ borderBottom: '1px solid #374151', cursor: 'pointer' }} onClick={() => router.get(`/customerinfo/companies/${company.id}`)}>
                                        <td style={{ padding: '12px', fontWeight: '500' }}>{company.company_name}</td>
                                        <td style={{ padding: '12px', color: '#9ca3af' }}>{company.sap_code || '—'}</td>
                                        <td style={{ padding: '12px' }}>{company.client_category || '—'}</td>
                                        <td style={{ padding: '12px' }}>{company.client_type || '—'}</td>
                                        <td style={{ padding: '12px' }}>
                                            <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', backgroundColor: company.status === 'Active' ? '#065f46' : '#991b1b', color: '#fff' }}>
                                                {company.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>No company records found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                    {companies.links.map((link, index) => (
                        <button
                            key={index}
                            disabled={!link.url || link.active}
                            onClick={() => router.get(link.url, searchState, { preserveState: true })}
                            dangerouslySetInnerHTML={{ __html: link.label }}
                            style={{
                                padding: '8px 12px',
                                borderRadius: '6px',
                                border: '1px solid #374151',
                                backgroundColor: link.active ? '#2563eb' : '#1f2937',
                                color: link.active ? '#fff' : !link.url ? '#4b5563' : '#d1d5db',
                                cursor: link.url && !link.active ? 'pointer' : 'default',
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

export default Index;

// Attach the main layout component persistence block
Index.layout = (page) => <AuthenticatedLayout children={page} />;