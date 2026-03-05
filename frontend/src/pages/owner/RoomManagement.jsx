import { useEffect, useState } from 'react'
import { pgService, roomService } from '../../services/api'
import { Loader2, Plus, BedDouble, Trash2 } from 'lucide-react'

export default function RoomManagement() {
    const [pgs, setPgs] = useState([])
    const [selectedPg, setSelectedPg] = useState('')
    const [rooms, setRooms] = useState([])
    const [loading, setLoading] = useState(false)
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({ room_number: '', floor: 1, total_beds: 2 })
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        pgService.getAll().then((r) => {
            setPgs(r.data.pgs)
            if (r.data.pgs.length > 0) setSelectedPg(r.data.pgs[0].id)
        })
    }, [])

    useEffect(() => {
        if (!selectedPg) return
        setLoading(true)
        roomService.getByPg(selectedPg).then((r) => setRooms(r.data.rooms)).finally(() => setLoading(false))
    }, [selectedPg])

    const handleCreate = async (e) => {
        e.preventDefault(); setSubmitting(true)
        try {
            await roomService.create(selectedPg, { ...form, floor: Number(form.floor), total_beds: Number(form.total_beds) })
            setShowForm(false)
            roomService.getByPg(selectedPg).then((r) => setRooms(r.data.rooms))
        } finally { setSubmitting(false) }
    }

    const handleDelete = async (id) => {
        if (!confirm('Delete room?')) return
        await roomService.delete(id)
        roomService.getByPg(selectedPg).then((r) => setRooms(r.data.rooms))
    }

    return (
        <div className="space-y-6 animate-slide-up">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="page-title">Room Management</h1>
                    <p className="text-slate-400 text-sm mt-1">{rooms.length} rooms</p>
                </div>
                <div className="flex gap-3">
                    <select className="input w-48" value={selectedPg} onChange={(e) => setSelectedPg(e.target.value)}>
                        {pgs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <button id="add-room-btn" onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Add Room
                    </button>
                </div>
            </div>

            {showForm && (
                <div className="card animate-slide-up">
                    <h2 className="section-title mb-4">New Room</h2>
                    <form onSubmit={handleCreate} className="grid grid-cols-3 gap-4">
                        <div><label className="label">Room Number</label><input className="input" value={form.room_number} onChange={(e) => setForm({ ...form, room_number: e.target.value })} required /></div>
                        <div><label className="label">Floor</label><input type="number" min="1" className="input" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} /></div>
                        <div><label className="label">Number of Beds</label><input type="number" min="1" max="20" className="input" value={form.total_beds} onChange={(e) => setForm({ ...form, total_beds: e.target.value })} /></div>
                        <div className="col-span-3 flex gap-2">
                            <button type="submit" id="create-room-submit" disabled={submitting} className="btn-primary flex-1">{submitting ? 'Adding...' : 'Add Room'}</button>
                            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {rooms.map((room) => (
                        <div key={room.id} className="card hover:border-slate-700 transition-colors">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-white text-lg">Room {room.room_number}</p>
                                    <p className="text-slate-400 text-sm">Floor {room.floor}</p>
                                </div>
                                <button onClick={() => handleDelete(room.id)} className="btn-danger px-2 py-1"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                            <div className="mt-4 flex items-center gap-4">
                                <div className="flex items-center gap-1.5 text-sm">
                                    <BedDouble className="w-4 h-4 text-emerald-400" />
                                    <span className="text-emerald-400 font-semibold">{room.available_beds}</span>
                                    <span className="text-slate-500">available</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-sm">
                                    <BedDouble className="w-4 h-4 text-amber-400" />
                                    <span className="text-amber-400 font-semibold">{Number(room.total_beds) - Number(room.available_beds)}</span>
                                    <span className="text-slate-500">occupied</span>
                                </div>
                            </div>
                            <div className="mt-3 flex gap-1">
                                {Array.from({ length: Number(room.total_beds) }).map((_, i) => (
                                    <div key={i}
                                        className={`h-6 flex-1 rounded-md ${i < Number(room.total_beds) - Number(room.available_beds) ? 'bg-amber-500/40' : 'bg-emerald-500/30'}`}
                                        title={i < Number(room.total_beds) - Number(room.available_beds) ? 'Occupied' : 'Available'}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
