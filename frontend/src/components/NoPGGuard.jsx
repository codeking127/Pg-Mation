import { useEffect, useState, useCallback } from 'react'
import { pgService } from '../services/api'
import { Building2, Loader2, RefreshCw, AlertTriangle } from 'lucide-react'

/**
 * Wraps owner sub-pages. Checks whether the authenticated owner has at least
 * one PG assigned. Shows a "contact admin" screen (not a blocking error) if none
 * are found. Distinguishes between "no PG assigned" and an API error.
 */
export default function NoPGGuard({ children }) {
    // 'loading' | 'has-pg' | 'no-pg' | 'error'
    const [status, setStatus] = useState('loading')

    const check = useCallback(() => {
        setStatus('loading')
        pgService.getAll()
            .then(r => setStatus(r.data.pgs.length > 0 ? 'has-pg' : 'no-pg'))
            .catch(() => setStatus('error'))
    }, [])

    useEffect(() => {
        check()
    }, [check])

    // While loading, show spinner
    if (status === 'loading') {
        return (
            <div className="flex items-center justify-center h-64 mt-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
            </div>
        )
    }

    // API error — don't block the owner, show a retry option
    if (status === 'error') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 text-center px-4">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-red-400" />
                </div>
                <div>
                    <p className="text-red-400 font-semibold text-lg">Could not load property data</p>
                    <p className="text-slate-400 text-sm mt-2 max-w-sm">
                        There was a problem reaching the server. Please check your connection and try again.
                    </p>
                </div>
                <button
                    onClick={check}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-medium transition-colors"
                >
                    <RefreshCw className="w-4 h-4" /> Try Again
                </button>
            </div>
        )
    }

    // No PG assigned yet — show informational screen, not a hard block
    if (status === 'no-pg') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 text-center px-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-amber-400" />
                </div>
                <div>
                    <p className="text-amber-400 font-semibold text-lg">No property assigned yet</p>
                    <p className="text-slate-400 text-sm mt-2 max-w-sm">
                        You have not been assigned a PG property yet.<br />
                        Please contact the Administrator to assign a property to your account.
                    </p>
                    <p className="text-slate-500 text-xs mt-3">
                        Once the Admin assigns a property, click the button below.
                    </p>
                </div>
                <button
                    onClick={check}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-medium transition-colors"
                >
                    <RefreshCw className="w-4 h-4" /> Check Again
                </button>
            </div>
        )
    }

    return children
}
