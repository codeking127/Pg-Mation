export default function StatCard({ label, value, icon: Icon, color = 'primary', trend }) {
    const colors = {
        primary: 'from-primary-600/20 to-primary-800/10 border-primary-700/30 text-primary-400',
        emerald: 'from-emerald-600/20 to-emerald-800/10 border-emerald-700/30 text-emerald-400',
        amber: 'from-amber-600/20 to-amber-800/10 border-amber-700/30 text-amber-400',
        red: 'from-red-600/20 to-red-800/10 border-red-700/30 text-red-400',
        blue: 'from-blue-600/20 to-blue-800/10 border-blue-700/30 text-blue-400',
        violet: 'from-violet-600/20 to-violet-800/10 border-violet-700/30 text-violet-400',
    }
    const cls = colors[color] || colors.primary

    return (
        <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${cls} p-5 transition-transform hover:scale-[1.02] duration-200`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
                    <p className="mt-2 text-3xl font-bold text-white">{value ?? '—'}</p>
                    {trend && <p className="mt-1 text-xs text-slate-500">{trend}</p>}
                </div>
                {Icon && (
                    <div className="p-2.5 rounded-xl bg-white/5">
                        <Icon className="w-6 h-6" />
                    </div>
                )}
            </div>
        </div>
    )
}
