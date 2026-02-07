<!-- Make sure you edit doc/README.hbs rather than README.md because the latter is auto-generated -->

python-js
=========

> Node module that allows you to run Python code from JS.

*This module only supports Windows (Tested on Windows 10)*

Installation
------------

Install `python-js` by running:

```sh
$ npm install --save https://github.com/MeowSky49887/PythonJS.git
```

Specified Python Version in package.json:
```json
{
  "python": {
    "version": "3.11"
  },
  "dependencies": {
    "python-js": "github:MeowSky49887/PythonJS"
  }
}
```

Documentation
-------------

**Example**

```js
const PythonJS = require("python-js");

const py = new PythonJS({port: 5555});
const main = await py.init("./main.py");

const output = await main.pi();
console.log(output);

await py.stop();
```

```py
import math

def pi():
    return math.pi
```