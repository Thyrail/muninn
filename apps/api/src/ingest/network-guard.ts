import { lookup, type LookupAddress } from 'node:dns';
import { BlockList, isIP, type LookupFunction } from 'node:net';

/**
 * SSRF protection for user-supplied URLs: blocks loopback, private, link-local (incl. cloud
 * metadata), carrier-grade NAT, multicast and reserved ranges for IPv4 and IPv6.
 */
const blocked = new BlockList();
for (const [network, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const) {
  blocked.addSubnet(network, prefix, 'ipv4');
}
for (const [network, prefix] of [
  ['::', 128],
  ['::1', 128],
  ['64:ff9b::', 96],
  ['100::', 64],
  ['2001:db8::', 32],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
] as const) {
  blocked.addSubnet(network, prefix, 'ipv6');
}

export function isPrivateAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return blocked.check(address, 'ipv4');
  if (version === 6) {
    // IPv4-mapped (::ffff:a.b.c.d) addresses are checked as IPv4.
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
    if (mapped) return blocked.check(mapped[1]!, 'ipv4');
    return blocked.check(address, 'ipv6');
  }
  return true;
}

export class BlockedAddressError extends Error {
  constructor(host: string) {
    super(`Blocked address for host ${host}`);
    this.name = 'BlockedAddressError';
  }
}

/**
 * `dns.lookup` replacement for outgoing connections: resolves all addresses and refuses the
 * connection if any of them is private. Runs on every connect, so redirects and DNS rebinding
 * are covered too.
 */
export const guardedLookup: LookupFunction = (hostname, options, callback) => {
  lookup(hostname, { ...options, all: true }, (error, addresses: LookupAddress[]) => {
    if (error) return callback(error, '', 0);
    if (addresses.length === 0 || addresses.some((entry) => isPrivateAddress(entry.address))) {
      return callback(new BlockedAddressError(hostname), '', 0);
    }
    if (options.all) return (callback as unknown as AllCallback)(null, addresses);
    const [first] = addresses;
    callback(null, first!.address, first!.family);
  });
};

type AllCallback = (error: NodeJS.ErrnoException | null, addresses: LookupAddress[]) => void;
