import sys
import zmq
import importlib.util

loaded_modules = {}

def __load__(file_path: str):
    if file_path in loaded_modules:
        return f"Module already loaded: {file_path}"

    spec = importlib.util.spec_from_file_location("mod_" + str(len(loaded_modules)), file_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    loaded_modules[file_path] = module
    return f"Loaded: {file_path}"


def execute(code: str, file_path=None):
    try:
        if file_path:
            module = loaded_modules.get(file_path)
            if module is None:
                return {"error": f"Module not loaded: {file_path}"}
            result = eval(code, module.__dict__)
        else:
            result = eval(code, globals())

        return {"result": result}

    except Exception as e:
        return {"error": str(e)}


def main():
    port = int(sys.argv[1])

    ctx = zmq.Context()
    socket = ctx.socket(zmq.REP)
    socket.bind(f"tcp://127.0.0.1:{port}")

    print("[PythonJS] Waiting for handshake.")

    # ---------- handshake ----------
    msg = socket.recv_json()
    socket.send_json({"status": "ready"})
    # ------------------------------

    print("[PythonJS] Ready for jobs.")

    while True:
        msg = socket.recv_json()

        # ---------- shutdown support ----------
        if msg.get("cmd") == "shutdown":
            socket.send_json({"status": "bye"})
            print("[PythonJS] Shutting down worker...")
            break
        # --------------------------------------

        job_id = msg.get("id")
        code = msg.get("code")
        file = msg.get("file")

        try:
            if code.startswith("__load__"):
                file_path = code.split("__load__(")[1].rstrip(")").strip("'\"")
                result = __load__(file_path)
                socket.send_json({"id": job_id, "result": result})
                continue

            result = execute(code, file)
            socket.send_json({"id": job_id, **result})

        except Exception as e:
            socket.send_json({"id": job_id, "error": str(e)})

    # ---------- CLEANUP ----------
    socket.close()
    ctx.term()
    print("[PythonJS] Worker cleaned up and closed.")
    # -----------------------------


if __name__ == "__main__":
    main()
