export default {
  "commands": [
    {
      "name": "ls",
      "help": "List files in the directory or information about a file",
      "usage": "ls [{path}]",
      "autocomplete": "files"
    },
    {
      "name": "cd",
      "help": "Change the current directory",
      "usage": "cd {path}",
      "autocomplete": "files"
    },
    {
      "name": "pwd",
      "help": "Print the current directory",
      "usage": "pwd"
    },
    {
      "name": "mkdir",
      "help": "Make a new directory",
      "usage": "mkdir {path}",
      "autocomplete": "files"
    },
    {
      "name": "mv",
      "help": "Move a file or folder",
      "usage": "mv {src} {dst}",
      "autocomplete": "files"
    },
    {
      "name": "cp",
      "help": "Copy a file or folder",
      "usage": "cp {src} {dst}",
      "autocomplete": "files"
    },
    {
      "name": "rm",
      "help": "Remove a file or folder",
      "usage": "rm {path}",
      "autocomplete": "files"
    },
    {
      "name": "ln",
      "help": "Create a symlink",
      "usage": "ln {target} {linkname}",
      "autocomplete": "files"
    },
    {
      "name": "readlink",
      "help": "Get the link target of a symlink",
      "usage": "readlink {target}",
      "autocomplete": "files"
    },
    {
      "name": "mount",
      "help": "Mount a hyperdrive as a subfolder",
      "usage": "mount {mount-url} {dst}",
      "autocomplete": "files"
    },
    {
      "name": "unmount",
      "help": "Unmount a mounted hyperdrive",
      "usage": "unmount {dst}",
      "autocomplete": "files"
    },
    {
      "name": "query",
      "help": "Run a query across the filesystem",
      "usage": "query [{path...}] [-t file|folder|mount] [-m {url}] [-s name|ctime|mtime] [-r] [--limit n] [--offset n]",
      "autocomplete": "files",
      "options": [
        {
          "name": "type",
          "abbr": "t",
          "help": "Filter the type of result (file, folder, mount)"
        },
        {
          "name": "mount",
          "abbr": "m",
          "help": "Filter to mounts of the given url"
        },
        {
          "name": "sort",
          "abbr": "s",
          "help": "Sort the results by the given attribute (name, ctime, mtime)"
        },
        {
          "name": "reverse",
          "abbr": "r",
          "help": "Reverse the results",
          "boolean": true
        },
        {
          "name": "limit",
          "help": "The number of results to return (0 means all)",
          "default": 0
        },
        {
          "name": "offset",
          "help": "The offset into the results to return",
          "default": 0
        }
      ]
    },
    {
      "name": "meta",
      "help": "Get/set metadata on a file or folder",
      "usage": "meta {path} [key] [value] [-d/--delete]",
      "autocomplete": "files",
      "options": [
        {
          "name": "delete",
          "abbr": "d",
          "help": "Delete the key value",
          "boolean": true,
          "default": false
        }
      ]
    },
    {
      "name": "mkdrive",
      "help": "Create a hyperdrive",
      "usage": "mkdrive [-t/--title title] [-d/--desc description]",
      "options": [
        {
          "name": "title",
          "abbr": "t",
          "help": "The drive title"
        },
        {
          "name": "desc",
          "abbr": "d",
          "help": "The drive description"
        }
      ]
    },
    {
      "name": "mkgoto",
      "help": "Create a .goto file",
      "usage": "mkgoto {goto-path} {href} [-t/--title title]",
      "autocomplete": "files",
      "options": [
        {
          "name": "title",
          "abbr": "t",
          "help": "Specify a title attribute on the .goto file"
        }
      ]
    },
    {
      "name": "bookmark",
      "help": "Bookmark the current working directory or given url",
      "usage": "bookmark [{href}] [-p/--public] [-t/--title {title}]",
      "autocomplete": "files",
      "options": [
        {
          "name": "title",
          "abbr": "t",
          "help": "Specify the title of the bookmark"
        }
      ]
    },
    {
      "name": "cat",
      "help": "Output the contents of a file into the terminal",
      "usage": "cat {path}",
      "autocomplete": "files"
    },
    {
      "name": "echo",
      "help": "Output the arguments of the call",
      "usage": "echo [...args]",
      "options": [
        {
          "name": "bookmark",
          "abbr": "b",
          "help": "Use {path} as the name of a bookmark to lookup and follow",
          "boolean": true
        },
        {
          "name": "new-tab",
          "abbr": "n",
          "help": "Open in a new tab",
          "boolean": true,
          "default": false
        }
      ]
    },
    {
      "name": "go",
      "help": "Open the target in the browser",
      "usage": "go [-bn] {path}",
      "autocomplete": "files",
      "options": [
        {
          "name": "bookmark",
          "abbr": "b",
          "help": "Use {path} as the name of a bookmark to lookup and follow",
          "boolean": true
        },
        {
          "name": "new-tab",
          "abbr": "n",
          "help": "Open in a new tab",
          "boolean": true,
          "default": false
        }
      ]
    },
    {
      "name": "edit",
      "help": "Edit the target using the browser editor",
      "usage": "edit {path}",
      "autocomplete": "files"
    },
    {
      "name": "clear",
      "help": "Clear the webterm history",
      "usage": "clear"
    },
    {
      "name" : "reload",
      "help": "Reloads the environment",
      "usage": "reload"
    },
    {
      "name": "env",
      "help": "Get and set environment variables",
      "subcommands": [
        {
          "name": "ls",
          "help": "List all environment variables",
          "usage": "env ls"
        },
        {
          "name": "get",
          "help": "Get the value of an environment variable",
          "usage": "env get {name}"
        },
        {
          "name": "set",
          "help": "Set the value of an environment variable",
          "usage": "env set {name} {value}"
        },
        {
          "name": "rm",
          "help": "Remove an environment variable",
          "usage": "env rm {name}"
        }
      ]
    },
    {
      "name": "page",
      "help": "Interact with the active page",
      "subcommands": [
        {
          "name": "exec",
          "help": "Execute javascript in the active page",
          "usage": "exec {js}"
        },
        {
          "name": "inject",
          "help": "Inject CSS into the active page",
          "usage": "inject {css}"
        },
        {
          "name": "uninject",
          "help": "Uninject CSS that was previously injected",
          "usage": "uninject {id}"
        }
      ]
    },
    {
      "name": "term",
      "help": "Webterm command management",
      "subcommands": [
        {
          "name": "ls",
          "help": "List all installed webterm apps",
          "usage": "term ls"
        },
        {
          "name": "install",
          "help": "Install a webterm app",
          "usage": "term install {name} {url}"
        },
        {
          "name": "uninstall",
          "help": "Uninstall a webterm app",
          "usage": "term install {name}"
        }
      ]
    },
    {
      "name": "system",
      "help": "Beaker system info commands",
      "subcommands": [
        {
          "name": "fs_audit_stream",
          "help": "Stream the filesystem audit log",
          "usage": "system fs-audit-stream [-c caller] [-t target] [-m method] [-l ms]",
          "options": [
            {
              "name": "caller",
              "abbr": "c",
              "help": "Filter to the given caller (URL)"
            },
            {
              "name": "target",
              "abbr": "t",
              "help": "Filter to the given target (URL)"
            },
            {
              "name": "method",
              "abbr": "m",
              "help": "Filter to the given method"
            },
            {
              "name": "longerthan",
              "abbr": "l",
              "help": "Filter to calls that took longer than the given time (ms)"
            }
          ]
        }
      ]
    },
    {
      "name": "exit",
      "help": "Close webterm",
      "usage": "exit"
    }
  ]
}