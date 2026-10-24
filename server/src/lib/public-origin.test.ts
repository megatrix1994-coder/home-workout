import { describe, expect, it } from 'vitest';
import {
  accessUrls,
  lanOrigin,
  privateIpv4Addresses,
  publicOrigin,
  requestPort,
  type NetworkInterfaces,
} from './public-origin.js';

function req(input: { origin?: string; host?: string; protocol?: string }) {
  return {
    protocol: input.protocol ?? 'http',
    get(name: string) {
      if (name === 'origin') {
        return input.origin;
      }
      if (name === 'host') {
        return input.host ?? 'localhost:5173';
      }
      return undefined;
    },
  } as Parameters<typeof publicOrigin>[0];
}

const mixed: NetworkInterfaces = {
  lo: [{ address: '127.0.0.1', family: 'IPv4', internal: true }],
  eth0: [
    { address: '10.0.0.4', family: 'IPv4', internal: false },
    { address: 'fe80::1', family: 'IPv6', internal: false },
  ],
  wiFi: [{ address: '192.168.1.70', family: 4, internal: false }],
  vpn: [{ address: '172.20.10.2', family: 'IPv4', internal: false }],
  public: [{ address: '203.0.113.8', family: 'IPv4', internal: false }],
};

describe('public origin', () => {
  it('prefers PUBLIC_URL, then the request origin, then host', () => {
    const previous = process.env.PUBLIC_URL;
    process.env.PUBLIC_URL = 'https://workout.example/';
    expect(publicOrigin(req({ origin: 'http://localhost:5173', host: 'localhost:4000' }))).toBe(
      'https://workout.example',
    );
    delete process.env.PUBLIC_URL;
    expect(publicOrigin(req({ origin: 'http://localhost:5173', host: 'localhost:4000' }))).toBe(
      'http://localhost:5173',
    );
    expect(publicOrigin(req({ host: 'localhost:8080' }))).toBe('http://localhost:8080');
    if (previous === undefined) {
      delete process.env.PUBLIC_URL;
    } else {
      process.env.PUBLIC_URL = previous;
    }
  });
});

describe('LAN origin', () => {
  it('keeps private IPv4 addresses, skips loopback and public, and prefers 192.168', () => {
    expect(privateIpv4Addresses(mixed)).toEqual(['192.168.1.70', '10.0.0.4', '172.20.10.2']);
  });

  it('uses the origin port, then the host port, and returns null without a private address', () => {
    expect(lanOrigin(req({ origin: 'http://localhost:5173', host: '127.0.0.1:4000' }), mixed)).toBe(
      'http://192.168.1.70:5173',
    );
    expect(lanOrigin(req({ host: 'localhost:8080' }), mixed)).toBe('http://192.168.1.70:8080');
    expect(requestPort(req({ host: 'localhost' }))).toBe(process.env.PORT || '80');
    expect(lanOrigin(req({ host: 'localhost:5173' }), { lo: mixed.lo })).toBeNull();
  });

  it('builds matching invite URLs and a null mobile URL without a LAN address', () => {
    const previous = process.env.PUBLIC_URL;
    delete process.env.PUBLIC_URL;
    expect(accessUrls(req({ origin: 'http://localhost:5173' }), '/invite/token', mixed)).toEqual({
      url: 'http://localhost:5173/invite/token',
      mobileUrl: 'http://192.168.1.70:5173/invite/token',
    });
    expect(accessUrls(req({ origin: 'http://localhost:5173' }), '/reset/token', {})).toEqual({
      url: 'http://localhost:5173/reset/token',
      mobileUrl: null,
    });
    if (previous === undefined) {
      delete process.env.PUBLIC_URL;
    } else {
      process.env.PUBLIC_URL = previous;
    }
  });
});
