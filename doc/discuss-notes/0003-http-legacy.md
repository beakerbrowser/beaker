# HTTP legacy

With new protocols in the works, it's tempting to create platforms that completely ditch HTTP/S in favor of something new.
Beaker is not going to do this.
There's no reason to take a hardline stance against all hosted software.
This would only hurt users, and make software development more difficult.

Here are the specific reasons for retaining HTTP support:

 1. (legacy) Hosted resources are the legacy model of the Web. Beaker is more useful if it's able to access everything the Web has to offer.
 2. (ongoing value) Hosted resources have a place in the decentralized web. New protocols can selectively depend on HTTP, when it serves a good purpose. An example of this is, using HTTPS to host an up-to-date application manifest, which then triggers an application sync with bittorrent/ipfs/dat/etc.

Beaker may however change browsing behaviors, to make user-tracking and malware-injection more difficult.
This might mean disabling requests to 3rd-party domains, disabling plugins, removing standard request headers, and more.
