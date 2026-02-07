const { spawn } = require("child_process");
const path = require("path");

const workDir = process.cwd();
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

function runUV(uvArgs) {
    const proc = spawn(uvExe, uvArgs, {
        stdio: "inherit",
        cwd: workDir,
        env,
    });

    proc.on("exit", code => {
        console.log(`[pyjs] uv exited with code ${code}`);
    });

    return proc;
}

function runUVX(uvxArgs) {
    const proc = spawn(uvxExe, uvxArgs, {
        stdio: "inherit",
        cwd: baseDir,
        env,
    });

    proc.on("exit", code => {
        console.log(`[pyjs] uvx exited with code ${code}`);
    });

    return proc;
}

/* CommonJS exports */
module.exports = {
    runUV,
    runUVX,
};
