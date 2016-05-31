# Hyperboot, application delivery safety

Web applications cant be trusted with device resources, because browsers allow the host-server to change application code.
To trust an application, we need to:

 1. (version) Alert the user to software changes, and give them the right to refuse or roll-back the update.
 2. (verify) Verify the integrity and signature of the application.
 3. (audit) Independently audit applications.

[Hyperboot](https://github.com/substack/hyperboot) is a versioned application distributor built on [Hypercore](https://github.com/mafintosh/hypercore) and [Hyperdrive](https://github.com/mafintosh/hyperdrive).
Hypercore/drive are beaker's cross-host (p2p) publishing protocols, for append-only logs and file-archives, respectively.

Hyperboot uses a hypercore log to announce the versions, and hyperdrive to sync the actual files.
Applications delivered with hyperboot are therefore versioned, signed, and verified.
Content-Security-Policies will protect against injections at runtime.

Auditing is a social problem in addition to a technical problem.
For auditing to be meaningful, new versions need to be reviewed by independent 3rd parties, and checked for bad behavior.
Hyperboot's pubkeys and version-hashes are identifiers which auditors can sign against.
However, deciding which auditors to *trust* is a hard (social) problem.