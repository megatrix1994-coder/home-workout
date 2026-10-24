import { networkInterfaces, type NetworkInterfaceInfo } from 'node:os';
import type { Request } from 'express';

export type NetworkAddress = Pick<NetworkInterfaceInfo, 'address' | 'family' | 'internal'>;
export type NetworkInterfaces = Record<string, NetworkAddress[] | undefined>;

function isPrivateIpv4(address: string) {
  const parts = address.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }
  const [first, second] = parts;
  if (first === 10) {
    return true;
  }
  if (first === 192 && second === 168) {
    return true;
  }
  return first === 172 && second !== undefined && second >= 16 && second <= 31;
}

function isIpv4(family: string | number) {
  return family === 'IPv4' || family === 4;
}

export function privateIpv4Addresses(interfaces: NetworkInterfaces) {
  const found: string[] = [];
  for (const list of Object.values(interfaces)) {
    for (const info of list ?? []) {
      if (info.internal || !isIpv4(info.family) || !isPrivateIpv4(info.address)) {
        continue;
      }
      found.push(info.address);
    }
  }
  return found.sort((left, right) => {
    const leftRank = left.startsWith('192.168.') ? 0 : 1;
    const rightRank = right.startsWith('192.168.') ? 0 : 1;
    return leftRank - rightRank || left.localeCompare(right);
  });
}

function portFromOrigin(origin: string | undefined) {
  if (!origin) {
    return undefined;
  }
  try {
    const parsed = new URL(origin);
    return parsed.port || undefined;
  } catch {
    return undefined;
  }
}

function portFromHost(host: string | undefined) {
  const match = host?.match(/:(\d+)$/);
  return match?.[1];
}

export function requestPort(req: Pick<Request, 'get'>) {
  return (
    portFromOrigin(req.get('origin')) ||
    portFromHost(req.get('host')) ||
    process.env.PORT ||
    '80'
  );
}

export function publicOrigin(req: Request) {
  const configured = process.env.PUBLIC_URL?.replace(/\/+$/, '');
  return configured || req.get('origin') || `${req.protocol}://${req.get('host')}`;
}

export function lanOrigin(
  req: Pick<Request, 'get' | 'protocol'>,
  interfaces: NetworkInterfaces = networkInterfaces(),
) {
  const address = privateIpv4Addresses(interfaces)[0];
  if (!address) {
    return null;
  }
  const port = portFromOrigin(publicOrigin(req as Request)) || requestPort(req);
  return `http://${address}:${port}`;
}

export function accessUrls(
  req: Request,
  path: string,
  interfaces: NetworkInterfaces = networkInterfaces(),
) {
  const lan = lanOrigin(req, interfaces);
  return {
    url: `${publicOrigin(req)}${path}`,
    mobileUrl: lan ? `${lan}${path}` : null,
  };
}
