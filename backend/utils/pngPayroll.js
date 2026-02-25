/**
 * PNG Payroll Calculator — 2026 IRC Tax Tables
 * SWT (Salary or Wages Tax) + Superannuation
 *
 * Annual brackets applied to annualised pay:
 *   Tax-free threshold : K20,000
 *   Up to K12,500      : 30%
 *   K12,501 – K20,000  : 35%
 *   K20,001 – K33,000  : 40%
 *   Over K33,000       : 42%
 *
 * Superannuation:
 *   Employee : 6.0%
 *   Employer : 8.4%
 */

export class PNGPayrollCalculator {
  constructor () {
    this.TAX_FREE  = 20000;
    this.BRACKETS  = [
      { limit: 12500,    rate: 0.30, cumulative: 0     },
      { limit: 20000,    rate: 0.35, cumulative: 3750  },   // 12500*0.30
      { limit: 33000,    rate: 0.40, cumulative: 6375  },   // 3750 + 7500*0.35
      { limit: Infinity, rate: 0.42, cumulative: 11575 },   // 6375 + 13000*0.40
    ];
    this.EMP_SUPER  = 0.06;
    this.EMPR_SUPER = 0.084;
  }

  /** Annual SWT on annualised gross */
  annualSWT (annualGross) {
    if (annualGross <= this.TAX_FREE) return 0;
    const taxable = annualGross - this.TAX_FREE;
    for (let i = 0; i < this.BRACKETS.length; i++) {
      const prev  = i === 0 ? 0 : this.BRACKETS[i - 1].limit;
      const bkt   = this.BRACKETS[i];
      if (taxable <= bkt.limit) {
        return Math.round((bkt.cumulative + (taxable - prev) * bkt.rate) * 100) / 100;
      }
    }
    return 0;
  }

  /** Core calculation for any frequency */
  calculate (grossPay, frequency = 'Fortnightly', allowances = 0, overtimePay = 0, otherDeductions = 0) {
    const periods      = frequency === 'Monthly' ? 12 : 26;
    const totalEarnings = grossPay + allowances + overtimePay;
    const annualGross   = totalEarnings * periods;
    const annualTax     = this.annualSWT(annualGross);

    const periodTax     = Math.round((annualTax     / periods) * 100) / 100;
    const empSuper      = Math.round(totalEarnings  * this.EMP_SUPER  * 100) / 100;
    const emprSuper     = Math.round(totalEarnings  * this.EMPR_SUPER * 100) / 100;
    const totalDeduct   = periodTax + empSuper + otherDeductions;
    const netPay        = Math.round((totalEarnings - totalDeduct) * 100) / 100;

    return {
      grossPay,
      allowances,
      overtimePay,
      totalEarnings,
      swtTax:          periodTax,
      employeeSuper:   empSuper,
      employerSuper:   emprSuper,
      otherDeductions,
      totalDeductions: totalDeduct,
      netPay,
      annualIncome:    annualGross,
      annualTax,
      effectiveTaxRate: totalEarnings > 0
        ? ((periodTax / totalEarnings) * 100).toFixed(2) + '%'
        : '0.00%',
      takeHomePct: totalEarnings > 0
        ? ((netPay    / totalEarnings) * 100).toFixed(2) + '%'
        : '0.00%',
    };
  }
}

export default PNGPayrollCalculator;
