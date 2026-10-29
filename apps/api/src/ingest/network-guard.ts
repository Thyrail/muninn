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
  // Unspecified, loopback and the deprecated IPv4-compatible range (::a.b.c.d).
  ['::', 96],
  ['64:ff9b::', 96],
  ['100::', 64],
  ['2001:db8::', 32],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
] as const) {
  blocked.addSubnet(network, prefix, 'ipv6');
}

/**
 * The IPv4 address inside an IPv4-mapped IPv6 address, in both spellings: `::ffff:127.0.0.1`
 * and `::ffff:7f00:1`, which is how `new URL` normalizes `[::ffff:127.0.0.1]`.
 */
function mappedIPv4(address: string): string | null {
  const dotted = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
  if (dotted) return dotted[1]!;
  const hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(address);
  if (!hex) return null;
  const high = Number.parseInt(hex[1]!, 16);
  const low = Number.parseInt(hex[2]!, 16);
  return [high >> 8, high & 0xff, low >> 8, low & 0xff].join('.');
}

export function isPrivateAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return blocked.check(address, 'ipv4');
  if (version === 6) {
    const mapped = mappedIPv4(address);
    if (mapped) return blocked.check(mapped, 'ipv4');
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
