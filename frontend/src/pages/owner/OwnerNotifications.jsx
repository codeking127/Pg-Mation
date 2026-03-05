import { useState, useEffect } from 'react'
import { notificationService } from '../../services/api'
import {
    Bell, Send, Settings, Users, Phone, CheckCircle2,
    XCircle, Loader2, AlertTriangle, Calendar, ToggleLeft, ToggleRight
} from 'lucide-react'

export default function OwnerNotifications() {
    const [settings, setSettings] = useState({ reminder_start_day: 1, reminder_end_day: 10, enabled: true })
    const [tenants, setTenants] = useState([])
    const [loadingSettings, setLoadingSettings] = useState(true)
    const [loadingTenants, setLoadingTenants] = useState(true)
    const [saving, setSaving] = useState(false)
    const [sending, setSending] = useState(false)
    const [saveSuccess, setSaveSuccess] = useState(false)
    const [sendResult, setSendResult] = useState(null)
    const [error, setError] = useState('')

    useEffect(() => {
        notificationService.getSettings()
            .then(res => setSettings(res.data.settings))
            .catch(() => { })
            .finally(() => setLoadingSettings(false))

        notificationService.getTenants()
            .then(res => setTenants(res.data.tenants || []))
            .catch(() => { })
            .finally(() => setLoadingTenants(false))
    }, [])

    const handleSaveSettings = async () => {
        setError('')
        setSaveSuccess(false)
        if (settings.reminder_start_day > settings.reminder_end_day) {
            setError('Start day must be less than or equal to end day.')
            return
        }
        setSaving(true)
        try {
            const res = await notificationService.saveSettings({
                reminder_start_day: Number(settings.reminder_start_day),
                reminder_end_day: Number(settings.reminder_end_day),
                enabled: settings.enabled,
            })
            setSettings(res.data.settings)
            setSaveSuccess(true)
            setTimeout(() => setSaveSuccess(false), 3000)
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save settings.')
        } finally {
            setSaving(false)
        }
    }

    const handleSendNow = async () => {
        setSendResult(null)
        setError('')
        setSending(true)
        try {
            const res = await notificationService.sendNow()
            setSendResult(res.data)
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send reminders.')
        } finally {
            setSending(false)
        }
    }

    // IST date info
    const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
    const todayDay = nowIST.getDate()
    const monthName = nowIST.toLocaleString('en-IN', { month: 'long', year: 'numeric' })
    const isWindowActive = settings.enabled && todayDay >= settings.reminder_start_day && todayDay <= settings.reminder_end_day

    const tenantsWithPhone = tenants.filter(t => t.phone)
    const tenantsWithoutPhone = tenants.filter(t => !t.phone)

    return (
        <div className="space-y-6 animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="page-title flex items-center gap-2">
                        <Bell className="w-6 h-6 text-primary-400" />
                        Rent Reminders
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Send automatic WhatsApp reminders to tenants to pay rent via cash
                    </p>
                </div>
                {/* Send Now Button */}
                <button
                    onClick={handleSendNow}
                    disabled={sending || tenants.length === 0}
                    className="btn-primary flex items-center gap-2 px-5 py-2.5"
                >
                    {sending
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Send className="w-4 h-4" />
                    }
                    {sending ? 'Sending...' : 'Send Reminder Now'}
                </button>
            </div>

            {/* Send Result Toast */}
            {sendResult && (
                <div className={`rounded-xl p-4 border flex items-start gap-3 animate-slide-up ${sendResult.errors?.length ? 'bg-amber-500/10 border-amber-500/30' : 'bg-emerald-500/10 border-emerald-500/30'
                    }`}>
                    {sendResult.errors?.length
                        ? <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                        : <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    }
                    <div>
                        <p className="font-semibold text-white">{sendResult.message}</p>
                        {sendResult.errors?.length > 0 && (
                            <ul className="mt-2 space-y-1">
                                {sendResult.errors.map((e, i) => (
                                    <li key={i} className="text-xs text-amber-300">{e}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <button onClick={() => setSendResult(null)} className="ml-auto text-slate-500 hover:text-slate-300">
                        <XCircle className="w-4 h-4" />
                    </button>
                </div>
            )}

            {error && (
                <div className="rounded-xl p-4 border bg-red-500/10 border-red-500/30 text-red-400 text-sm flex items-center gap-2">
                    <XCircle className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Settings Card */}
                <div className="card space-y-5 lg:col-span-1">
                    <div className="flex items-center gap-2 mb-1">
                        <Settings className="w-4 h-4 text-primary-400" />
                        <h2 className="font-semibold text-white">Reminder Schedule</h2>
                    </div>

                    {loadingSettings ? (
                        <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary-400" /></div>
                    ) : (
                        <>
                            {/* Enable / Disable Toggle */}
                            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                                <div>
                                    <p className="text-sm font-medium text-white">Auto Reminders</p>
                                    <p className="text-xs text-slate-400">Send daily at 9:00 AM IST</p>
                                </div>
                                <button
                                    onClick={() => setSettings(s => ({ ...s, enabled: !s.enabled }))}
                                    className="transition-colors"
                                >
                                    {settings.enabled
                                        ? <ToggleRight className="w-8 h-8 text-emerald-400" />
                                        : <ToggleLeft className="w-8 h-8 text-slate-500" />
                                    }
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="label">Start Day of Month</label>
                                    <input
                                        type="number"
                                        min={1} max={28}
                                        className="input"
                                        value={settings.reminder_start_day}
                                        onChange={e => setSettings(s => ({ ...s, reminder_start_day: e.target.value }))}
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Reminder starts on this day each month</p>
                                </div>
                                <div>
                                    <label className="label">End Day of Month</label>
                                    <input
                                        type="number"
                                        min={1} max={28}
                                        className="input"
                                        value={settings.reminder_end_day}
                                        onChange={e => setSettings(s => ({ ...s, reminder_end_day: e.target.value }))}
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Reminder stops after this day each month</p>
                                </div>
                            </div>

                            <button
                                onClick={handleSaveSettings}
                                disabled={saving}
                                className="btn-primary w-full flex items-center justify-center gap-2"
                            >
                                {saving
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : saveSuccess
                                        ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                        : <Settings className="w-4 h-4" />
                                }
                                {saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Settings'}
                            </button>
                        </>
                    )}
                </div>

                {/* Status + Tenants */}
                <div className="space-y-6 lg:col-span-2">
                    {/* Today's Status */}
                    <div className={`rounded-xl p-5 border flex items-center gap-4 ${isWindowActive
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : 'bg-slate-900 border-slate-800'
                        }`}>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isWindowActive ? 'bg-emerald-500/20' : 'bg-slate-800'
                            }`}>
                            <Calendar className={`w-6 h-6 ${isWindowActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                        </div>
                        <div>
                            <p className="font-semibold text-white">
                                {isWindowActive ? '✅ Reminders Active Today' : '⏸ Reminders Inactive Today'}
                            </p>
                            <p className="text-sm text-slate-400 mt-0.5">
                                Today is <strong className="text-white">Day {todayDay}</strong> of {monthName}.
                                {settings.enabled
                                    ? ` Your window: Day ${settings.reminder_start_day} – Day ${settings.reminder_end_day}.`
                                    : ' Auto reminders are currently disabled.'}
                            </p>
                            {isWindowActive && (
                                <p className="text-xs text-emerald-400 mt-1">
                                    WhatsApp messages will be sent at 9:00 AM IST automatically.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Tenant List */}
                    <div className="card">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-primary-400" />
                                <h2 className="font-semibold text-white">Tenants</h2>
                            </div>
                            <div className="flex gap-3 text-xs">
                                <span className="text-emerald-400 font-medium">{tenantsWithPhone.length} will receive</span>
                                {tenantsWithoutPhone.length > 0 && (
                                    <span className="text-amber-400">{tenantsWithoutPhone.length} no phone</span>
                                )}
                            </div>
                        </div>

                        {loadingTenants ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
                            </div>
                        ) : tenants.length === 0 ? (
                            <p className="text-center text-slate-500 py-8">No tenants found for your PGs.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Tenant</th>
                                            <th>PG</th>
                                            <th>Room / Bed</th>
                                            <th>WhatsApp</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tenants.map((t, i) => (
                                            <tr key={i}>
                                                <td>
                                                    <div className="font-medium text-white">{t.tenant_name}</div>
                                                </td>
                                                <td className="text-slate-300">{t.pg_name}</td>
                                                <td className="text-slate-400 text-sm">
                                                    {t.room_number
                                                        ? `Room ${t.room_number} • ${t.bed_number}`
                                                        : <span className="text-slate-600">—</span>
                                                    }
                                                </td>
                                                <td>
                                                    {t.phone ? (
                                                        <span className="flex items-center gap-1.5 text-emerald-400 text-sm">
                                                            <Phone className="w-3 h-3" />
                                                            {t.phone}
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1.5 text-amber-500 text-xs">
                                                            <AlertTriangle className="w-3 h-3" />
                                                            No phone — will be skipped
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Message Preview */}
                    <div className="card bg-slate-900">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 font-semibold">Message Preview</p>
                        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 text-sm text-slate-200 leading-relaxed font-mono">
                            Dear [Tenant Name],<br /><br />
                            This is a friendly reminder to please pay your rent for{' '}
                            <span className="text-primary-400">{monthName}</span>{' '}
                            via Cash at your earliest convenience.<br /><br />
                            Thanks in Advance!<br />
                            — [PG Name] Management
                        </div>
                        <p className="text-xs text-slate-500 mt-3">
                            Each tenant receives a personalised version of this message on WhatsApp.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
