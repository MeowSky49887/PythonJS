const { spawn } = require("child_process");
const path = require("path");

const workDir = process.env.INIT_CWD;
const baseDir = __dirname;

const uvExe = path.join(baseDir, "bin", "uv.exe");
const uvxExe = path.join(baseDir, "bin", "uvx.exe");

const env = {
    ...process.env,
    UV_NO_CACHE: "true",
    UV_PYTHON_INSTALL_BIN: "false",
    UV_PYTHON_INSTALL_REGISTRY: "false",
    UV_PYTHON_INSTALL_DIR: path.join(baseDir, "bin", "python"),
    UV_PROJECT: workDir,
    UV_PROJECT_ENVIRONMENT: path.join(workDir, "__pypackages__"),
};

function spawnAsync(command, args, options) {
    return new Promise((resolve, reject) => {
        const proc = spawn(command, args, options);

        proc.on("error", reject);

        proc.on("exit", code => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`${command} exited with code ${code}`));
            }
        });
    });
}

async function runUV(uvArgs) {
    await spawnAsync(uvExe, uvArgs, {
        stdio: "inherit",
        cwd: workDir,
        env,
    });
}

async function runUVX(uvxArgs) {
    await spawnAsync(uvxExe, uvxArgs, {
        stdio: "inherit",
        cwd: baseDir,
        env,
    });
}

/* CommonJS exports */
module.exports = {
    runUV,
    runUVX,
};