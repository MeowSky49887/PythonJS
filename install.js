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
        const pkg = require(path.join(workDir, "package.json"))

        const res = await fetch("https://peps.python.org/api/python-releases.json");
        const data = await res.json();
        const metadata = data.metadata;
        const mainBranch = Object.keys(metadata).find(v => {
            return metadata[v].branch === "main";
        });

        const pythonVer = pkg.python?.version ?? mainBranch
        console.log(`Installing Python ${pythonVer}`);

        await runUV(["python", "install", pythonVer]);
        await runUV(["python", "pin", pythonVer]);
        await runUV(["init", "--bare", workDir, "--python", pythonVer]);
        await runUV(["venv", "--python", pythonVer, "--system-site-packages", path.join(workDir, "__pypackages__"), "--clear"]);
        await runUV(["pip", "install", "pyzmq", "--python", pythonVer, "--system", "--break-system-packages"]);
    } catch (error) {
        console.error('Error installing Python:', error);
        process.exit(1);
    }
}

(async () => {
    await downloadLatestUV();
    await installPython();
})();