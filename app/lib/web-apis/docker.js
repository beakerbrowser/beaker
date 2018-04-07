
const PATH = require("path");
const SPAWN = require("child_process").spawn;

import {EventTarget, Event, fromEventStream} from './event-target'

class Docker extends EventTarget {
  constructor (path, opts = {}) {
    super()
    var errStack = (new Error()).stack
    try {

      if (!/^\//.test(path)) {
        throw new Error("Path to docker container must start with '/'!");
      }
      this.path = path

      this.opts = opts;
      this.proc = null;
    } catch (e) {
      throwWithFixedStack(e, errStack)
    }
  }

  run (command) {
    var errStack = (new Error()).stack
    var self = this;
    try {

      // TODO: Derive path to current 'site' dynamically
      var siteBasePath = "/dl/spaces/o/io.ginseng/beaker.sites/test";

      // TODO: Derive path to sibling control file at './docker.sh' dynamically
      var dockerControlPath = "/dl/spaces/o/io.ginseng/beaker/app/lib/web-apis/docker.sh"

      if (self.opts.debug) {
        console.log("[docker] Starting process for:", self.path);
      }
    
      self.proc = SPAWN(dockerControlPath, [
          "run",
          "--path", self.path.replace(/^\//, ""),
          "--command", '"' + command.replace(/"/g, '\\"') + '"'
      ], {
        cwd: siteBasePath,
        stdio: [
            'ignore',
            'pipe',
            'pipe'
        ]
      });
      self.proc.on("error", function (err) {
        throw err;
      });
      self.proc.on("close", function (code) {
        self.proc = null;
        if (self.opts.debug) {
          console.log("[docker] Process ended with code '" + code + "' for:", self.path);
        }
      });

      // TODO: How can I access 'process.env.NODE_ENV' when 'process' is not available in this context?
      if (self.opts.debug) {
        self.proc.stdout.on("data", function (chunk) {
          console.log("[docker][stdout]", chunk.toString());
        });
        self.proc.stderr.on("data", function (chunk) {
          console.error("[docker][stderr]", chunk.toString());
        });
      }

      return self.proc;
    } catch (e) {
      throwWithFixedStack(e, errStack)
    }
  }
}

export default Docker
