# Dat vs. IPFS: What's the difference?

[Dat](http://docs.dat-data.com/) and [IPFS](https://ipfs.io) are both peer-to-peer technologies for exchanging files, and their protocols are remarkably similar:

 - Peers are discovered globally using DHTs, and locally using mDNS
 - Files and folders are addressed by content-hashes
 - "Dynamic" folders - that is, folders which can change after publishing - are identified by public keys, and have their updates signed by the private key
 - Syncronization is optimized using [Rabin Fingerprinting](https://en.wikipedia.org/wiki/Rabin_fingerprint)

The differences tend to be subtle and implementation-specific.
For instance, Dat favors direct hex-encoding, while IPFS uses the [multihash](https://github.com/multiformats/multihash) format and prefers base58.
Dat's main implementation is in Javascript, while IPFS uses Go, with a JS implementation available.

Both teams use open-source licenses for their software.

## Which should I use?

Whichever you think works better.
Both toolsets are easy to learn, and both are supported by Beaker.

My recommendation: use both, and then stick with the one that performs better.

> Please submit a PR if there are differences that I've missed, and which should be listed here!