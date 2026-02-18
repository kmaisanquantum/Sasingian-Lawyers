-- ================================================================
-- Sasingian Lawyers Legal Practice Management System
-- PostgreSQL Schema — PNG Compliant (SWT + Superannuation)
-- ================================================================

-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------
-- USERS
-- ----------------------------------------------------------------
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(50)  NOT NULL CHECK (role IN ('Admin','Partner','Associate','Staff')),
    hourly_rate     DECIMAL(10,2) DEFAULT 0.00,
    annual_salary   DECIMAL(12,2) DEFAULT 0.00,
    phone           VARCHAR(50),
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------
-- CLIENTS
-- ----------------------------------------------------------------
CREATE TABLE clients (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
CREATE TABLE matters (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------
-- TIME ENTRIES
-- ----------------------------------------------------------------
CREATE TABLE time_entries (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
CREATE TABLE trust_accounts (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matter_id        UUID REFERENCES matters(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('Deposit','Withdrawal','Transfer','Interest')),
    amount           DECIMAL(12,2) NOT NULL,
    balance          DECIMAL(12,2) NOT NULL,
    description      TEXT NOT NULL,
    reference_number VARCHAR(100),
    created_by       UUID REFERENCES users(id),
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT no_negative_balance CHECK (balance >= 0)
);

-- ----------------------------------------------------------------
-- INVOICES
-- ----------------------------------------------------------------
CREATE TABLE invoices (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE TABLE invoice_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
CREATE TABLE payroll (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
CREATE TABLE png_tax_rates (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
CREATE TABLE leave_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
CREATE TABLE audit_log (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
CREATE INDEX idx_users_email         ON users(email);
CREATE INDEX idx_matters_client      ON matters(client_id);
CREATE INDEX idx_matters_status      ON matters(status);
CREATE INDEX idx_matters_case_number ON matters(case_number);
CREATE INDEX idx_time_entries_matter ON time_entries(matter_id);
CREATE INDEX idx_time_entries_user   ON time_entries(user_id);
CREATE INDEX idx_trust_matter        ON trust_accounts(matter_id);
CREATE INDEX idx_invoices_matter     ON invoices(matter_id);
CREATE INDEX idx_payroll_staff       ON payroll(staff_id);
CREATE INDEX idx_payroll_period      ON payroll(pay_period_end);

-- ----------------------------------------------------------------
-- TRIGGERS
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
$$ language 'plpgsql';

CREATE TRIGGER trg_users_updated_at    BEFORE UPDATE ON users    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_clients_updated_at  BEFORE UPDATE ON clients  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_matters_updated_at  BEFORE UPDATE ON matters  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------
-- REPORTING VIEWS
-- ----------------------------------------------------------------
CREATE VIEW vw_matter_summary AS
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

CREATE VIEW vw_payroll_summary AS
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
);

-- Users (passwords set via seed-users.js script)
INSERT INTO users (name, email, password_hash, role, hourly_rate) VALUES
('Admin User',      'kmaisan@dspng.tech',          '$2b$10$PLACEHOLDER', 'Admin',   0.00),
('Edward Sasingian','edward@sasingianpng.com',      '$2b$10$PLACEHOLDER', 'Partner', 450.00),
('Flora Sasingian', 'flora@sasingianlawyers.com',   '$2b$10$PLACEHOLDER', 'Partner', 450.00);

-- Sample clients
INSERT INTO clients (client_name, client_type, email, phone, address, tin_number) VALUES
('Hela Provincial Government', 'Government', 'admin@hela.gov.pg',      '+675 123 4567', 'Tari, Hela Province',    'TIN-001-2024'),
('PNG Power Limited',          'Corporate',  'legal@pngpower.com.pg',  '+675 987 6543', 'Port Moresby, NCD',      'TIN-002-2024'),
('Pacific Investments Ltd',    'Corporate',  'info@pacinvest.com.pg',  '+675 321 0987', 'Lae, Morobe Province',   'TIN-003-2024'),
('John Kila',                  'Individual', 'jkila@gmail.com',        '+675 700 1234', 'Boroko, NCD',            NULL);
