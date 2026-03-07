import { useEffect, useState } from 'react'
import { pgService } from '../services/api'
import { Building2, Loader2 } from 'lucide-react'

/**
 * Wraps owner sub-pages. If the authenticated owner has no PG assigned yet,
 * it renders a "contact admin" screen instead of the page content.
 */
export default function NoPGGuard({ children }) {
    const [status, setStatus] = useState('loading') // 'loading' | 'has-pg' | 'no-pg'

    useEffect(() => {
        pgService.getAll()
            .then(r => setStatus(r.data.pgs.length > 0 ? 'has-pg' : 'no-pg'))
            .catch(() => setStatus('no-pg'))
    }, [])

    if (status === 'loading') {
        return (
            <div className="flex items-center justify-center h-64 mt-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
            </div>
        )
    }

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
                </div>
            </div>
        )
    }

    return children
}
