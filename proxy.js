const { spawn } = require("child_process");
const zmq = require("zeromq");
const path = require("path");
const { randomUUID } = require("crypto");

const workDir = process.cwd();

class PythonJS {
    constructor({ port = 5555 } = {}) {
        this.port = port;

        this.pythonProcess = null;
        this.sock = new zmq.Request();         

        this.files = {};
        this._started = false;
    }

    async _startWorker() {
        if (this._started) return;

        const uvExe = path.join(__dirname, "bin", "uv.exe");
        const workerPath = path.join(__dirname, "worker.py");

        console.log("[PythonJS] Starting worker...");

        const env = {
            ...process.env,
            UV_NO_CACHE: "true",
            UV_PYTHON_INSTALL_BIN: "false",
            UV_PYTHON_INSTALL_REGISTRY: "false",
            UV_PYTHON_INSTALL_DIR: path.join(__dirname, "../bin/python"),
            UV_PROJECT: workDir,
            UV_PROJECT_ENVIRONMENT: path.join(workDir, "__pypackages__")
        };

        this.pythonProcess = spawn(
            uvExe,
            [
                "run",
                workerPath,
                this.port.toString()
            ],
            { stdio: "inherit", cwd: workDir, env }
        );

        // give worker time to start
        await new Promise(r => setTimeout(r, 1200));

        // ----- Control handshake -----
        await this.sock.connect(`tcp://127.0.0.1:${this.port}`);
        await this.sock.send(JSON.stringify({ cmd: "handshake" }));
        await this.sock.receive();
        
        this._started = true;
    }

    async _callPython(code, file = null) {
        await this._startWorker();  // ensure ready

        const job = {
            id: randomUUID(),
            code,
            file
        };

        await this.sock.send(JSON.stringify(job));

        const [reply] = await this.sock.receive();

        return JSON.parse(reply.toString());
    }

    async init(filePath) {
        await this._startWorker();

        const resolved = path.resolve(filePath);
        const safe = resolved.replace(/\\/g, "\\\\");

        let res;
        res = await this._callPython(`__load__('${safe}')`);

        const pyRepr = (value) => {
            if (value === null) return "None";
            if (value === true) return "True";
            if (value === false) return "False";

            if (typeof value === "string") {
                return JSON.stringify(value);
            }

            if (Array.isArray(value)) {
                return `[${value.map(pyRepr).join(", ")}]`;
            }

            if (typeof value === "object") {
                return `{${Object.entries(value)
                    .map(([k, v]) => `${JSON.stringify(k)}: ${pyRepr(v)}`)
                    .join(", ")}}`;
            }

            return String(value);
        };

        const proxy = new Proxy({}, {
            get: (_, funcName) => {
                if (funcName === "then") {
                    return undefined;
                }

                return async (...args) => {
                    let argList;

                    if (
                        args.length === 1 &&
                        args[0] &&
                        typeof args[0] === "object" &&
                        !Array.isArray(args[0])
                    ) {
                        argList = Object.entries(args[0])
                            .map(([k, v]) => `${k}=${pyRepr(v)}`)
                            .join(", ");
                    } else {
                        argList = args.map(pyRepr).join(", ");
                    }

                    return await this._callPython(
                        `${String(funcName)}(${argList})`,
                        safe
                    );
                };
            }
        });

        this.files[safe] = proxy;
        return proxy;
    }

    async stop() {
        if (!this._started) return;

        try {
            await this.sock.send(JSON.stringify({ cmd: "shutdown" }));
            await this.sock.receive();
        } catch (e) {}

        try { this.sock.close(); } catch (e) {}

        if (this.pythonProcess) {
            this.pythonProcess.kill();
            this.pythonProcess = null;
        }

        this._started = false;
        console.log("[PythonJS] Worker stopped.");
    }
}

module.exports = PythonJS;
