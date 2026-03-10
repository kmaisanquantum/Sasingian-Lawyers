-- ================================================================
-- Sasingian Lawyers Legal Practice Management System
-- PostgreSQL Schema — PNG Compliant (SWT + Superannuation)
-- ================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------
-- USERS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(50)  NOT NULL CHECK (role IN ('Admin','Partner','Associate','Staff')),
    hourly_rate     DECIMAL(10,2) DEFAULT 0.00,
    annual_salary   DECIMAL(12,2) DEFAULT 0.00,
    designation     VARCHAR(100),
    bank_name       VARCHAR(100),
    bank_account_number VARCHAR(50),
    bank_account_name   VARCHAR(255),
    bar_dues        DECIMAL(12,2) DEFAULT 0.00,
    phone           VARCHAR(50),
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------
-- CLIENTS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clients (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_name     VARCHAR(255) NOT NULL,
    client_type     VARCHAR(50)  CHECK (client_type IN ('Individual','Corporate','Government','NGO')),
    email           VARCHAR(255),
    phone           VARCHAR(50),
    address         TEXT,
    tin_number      VARCHAR(50),
    contact_person  VARCHAR(255),
    notes           TEXT,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------
-- MATTERS / CASES
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS matters (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_number           VARCHAR(100) UNIQUE NOT NULL,
    client_id             UUID REFERENCES clients(id) ON DELETE CASCADE,
    matter_name           VARCHAR(255) NOT NULL,
    matter_type           VARCHAR(100) NOT NULL,
    status                VARCHAR(50) DEFAULT 'Open' CHECK (status IN ('Open','Pending','Closed','On Hold')),
    assigned_partner_id   UUID REFERENCES users(id),
    assigned_associate_id UUID REFERENCES users(id),
    opening_date          DATE DEFAULT CURRENT_DATE,
    closing_date          DATE,
    estimated_value       DECIMAL(12,2),
    description           TEXT,
    budget_amount         DECIMAL(12,2),
    archived_at           TIMESTAMP,
    statute_of_limitations DATE,
    metadata              JSONB DEFAULT '{}'::jsonb,
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ensure metadata column exists for existing installations
ALTER TABLE matters ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- ----------------------------------------------------------------
-- TIME ENTRIES
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS time_entries (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    matter_id   UUID REFERENCES matters(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES users(id),
    entry_date  DATE NOT NULL,
    hours       DECIMAL(5,2) NOT NULL CHECK (hours > 0),
    hourly_rate DECIMAL(10,2) NOT NULL,
    description TEXT NOT NULL,
    is_billable BOOLEAN DEFAULT true,
    is_invoiced BOOLEAN DEFAULT false,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------
-- TRUST ACCOUNTS (PNG Strict No-Overdraw)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trust_accounts (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    matter_id        UUID REFERENCES matters(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('Deposit','Withdrawal','Transfer','Interest')),
    amount           DECIMAL(12,2) NOT NULL,
    balance          DECIMAL(12,2) NOT NULL,
    reconciled_at    TIMESTAMP,
    bank_statement_ref VARCHAR(100),
    description      TEXT NOT NULL,
    reference_number VARCHAR(100),
    created_by       UUID REFERENCES users(id),
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT no_negative_balance CHECK (balance >= 0)
);

-- ----------------------------------------------------------------
-- INVOICES
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    matter_id      UUID REFERENCES matters(id),
    client_id      UUID REFERENCES clients(id),
    invoice_date   DATE NOT NULL,
    due_date       DATE NOT NULL,
    subtotal       DECIMAL(12,2) NOT NULL,
    gst_amount     DECIMAL(12,2) DEFAULT 0.00,
    total_amount   DECIMAL(12,2) NOT NULL,
    status         VARCHAR(50) DEFAULT 'Draft' CHECK (status IN ('Draft','Sent','Paid','Overdue','Cancelled')),
    payment_date   DATE,
    notes          TEXT,
    created_by     UUID REFERENCES users(id),
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoice_items (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id  UUID REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity    DECIMAL(10,2) DEFAULT 1,
    unit_price  DECIMAL(10,2) NOT NULL,
    amount      DECIMAL(12,2) NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------
-- PNG PAYROLL (SWT + Superannuation)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id         UUID REFERENCES users(id),
    pay_period_start DATE NOT NULL,
    pay_period_end   DATE NOT NULL,
    pay_frequency    VARCHAR(20) NOT NULL CHECK (pay_frequency IN ('Fortnightly','Monthly')),
    gross_pay        DECIMAL(12,2) NOT NULL,
    overtime_pay     DECIMAL(12,2) DEFAULT 0.00,
    allowances       DECIMAL(12,2) DEFAULT 0.00,
    total_earnings   DECIMAL(12,2) NOT NULL,
    swt_tax          DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    employee_super   DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    employer_super   DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    other_deductions DECIMAL(12,2) DEFAULT 0.00,
    leave_deductions DECIMAL(12,2) DEFAULT 0.00,
    performance_bonus DECIMAL(12,2) DEFAULT 0.00,
    bar_dues         DECIMAL(12,2) DEFAULT 0.00,
    total_deductions DECIMAL(12,2) NOT NULL,
    net_pay          DECIMAL(12,2) NOT NULL,
    payment_date     DATE,
    payment_method   VARCHAR(50) DEFAULT 'Bank Transfer',
    status           VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending','Processed','Paid')),
    notes            TEXT,
    created_by       UUID REFERENCES users(id),
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------
-- PNG TAX RATE CONFIGURATION (2026)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS png_tax_rates (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    effective_year      INTEGER NOT NULL,
    tax_free_threshold  DECIMAL(12,2) NOT NULL DEFAULT 20000.00,
    bracket_1_limit     DECIMAL(12,2) DEFAULT 12500.00,
    bracket_1_rate      DECIMAL(5,4)  DEFAULT 0.30,
    bracket_2_limit     DECIMAL(12,2) DEFAULT 20000.00,
    bracket_2_rate      DECIMAL(5,4)  DEFAULT 0.35,
    bracket_3_limit     DECIMAL(12,2) DEFAULT 33000.00,
    bracket_3_rate      DECIMAL(5,4)  DEFAULT 0.40,
    bracket_4_rate      DECIMAL(5,4)  DEFAULT 0.42,
    employee_super_rate DECIMAL(5,4)  DEFAULT 0.06,
    employer_super_rate DECIMAL(5,4)  DEFAULT 0.084,
    gst_rate            DECIMAL(5,4)  DEFAULT 0.10,
    is_active           BOOLEAN DEFAULT true,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------
-- LEAVE REQUESTS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leave_requests (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id        UUID REFERENCES users(id),
    leave_type      VARCHAR(50) NOT NULL CHECK (leave_type IN ('Annual','Sick','Compassionate','Unpaid')),
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    days_requested  DECIMAL(4,1) NOT NULL,
    reason          TEXT,
    status          VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending','Approved','Rejected','Cancelled')),
    approved_by     UUID REFERENCES users(id),
    approved_date   TIMESTAMP,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------
-- AUDIT LOG
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID REFERENCES users(id),
    action     VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id  UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------
-- INDEXES
-- ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_email         ON users(email);
CREATE INDEX IF NOT EXISTS idx_matters_client      ON matters(client_id);
CREATE INDEX IF NOT EXISTS idx_matters_status      ON matters(status);
CREATE INDEX IF NOT EXISTS idx_matters_case_number ON matters(case_number);
CREATE INDEX IF NOT EXISTS idx_time_entries_matter ON time_entries(matter_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user   ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_trust_matter        ON trust_accounts(matter_id);
CREATE INDEX IF NOT EXISTS idx_invoices_matter     ON invoices(matter_id);
CREATE INDEX IF NOT EXISTS idx_payroll_staff       ON payroll(staff_id);
CREATE INDEX IF NOT EXISTS idx_payroll_period      ON payroll(pay_period_end);

-- ----------------------------------------------------------------
-- TRIGGERS
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at    BEFORE UPDATE ON users    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_clients_updated_at ON clients;
CREATE TRIGGER trg_clients_updated_at  BEFORE UPDATE ON clients  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_matters_updated_at ON matters;
CREATE TRIGGER trg_matters_updated_at  BEFORE UPDATE ON matters  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_invoices_updated_at ON invoices;
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------
-- REPORTING VIEWS
-- ----------------------------------------------------------------
CREATE OR REPLACE VIEW vw_matter_summary AS
SELECT
    m.id, m.case_number, m.matter_name, m.status, m.matter_type,
    c.client_name,
    u1.name  AS partner_name,
    u2.name  AS associate_name,
    COUNT(DISTINCT te.id)                                                                          AS time_entries_count,
    COALESCE(SUM(te.hours), 0)                                                                     AS total_hours,
    COALESCE(SUM(CASE WHEN te.is_billable AND NOT te.is_invoiced THEN te.hours * te.hourly_rate ELSE 0 END), 0) AS unbilled_amount,
    (SELECT COALESCE(ta.balance, 0) FROM trust_accounts ta WHERE ta.matter_id = m.id ORDER BY ta.created_at DESC LIMIT 1) AS trust_balance
FROM matters m
LEFT JOIN clients    c  ON m.client_id             = c.id
LEFT JOIN users      u1 ON m.assigned_partner_id   = u1.id
LEFT JOIN users      u2 ON m.assigned_associate_id = u2.id
LEFT JOIN time_entries te ON m.id = te.matter_id
GROUP BY m.id, c.client_name, u1.name, u2.name;

CREATE OR REPLACE VIEW vw_payroll_summary AS
SELECT
    p.id, u.name AS staff_name, u.email, u.role,
    p.pay_period_start, p.pay_period_end, p.pay_frequency,
    p.gross_pay, p.swt_tax, p.employee_super, p.employer_super,
    p.net_pay, p.status, p.payment_date
FROM payroll p
JOIN users u ON p.staff_id = u.id
ORDER BY p.pay_period_end DESC;

-- ----------------------------------------------------------------
-- SEED DATA
-- ----------------------------------------------------------------

-- 2026 PNG Tax Rates
INSERT INTO png_tax_rates (
    effective_year, tax_free_threshold,
    bracket_1_limit, bracket_1_rate,
    bracket_2_limit, bracket_2_rate,
    bracket_3_limit, bracket_3_rate, bracket_4_rate,
    employee_super_rate, employer_super_rate, gst_rate, is_active
) VALUES (
    2026, 20000.00,
    12500.00, 0.30,
    20000.00, 0.35,
    33000.00, 0.40, 0.42,
    0.06, 0.084, 0.10, true
) ON CONFLICT DO NOTHING;

-- Users (passwords set via seed-users.js script)
INSERT INTO users (name, email, password_hash, role, hourly_rate) VALUES
('Admin User',      'kmaisan@dspng.tech',          '$2b$10$PLACEHOLDER', 'Admin',   0.00),
('Edward Sasingian','edward@sasingianpng.com',      '$2b$10$PLACEHOLDER', 'Partner', 450.00)
ON CONFLICT (email) DO NOTHING;

-- Sample clients
INSERT INTO clients (client_name, client_type, email, phone, address, tin_number) VALUES
('Hela Provincial Government', 'Government', 'admin@hela.gov.pg',      '+675 123 4567', 'Tari, Hela Province',    'TIN-001-2024'),
('PNG Power Limited',          'Corporate',  'legal@pngpower.com.pg',  '+675 987 6543', 'Port Moresby, NCD',      'TIN-002-2024'),
('Pacific Investments Ltd',    'Corporate',  'info@pacinvest.com.pg',  '+675 321 0987', 'Lae, Morobe Province',   'TIN-003-2024'),
('John Kila',                  'Individual', 'jkila@gmail.com',        '+675 700 1234', 'Boroko, NCD',            NULL)
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------
-- OPERATING ACCOUNT (Firm Overhead & Income)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS firm_operating_ledger (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_date DATE NOT NULL,
    category         VARCHAR(100) NOT NULL CHECK (category IN ('Rent','Salary','Marketing','Professional Dues','Realized Income','Other')),
    amount           DECIMAL(12,2) NOT NULL,
    balance          DECIMAL(12,2) NOT NULL,
    description      TEXT NOT NULL,
    reference_number VARCHAR(100),
    created_by       UUID REFERENCES users(id),
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------
-- REIMBURSABLE EXPENSES (Costs Advanced)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reimbursable_expenses (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    matter_id        UUID REFERENCES matters(id) ON DELETE CASCADE,
    description      TEXT NOT NULL,
    amount           DECIMAL(12,2) NOT NULL,
    expense_date     DATE NOT NULL,
    is_invoiced      BOOLEAN DEFAULT false,
    created_by       UUID REFERENCES users(id),
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------
-- ADDITIONAL REPORTING VIEWS
-- ----------------------------------------------------------------
CREATE OR REPLACE VIEW vw_accounts_receivable AS
SELECT
    m.id AS matter_id,
    m.case_number,
    m.matter_name,
    c.client_name,
    COALESCE(SUM(i.total_amount), 0) AS total_billed,
    COALESCE(SUM(CASE WHEN i.status != 'Paid' THEN i.total_amount ELSE 0 END), 0) AS amount_due
FROM matters m
JOIN clients c ON m.client_id = c.id
LEFT JOIN invoices i ON m.id = i.matter_id AND i.status != 'Cancelled'
GROUP BY m.id, m.case_number, m.matter_name, c.client_name;


CREATE OR REPLACE VIEW vw_work_in_progress AS
SELECT
    m.id AS matter_id,
    m.case_number,
    m.matter_name,
    c.client_name,
    COALESCE(SUM(CASE WHEN te.is_billable AND NOT te.is_invoiced THEN te.hours * te.hourly_rate ELSE 0 END), 0) AS unbilled_time,
    COALESCE((SELECT SUM(amount) FROM reimbursable_expenses re WHERE re.matter_id = m.id AND NOT re.is_invoiced), 0) AS unbilled_expenses
FROM matters m
JOIN clients c ON m.client_id = c.id
LEFT JOIN time_entries te ON m.id = te.matter_id
GROUP BY m.id, m.case_number, m.matter_name, c.client_name;

CREATE OR REPLACE VIEW vw_staff_productivity AS
SELECT
    u.id AS staff_id,
    u.name AS staff_name,
    u.role,
    u.hourly_rate,
    COALESCE(SUM(te.hours), 0) AS total_hours,
    COALESCE(SUM(te.hours * te.hourly_rate), 0) AS billable_value,
    COUNT(DISTINCT te.matter_id) AS matters_worked_on
FROM users u
LEFT JOIN time_entries te ON u.id = te.user_id
GROUP BY u.id, u.name, u.role, u.hourly_rate;

CREATE INDEX IF NOT EXISTS idx_firm_op_date ON firm_operating_ledger(transaction_date);
CREATE INDEX IF NOT EXISTS idx_reimbursable_matter ON reimbursable_expenses(matter_id);

-- ----------------------------------------------------------------
-- MATTER DOCUMENTS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS matter_documents (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    matter_id     UUID REFERENCES matters(id) ON DELETE CASCADE,
    category      VARCHAR(100) NOT NULL CHECK (category IN ('Pleading','Correspondence','Evidence','Template','Other')),
    file_name     VARCHAR(255) NOT NULL,
    file_path     TEXT NOT NULL,
    uploaded_by   UUID REFERENCES users(id),
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------
-- MATTER TASKS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS matter_tasks (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    matter_id     UUID REFERENCES matters(id) ON DELETE CASCADE,
    title         VARCHAR(255) NOT NULL,
    description   TEXT,
    status        VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending','In Progress','Completed','Deferred','Cancelled')),
    due_date      DATE,
    assigned_to   UUID REFERENCES users(id),
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------
-- MATTER EVENTS (Calendar & Deadlines)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS matter_events (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    matter_id     UUID REFERENCES matters(id) ON DELETE CASCADE,
    title         VARCHAR(255) NOT NULL,
    event_type    VARCHAR(100) NOT NULL CHECK (event_type IN ('Court Date','Filing Deadline','Statute of Limitations','Meeting','Hearing','Other')),
    start_time    TIMESTAMP NOT NULL,
    end_time      TIMESTAMP NOT NULL,
    location      TEXT,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------
-- MATTER PARTIES & CONTACTS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS matter_parties (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    matter_id     UUID REFERENCES matters(id) ON DELETE CASCADE,
    name          VARCHAR(255) NOT NULL,
    role          VARCHAR(100) NOT NULL CHECK (role IN ('Client','Opposing Counsel','Judge','Witness','Expert','Other')),
    contact_info  TEXT,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------
-- MATTER ACTIVITY LOG & NOTES
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS matter_notes (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    matter_id     UUID REFERENCES matters(id) ON DELETE CASCADE,
    content       TEXT NOT NULL,
    created_by    UUID REFERENCES users(id),
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------
-- CONFLICT CHECKS (Intake)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conflict_checks (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    search_terms  TEXT NOT NULL,
    results       JSONB,
    is_cleared    BOOLEAN DEFAULT false,
    cleared_by    UUID REFERENCES users(id),
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_matter_docs_matter ON matter_documents(matter_id);
CREATE INDEX IF NOT EXISTS idx_matter_tasks_matter ON matter_tasks(matter_id);
CREATE INDEX IF NOT EXISTS idx_matter_events_matter ON matter_events(matter_id);
CREATE INDEX IF NOT EXISTS idx_matter_parties_matter ON matter_parties(matter_id);
CREATE INDEX IF NOT EXISTS idx_matter_notes_matter ON matter_notes(matter_id);

-- ----------------------------------------------------------------
-- STAFF DOCUMENTS (HR Folder)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS staff_documents (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id      UUID REFERENCES users(id) ON DELETE CASCADE,
    category      VARCHAR(100) NOT NULL CHECK (category IN ('Payslip','Contract','Identification','Other')),
    file_name     VARCHAR(255) NOT NULL,
    file_path     TEXT NOT NULL,
    uploaded_by   UUID REFERENCES users(id),
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_staff_docs_staff ON staff_documents(staff_id);
