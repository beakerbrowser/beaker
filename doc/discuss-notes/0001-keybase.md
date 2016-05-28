# Keybase, global userids and pubkey certs

Beaker requires:

 1. Global userids
 2. Userid <--> pubkey certification

Beaker applications use a combination of p2p and federated services.
To address users across all networks, beaker needs global userids.

The userids need to support multiple devices, and should be human-readable.
Public keys are often device-specific, and are not human-readable, so they dont make good userids.

Keybase is a centralized userid <--> pubkey directory, with a reliable certification process.
It supports multiple device pubkeys.
Compared to [Google's End-to-end proposal](https://github.com/google/end-to-end/wiki/Key-Distribution), keybase has a comparible transparency system, and two additional advantages:

 1. Cross-host identity proofs (twitter, github, reddit, coinbase, hackernews, http/s, dns).
 2. A working, funded implementation.

But three disadvantages: 
 
 1. It is currently invite-only.
 2. It's relatively new software.
 3. It is a centralized service.

In the interest of making progress, Beaker should favor pragmatic solutions.
Keybase would make a good first solution, with the additional caveat that its usernames include the `@keybase.io` domain identifier.
This will leave the door open to other identity providers, in the future.