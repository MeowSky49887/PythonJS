#!/usr/bin/env node
const { runUV, runUVX } = require("../uv");
const args = process.argv.slice(2);

if (!args.length) {
    console.log("Usage: pyjs <command> [options]");
    console.log("Commands:");
    console.log("  pip install <package> <uv-args>");
    console.log("  pip uninstall <package> <uv-args>");
    console.log("  pip sync <uv-args>");
    console.log("  pipx <uv-args>");
    process.exit(0);
}

const cmd = args[0];

(async () => {
    // -----------------------------------------
    // PIP install/uninstall
    // -----------------------------------------
    if (cmd === "pip") {
        const action = args[1];
        const pkgs = args.slice(2); // <-- รองรับหลาย package

        // pip sync
        if (action === "sync") {
            console.log("[pyjs] Syncing packages...");
            await runUV(["sync", ...pkgs]);
        } else {
            if (!["install","uninstall"].includes(action)) {
                console.error("Use pip install <package1> [package2 ...] or pip uninstall <package1> [package2 ...] or pip sync");
                process.exit(1);
            }
            if (!pkgs.length) {
                console.error("At least one package name is required.");
                process.exit(1);
            }

            const uvArgs = action === "install"
                ? ["add", ...pkgs]
                : ["remove", ...pkgs];

            console.log(`[pyjs] pip ${action} ${pkgs.join(" ")}`);
            await runUV(uvArgs);
        }
    }

    // -----------------------------------------
    // PIPX (รัน uvx)
    else if (cmd === "pipx") {
        const uvxArgs = args.slice(1);
        if (!uvxArgs.length) {
            console.error("Provide uvx arguments to run. Example: pyjs pipx run worker.py 5555");
            process.exit(1);
        }

        console.log(`[pyjs] Running uvx: ${uvxArgs.join(" ")}`);
        await runUVX(uvxArgs);
    }

    // -----------------------------------------
    // Unknown command
    else {
        console.error("Unknown command. Use init, pip, or pipx.");
        process.exit(1);
    }
})();