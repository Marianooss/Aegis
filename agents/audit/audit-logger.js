class AuditLogger {
  constructor() {
    this.session = {
      started_at: new Date().toISOString(),
      scenarios_processed: 0,
      auto_approved: 0,
      auto_corrected: 0,
      escalated_to_human: 0,
      errors: 0,
      results: []
    };
  }

  log(scenarioId, result, details = {}) {
    this.session.scenarios_processed++;

    switch (result) {
      case 'AUTO_APPROVED':   this.session.auto_approved++;      break;
      case 'AUTO_CORRECTED':  this.session.auto_corrected++;     break;
      case 'ESCALATED':       this.session.escalated_to_human++; break;
      case 'ERROR':           this.session.errors++;             break;
    }

    this.session.results.push({
      scenario_id: scenarioId,
      result,
      timestamp: new Date().toISOString(),
      initial_severity: details.initial_severity || null,
      flags_detected: details.flags_detected || 0,
      flags_fixed: details.flags_fixed || 0,
      revalidation_verdict: details.revalidation_verdict || null,
    });
  }

  summary() {
    const s = this.session;
    const total = s.scenarios_processed;
    const safeRate = total > 0
      ? (((s.auto_approved + s.auto_corrected) / total) * 100).toFixed(1)
      : '0.0';

    return {
      ...s,
      completed_at: new Date().toISOString(),
      safe_rate_pct: `${safeRate}%`,
      zero_errors_reached_clinicians: s.escalated_to_human === 0
        ? true
        : `${s.escalated_to_human} case(s) required human review`
    };
  }

  print() {
    const s = this.summary();
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║              SENTINEL AUDIT LOG — SESSION                ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log(`║  Scenarios processed:     ${String(s.scenarios_processed).padEnd(30)}║`);
    console.log(`║  Auto-approved (PASS):    ${String(s.auto_approved).padEnd(30)}║`);
    console.log(`║  Auto-corrected:          ${String(s.auto_corrected).padEnd(30)}║`);
    console.log(`║  Escalated to human:      ${String(s.escalated_to_human).padEnd(30)}║`);
    console.log(`║  Errors:                  ${String(s.errors).padEnd(30)}║`);
    console.log(`║  Safe rate:               ${String(s.safe_rate_pct).padEnd(30)}║`);
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log(`║  Zero errors to clinicians: ${String(s.zero_errors_reached_clinicians).padEnd(28)}║`);
    console.log('╚══════════════════════════════════════════════════════════╝');

    console.log('\n  Results per scenario:');
    s.results.forEach(r => {
      const icon = r.result === 'AUTO_APPROVED' ? '✅' :
                   r.result === 'AUTO_CORRECTED' ? '🔧' :
                   r.result === 'ESCALATED' ? '🔴' : '❌';
      console.log(`  ${icon} ${r.scenario_id}: ${r.result} | severity=${r.initial_severity} | fixed=${r.flags_fixed}/${r.flags_detected}`);
    });
  }
}

module.exports = AuditLogger;