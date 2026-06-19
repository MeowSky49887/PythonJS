const fetch = require('node-fetch-commonjs');
const unzipper = require('unzipper');
const fs = require('fs');
const path = require('path');
const { runUV, runUVX } = require("./uv");

const systemArch = process.arch === "x64" ? "x86_64" : "i686";

const downloadURL = `https://github.com/astral-sh/uv/releases/latest/download/uv-${systemArch}-pc-windows-msvc.zip`;
const installPath = path.join(__dirname, 'bin');
const workDir = process.env.INIT_CWD;

async function downloadLatestUV() {
    try {
        const filePath = path.join(__dirname, downloadURL.split('/').pop());

        console.log(`Downloading: ${downloadURL}`);

        const response = await fetch(downloadURL);
        const buffer = await response.arrayBuffer();
        fs.writeFileSync(filePath, Buffer.from(buffer));

        console.log(`Download Completed: ${filePath}`);

        await extractUV(filePath);
    } catch (error) {
        console.error('Error downloading latest UV version:', error);
        process.exit(1);
    }
}

async function extractUV(zipFilePath) {
    try {
        console.log(`Extracting to: ${installPath}`);

        if (!fs.existsSync(installPath)) {
            fs.mkdirSync(installPath, { recursive: true });
        }

        const directory = await unzipper.Open.file(zipFilePath);

        return await directory.extract({ path: installPath });
    } catch (error) {
        console.error('Error extracting UV:', error);
        process.exit(1);
    }
}

async function installPython() {
    try {
        console.log(`Current Working Directory: ${workDir}`);

        const pythonVersionFile = path.join(workDir, ".python-version");
        const pyprojectFile = path.join(workDir, "pyproject.toml");
        const pypackagesDir = path.join(workDir, "__pypackages__");

        let pythonVer;

        if (fs.existsSync(pythonVersionFile)) {
            pythonVer = fs.readFileSync(pythonVersionFile, "utf8").trim();
        } else {
            const res = await fetch("https://peps.python.org/api/python-releases.json");
            const data = await res.json();
            const metadata = data.metadata;

            const latestReleased = Object.keys(metadata)
                .filter(v => metadata[v].status === "bugfix" || metadata[v].status === "security")
                .sort((a, b) => {
                    const pa = a.split('.').map(Number);
                    const pb = b.split('.').map(Number);

                    for (let i = 0; i < 3; i++) {
                        const diff = (pb[i] || 0) - (pa[i] || 0);
                        if (diff) return diff;
                    }
                    return 0;
                })[0];

            pythonVer = latestReleased;

        }

        console.log(`Installing Python ${pythonVer}`);

        await runUV(["python", "install", pythonVer]);
        if (!fs.existsSync(pythonVersionFile)) {
            await runUV(["python", "pin", pythonVer]);
        }
        if (!fs.existsSync(pyprojectFile)) {
            await runUV(["init", "--bare", workDir, "--python", pythonVer]);
        }
        if (!fs.existsSync(pypackagesDir)) {
            await runUV(["venv", "--python", pythonVer, "--system-site-packages", pypackagesDir, "--clear" ]);
        }
        await runUV(["pip", "install", "pyzmq", "--python", pythonVer, "--system", "--break-system-packages"]);
    } catch (error) {
        console.error("Error installing Python:", error);
        process.exit(1);
    }
}

(async () => {
    await downloadLatestUV();
    await installPython();

})();
