import axios from "axios";

const TOKEN = process.argv[2] || "";
const STOCK_URL = "http://localhost:5003";
const DELAY_MS = 2000;
const TOTAL_CALLS = 20;

if (!TOKEN) {
    console.error(" Usage: node test-circuit-breaker.js <accessToken>");
    console.error("   Get your token by logging in first.");
    process.exit(1);
}

const headers = { Cookie: `accessToken=${TOKEN}` };


function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatState(state) {
    const icons = { CLOSED: "🟢", OPEN: "🔴", HALF_OPEN: "🟡", HEALTHY: "🟢", DEGRADED: "🔴", RECOVERING: "🟡" };
    return `${icons[state] || "⚪"} ${state}`;
}

async function getCircuitBreakerStatus() {
    try {
        const res = await axios.get(
            `${STOCK_URL}/api/stock/health/circuit-breakers`,
            { headers }
        );
        return res.data;
    } catch (err) {
        return { error: err.message };
    }
}

async function testLowStockAlerts() {
    try {
        const res = await axios.get(
            `${STOCK_URL}/api/stock/alerts`,
            { headers }
        );
        return { success: true, count: res.data.count, warning: res.data.warning };
    } catch (err) {
        const status = err.response?.status || "ERR";
        return { success: false, status, message: err.message };
    }
}

async function testStockSummary() {
    try {
        const res = await axios.get(
            `${STOCK_URL}/api/stock/summary`,
            { headers }
        );
        return { success: true, data: res.data.summary };
    } catch (err) {
        return { success: false, message: err.message };
    }
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function run() {
    console.log("╔════════════════════════════════════════════════════╗");
    console.log("║         Circuit Breaker Test                       ║");
    console.log("╚════════════════════════════════════════════════════╝");
    console.log("");
    console.log("Instructions during this test:");
    console.log("  • After call #5  → STOP   the Products service");
    console.log("  • After call #13 → RESTART the Products service");
    console.log("  • Watch the circuit state change automatically");
    console.log("");
    console.log("─".repeat(55));

    for (let i = 1; i <= TOTAL_CALLS; i++) {
        console.log(`\n Call #${i}/${TOTAL_CALLS}`);

        // 1. Check circuit breaker status
        const cbStatus = await getCircuitBreakerStatus();
        if (!cbStatus.error) {
            const cb = cbStatus.circuitBreakers?.["products-service"];
            if (cb) {
                console.log(`   Circuit State : ${formatState(cb.state)}`);
                console.log(
                    `   Stats         :  ${cb.successes} successes   ${cb.failures} failures   ${cb.rejects} rejects`
                );
            }
        }

        // 2. Hit an endpoint that calls Products service
        const alertResult = await testLowStockAlerts();
        if (alertResult.success) {
            console.log(`   /alerts       :  OK (${alertResult.count} alerts)`);
            if (alertResult.warning) {
                console.log(`     Warning    : ${alertResult.warning}`);
            }
        } else {
            console.log(`   /alerts       :  FAILED [${alertResult.status}] ${alertResult.message}`);
        }

        // 3. Hit an endpoint that does NOT call Products service
        const summaryResult = await testStockSummary();
        if (summaryResult.success) {
            console.log(`   /summary      :  OK (stock-only endpoint — always works)`);
        } else {
            console.log(`   /summary      :  FAILED ${summaryResult.message}`);
        }

        // Prompt reminders
        if (i === 5) {
            console.log("\n   NOW STOP the Products service! (Ctrl+C in that terminal)");
        }
        if (i === 13) {
            console.log("\n   NOW RESTART the Products service!");
        }

        if (i < TOTAL_CALLS) {
            await sleep(DELAY_MS);
        }
    }

    console.log("\n" + "─".repeat(55));
    console.log(" Test complete!\n");

    // Final status
    const finalStatus = await getCircuitBreakerStatus();
    if (!finalStatus.error) {
        console.log("Final Circuit Breaker Report:");
        console.log(JSON.stringify(finalStatus.circuitBreakers, null, 2));
    }
}

run().catch(console.error);