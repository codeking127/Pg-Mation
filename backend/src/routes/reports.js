const express = require('express');
const ExcelJS = require('exceljs');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

const router = express.Router();
router.use(authenticate);

// Helper: style a header row
function styleHeader(row, color = '4338CA') {
    row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + color } };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = {
            bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        };
    });
}

function styleDataRow(row, isEven) {
    row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFF8F9FF' : 'FFFFFFFF' } };
        cell.alignment = { vertical: 'middle', wrapText: true };
        cell.border = { bottom: { style: 'hair', color: { argb: 'FFEEEEEE' } } };
    });
}

function setColWidths(sheet, widths) {
    sheet.columns = widths.map((w) => ({ width: w }));
}

// GET /api/reports/owner-excel
router.get('/owner-excel', authorize('OWNER', 'ADMIN'), async (req, res, next) => {
    try {
        const ownerId = req.user.role === 'ADMIN' ? req.query.owner_id || req.user.id : req.user.id;

        // ── Fetch all data ────────────────────────────────────────────────
        const [pgRes, tenantRes, rentRes, complaintRes, visitorRes, bedRes] = await Promise.all([
            pool.query(`SELECT * FROM pgs WHERE owner_id = $1`, [ownerId]),
            pool.query(`
        SELECT t.*, u.name, u.email, u.phone, p.name as pg_name,
               r.room_number, r.floor, b.bed_number,
               t.rent_amount, t.joining_date
        FROM tenants t
        JOIN users u ON u.id = t.user_id
        JOIN pgs p ON p.id = t.pg_id
        LEFT JOIN beds b ON b.id = t.bed_id
        LEFT JOIN rooms r ON r.id = b.room_id
        WHERE p.owner_id = $1
        ORDER BY p.name, r.floor, r.room_number`, [ownerId]),
            pool.query(`
        SELECT ri.*, u.name as tenant_name, p.name as pg_name
        FROM rent_invoices ri
        JOIN tenants t ON t.id = ri.tenant_id
        JOIN users u ON u.id = t.user_id
        JOIN pgs p ON p.id = t.pg_id
        WHERE p.owner_id = $1
        ORDER BY ri.month_year DESC, u.name`, [ownerId]),
            pool.query(`
        SELECT c.*, u.name as tenant_name, p.name as pg_name
        FROM complaints c
        JOIN tenants t ON t.id = c.tenant_id
        JOIN users u ON u.id = t.user_id
        JOIN pgs p ON p.id = t.pg_id
        WHERE p.owner_id = $1
        ORDER BY c.created_at DESC`, [ownerId]),
            pool.query(`
        SELECT v.*, u.name as tenant_name, p.name as pg_name
        FROM visitors v
        JOIN tenants t ON t.id = v.tenant_id
        JOIN users u ON u.id = t.user_id
        JOIN pgs p ON p.id = t.pg_id
        WHERE p.owner_id = $1
        ORDER BY v.check_in DESC LIMIT 500`, [ownerId]),
            pool.query(`
        SELECT b.*, r.room_number, r.floor, p.name as pg_name
        FROM beds b
        JOIN rooms r ON r.id = b.room_id
        JOIN pgs p ON p.id = r.pg_id
        WHERE p.owner_id = $1`, [ownerId]),
        ]);

        const pgs = pgRes.rows;
        const tenants = tenantRes.rows;
        const invoices = rentRes.rows;
        const complaints = complaintRes.rows;
        const visitors = visitorRes.rows;
        const beds = bedRes.rows;

        // ── Analytics ─────────────────────────────────────────────────────
        const totalBeds = beds.length;
        const occupiedBeds = beds.filter((b) => b.status === 'OCCUPIED').length;
        const totalRentExpected = tenants.reduce((s, t) => s + Number(t.rent_amount), 0);
        const totalCollected = invoices.filter((i) => i.paid).reduce((s, i) => s + Number(i.amount), 0);
        const totalOutstanding = invoices.filter((i) => !i.paid).reduce((s, i) => s + Number(i.amount), 0);
        const openComplaints = complaints.filter((c) => c.status === 'OPEN').length;

        // ── Build Workbook ─────────────────────────────────────────────────
        const wb = new ExcelJS.Workbook();
        wb.creator = 'PG-Mation';
        wb.created = new Date();

        // ════════════════════════════════════════════════════════════
        // SHEET 1: Summary Dashboard
        // ════════════════════════════════════════════════════════════
        const summary = wb.addWorksheet('📊 Summary', { tabColor: { argb: 'FF4338CA' } });
        setColWidths(summary, [30, 25]);

        summary.addRow(['PG-MATION OWNER REPORT']).font = { bold: true, size: 16, color: { argb: 'FF4338CA' } };
        summary.addRow([`Generated: ${new Date().toLocaleString('en-IN')}`]).font = { color: { argb: 'FF888888' } };
        summary.addRow([]);

        [
            ['PROPERTY OVERVIEW', ''],
            ['Total Properties', pgs.length],
            ['Total Tenants', tenants.length],
            ['Total Beds', totalBeds],
            ['Occupied Beds', occupiedBeds],
            ['Available Beds', totalBeds - occupiedBeds],
            ['Occupancy Rate', `${totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0}%`],
            [],
            ['FINANCIAL SUMMARY', ''],
            ['Monthly Rent Roll (expected)', `₹${totalRentExpected.toLocaleString('en-IN')}`],
            ['Total Collected (all time)', `₹${totalCollected.toLocaleString('en-IN')}`],
            ['Total Outstanding', `₹${totalOutstanding.toLocaleString('en-IN')}`],
            ['Paid Invoices', invoices.filter((i) => i.paid).length],
            ['Unpaid Invoices', invoices.filter((i) => !i.paid).length],
            ['Collection Rate', `${invoices.length > 0 ? Math.round((invoices.filter(i => i.paid).length / invoices.length) * 100) : 0}%`],
            [],
            ['COMPLAINTS & VISITORS', ''],
            ['Total Complaints', complaints.length],
            ['Open Complaints', openComplaints],
            ['Resolved Complaints', complaints.filter((c) => c.status === 'RESOLVED').length],
            ['Total Visitor Entries', visitors.length],
        ].forEach((row, i) => {
            const r = summary.addRow(row);
            if (row[1] === '') {
                r.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
                r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4338CA' } };
                r.height = 22;
            } else if (row.length > 0) {
                r.getCell(1).font = { color: { argb: 'FF374151' } };
                r.getCell(2).font = { bold: true, color: { argb: 'FF111827' } };
                r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? 'FFF9FAFB' : 'FFFFFFFF' } };
            }
        });

        // ════════════════════════════════════════════════════════════
        // SHEET 2: Tenants
        // ════════════════════════════════════════════════════════════
        const tenantSheet = wb.addWorksheet('👥 Tenants', { tabColor: { argb: 'FF059669' } });
        setColWidths(tenantSheet, [22, 28, 16, 18, 10, 6, 12, 14, 18, 20]);
        const tenantHeader = tenantSheet.addRow([
            'Full Name', 'Email', 'Phone', 'PG Property', 'Room', 'Floor', 'Bed',
            'Monthly Rent (₹)', 'Joining Date', 'Emergency Contact'
        ]);
        tenantHeader.height = 28;
        styleHeader(tenantHeader, '059669');

        tenants.forEach((t, i) => {
            const r = tenantSheet.addRow([
                t.name, t.email, t.phone || '—', t.pg_name,
                t.room_number || '—', t.floor || '—', t.bed_number || '—',
                Number(t.rent_amount),
                t.joining_date ? new Date(t.joining_date).toLocaleDateString('en-IN') : '—',
                t.emergency_contact || '—',
            ]);
            r.getCell(8).numFmt = '₹#,##0';
            styleDataRow(r, i % 2 === 0);
        });
        tenantSheet.autoFilter = { from: 'A1', to: 'J1' };

        // ════════════════════════════════════════════════════════════
        // SHEET 3: Rent Invoices
        // ════════════════════════════════════════════════════════════
        const rentSheet = wb.addWorksheet('💰 Rent Invoices', { tabColor: { argb: 'FFD97706' } });
        setColWidths(rentSheet, [22, 18, 14, 16, 14, 10, 16]);
        const rentHeader = rentSheet.addRow([
            'Tenant Name', 'PG Property', 'Month', 'Amount (₹)', 'Due Date', 'Paid?', 'Paid On'
        ]);
        rentHeader.height = 28;
        styleHeader(rentHeader, 'D97706');

        invoices.forEach((inv, i) => {
            const r = rentSheet.addRow([
                inv.tenant_name, inv.pg_name, inv.month_year,
                Number(inv.amount),
                new Date(inv.due_date).toLocaleDateString('en-IN'),
                inv.paid ? 'YES' : 'NO',
                inv.paid_at ? new Date(inv.paid_at).toLocaleDateString('en-IN') : '—',
            ]);
            r.getCell(4).numFmt = '₹#,##0';
            r.getCell(6).font = { bold: true, color: { argb: inv.paid ? 'FF059669' : 'FFDC2626' } };
            styleDataRow(r, i % 2 === 0);
        });

        // Summary row
        rentSheet.addRow([]);
        const totalRow = rentSheet.addRow(['TOTAL', '', '', invoices.reduce((s, i) => s + Number(i.amount), 0), '', '', '']);
        totalRow.getCell(1).font = { bold: true };
        totalRow.getCell(4).numFmt = '₹#,##0';
        totalRow.getCell(4).font = { bold: true, color: { argb: 'FF4338CA' } };
        rentSheet.autoFilter = { from: 'A1', to: 'G1' };

        // ════════════════════════════════════════════════════════════
        // SHEET 4: Monthly Collection Analysis
        // ════════════════════════════════════════════════════════════
        const analysisSheet = wb.addWorksheet('📈 Monthly Analysis', { tabColor: { argb: 'FF7C3AED' } });
        setColWidths(analysisSheet, [16, 14, 14, 14, 12]);
        const analysisHeader = analysisSheet.addRow(['Month', 'Expected (₹)', 'Collected (₹)', 'Outstanding (₹)', 'Collection %']);
        analysisHeader.height = 28;
        styleHeader(analysisHeader, '7C3AED');

        // Group invoices by month
        const byMonth = {};
        invoices.forEach((inv) => {
            if (!byMonth[inv.month_year]) byMonth[inv.month_year] = { expected: 0, collected: 0 };
            byMonth[inv.month_year].expected += Number(inv.amount);
            if (inv.paid) byMonth[inv.month_year].collected += Number(inv.amount);
        });

        Object.entries(byMonth).sort(([a], [b]) => b.localeCompare(a)).forEach(([month, data], i) => {
            const outstanding = data.expected - data.collected;
            const pct = data.expected > 0 ? Math.round((data.collected / data.expected) * 100) : 0;
            const r = analysisSheet.addRow([month, data.expected, data.collected, outstanding, `${pct}%`]);
            r.getCell(2).numFmt = '₹#,##0';
            r.getCell(3).numFmt = '₹#,##0';
            r.getCell(4).numFmt = '₹#,##0';
            r.getCell(3).font = { color: { argb: 'FF059669' } };
            r.getCell(4).font = { color: { argb: 'FFDC2626' } };
            styleDataRow(r, i % 2 === 0);
        });

        // ════════════════════════════════════════════════════════════
        // SHEET 5: Complaints
        // ════════════════════════════════════════════════════════════
        const complaintSheet = wb.addWorksheet('📢 Complaints', { tabColor: { argb: 'FFDC2626' } });
        setColWidths(complaintSheet, [22, 18, 28, 35, 14, 14]);
        const complaintHeader = complaintSheet.addRow(['Tenant', 'PG', 'Title', 'Description', 'Status', 'Raised On']);
        complaintHeader.height = 28;
        styleHeader(complaintHeader, 'DC2626');

        complaints.forEach((c, i) => {
            const r = complaintSheet.addRow([
                c.tenant_name, c.pg_name, c.title, c.description,
                c.status.replace('_', ' '),
                new Date(c.created_at).toLocaleDateString('en-IN'),
            ]);
            const statusColors = { OPEN: 'FFDC2626', IN_PROGRESS: 'FFD97706', RESOLVED: 'FF059669' };
            r.getCell(5).font = { bold: true, color: { argb: statusColors[c.status] || 'FF374151' } };
            styleDataRow(r, i % 2 === 0);
        });
        complaintSheet.autoFilter = { from: 'A1', to: 'F1' };

        // ════════════════════════════════════════════════════════════
        // SHEET 6: Visitor Log
        // ════════════════════════════════════════════════════════════
        const visitorSheet = wb.addWorksheet('🚪 Visitors', { tabColor: { argb: 'FF0891B2' } });
        setColWidths(visitorSheet, [22, 22, 18, 22, 20, 20, 10]);
        const visitorHeader = visitorSheet.addRow(['Visitor Name', 'Tenant', 'Phone', 'Purpose', 'Check In', 'Check Out', 'Approved']);
        visitorHeader.height = 28;
        styleHeader(visitorHeader, '0891B2');

        visitors.forEach((v, i) => {
            const r = visitorSheet.addRow([
                v.visitor_name, v.tenant_name, v.phone || '—', v.purpose || '—',
                new Date(v.check_in).toLocaleString('en-IN'),
                v.check_out ? new Date(v.check_out).toLocaleString('en-IN') : 'Active',
                v.approved ? 'YES' : 'NO',
            ]);
            r.getCell(7).font = { bold: true, color: { argb: v.approved ? 'FF059669' : 'FFDC2626' } };
            styleDataRow(r, i % 2 === 0);
        });

        // ── Stream response ────────────────────────────────────────────────
        const filename = `PG_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        await wb.xlsx.write(res);
        res.end();
    } catch (err) {
        next(err);
    }
});

module.exports = router;
