import sys

def fix_file(path, new_routes):
    with open(path, 'r') as f:
        lines = f.readlines()

    # Find the export default line
    export_idx = -1
    for i, line in enumerate(lines):
        if 'export default router' in line:
            export_idx = i
            break

    if export_idx == -1:
        print(f"Could not find export default in {path}")
        return

    # Keep everything before export, then add new routes, then add export
    new_lines = lines[:export_idx]
    new_lines.append("\n" + new_routes + "\n")
    new_lines.append("export default router;\n")

    with open(path, 'w') as f:
        f.writelines(new_lines)
    print(f"Fixed {path}")

auth_routes = """
/* ── GET /api/auth/users/:id/productivity ────────────────── */
router.get('/users/:id/productivity', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.id !== id && !["Admin","Partner"].includes(req.user.role))
      return res.status(403).json({ success: false, message: "Access denied." });

    const { rows } = await query("SELECT * FROM vw_staff_productivity WHERE staff_id = $1", [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: "Staff metrics not found." });

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
"""

payroll_routes = """
/* ── GET /api/payroll/staff/:staffId/pay-data ──────────────── */
router.get('/staff/:staffId/pay-data', authorize('Admin','Partner'), async (req, res) => {
  try {
    const { staffId } = req.params;
    const { rows: users } = await query('SELECT * FROM users WHERE id = $1', [staffId]);
    if (!users.length) return res.status(404).json({ success: false, message: 'Staff not found.' });

    const user = users[0];
    const { rows: prod } = await query('SELECT * FROM vw_staff_productivity WHERE staff_id = $1', [staffId]);

    res.json({
      success: true,
      data: {
        baseSalary: user.annual_salary,
        hourlyRate: user.hourly_rate,
        barDues: user.bar_dues,
        productivity: prod[0] || null
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
"""

fix_file('backend/routes/auth.js', auth_routes)
fix_file('backend/routes/payroll.js', payroll_routes)
