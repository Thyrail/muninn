import { describe, expect, it } from 'vitest';
import { isPrivateAddress } from './network-guard.js';

describe('isPrivateAddress', () => {
  it.each([
    '127.0.0.1',
    '10.1.2.3',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.178.1',
    '169.254.169.254',
    '100.64.0.1',
    '0.0.0.0',
    '224.0.0.1',
    '::1',
    '::',
    'fe80::1',
    'fd00::1',
    '::ffff:127.0.0.1',
    '::ffff:10.0.0.1',
    // Hex spelling of mapped addresses, as produced by `new URL('http://[::ffff:127.0.0.1]')`.
    '::ffff:7f00:1',
    '::ffff:a9fe:a9fe',
    '::FFFF:C0A8:0101',
    // Deprecated IPv4-compatible form.
    '::7f00:1',
    'not-an-ip',
  ])('blocks %s', (address) => {
    expect(isPrivateAddress(address)).toBe(true);
  });

  it.each([
    '8.8.8.8',
    '1.1.1.1',
    '172.32.0.1',
    '93.184.216.34',
    '2606:4700::1111',
    '::ffff:808:808',
  ])('allows public %s', (address) => {
    expect(isPrivateAddress(address)).toBe(false);
  });
});
