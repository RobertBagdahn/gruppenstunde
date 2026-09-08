"""Shared SSRF protection for outbound requests to user-supplied URLs.

Recipe URL import and external image download both fetch arbitrary URLs, so
both must reject hosts that resolve to infrastructure-internal addresses.

The naive check ``ip.is_private or ip.is_loopback or ip.is_link_local or
ip.is_reserved`` is wrong in both directions:

- **False positives**: on DNS64/NAT64 networks every public host also resolves
  to ``64:ff9b::/96``, which Python classifies as ``is_reserved``. Legitimate
  imports are rejected.
- **False negatives**: ``64:ff9b::a9fe:a9fe`` embeds ``169.254.169.254`` (the
  cloud metadata endpoint) yet reports ``is_global == True``. Relaxing the
  check to ``is_global`` would expose the metadata service on Cloud Run.

Addresses that embed an IPv4 address are therefore decoded first and the
embedded address is validated instead of the container.
"""

import ipaddress
import socket

BLOCKED_HOSTNAMES = frozenset(
    {
        "localhost",
        "metadata",
        "metadata.google.internal",
    }
)

# RFC 6052 well-known prefix used by NAT64 translators.
_NAT64_WELL_KNOWN = ipaddress.IPv6Network("64:ff9b::/96")
# RFC 8215 local-use prefix. The translation prefix length is deployment
# specific, so the embedded IPv4 cannot be decoded reliably.
_NAT64_LOCAL_USE = ipaddress.IPv6Network("64:ff9b:1::/48")

IpAddress = ipaddress.IPv4Address | ipaddress.IPv6Address


def embedded_ipv4(ip: IpAddress) -> ipaddress.IPv4Address | None:
    """Return the IPv4 address embedded in an IPv6 address, if any."""
    if not isinstance(ip, ipaddress.IPv6Address):
        return None
    if ip.ipv4_mapped is not None:
        return ip.ipv4_mapped
    if ip.sixtofour is not None:
        return ip.sixtofour
    if ip in _NAT64_WELL_KNOWN:
        return ipaddress.IPv4Address(int(ip) & 0xFFFFFFFF)
    return None


def _is_blocked_plain(ip: IpAddress) -> bool:
    return ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast or ip.is_unspecified


def is_blocked_address(ip: IpAddress) -> bool:
    """Whether connecting to ``ip`` must be refused."""
    embedded = embedded_ipv4(ip)
    if embedded is not None:
        return _is_blocked_plain(embedded)
    if isinstance(ip, ipaddress.IPv6Address):
        # Local-use NAT64 and Teredo tunnel into networks we cannot vet.
        if ip in _NAT64_LOCAL_USE or ip.teredo is not None:
            return True
    return _is_blocked_plain(ip)


def resolve_public_addresses(hostname: str) -> list[IpAddress]:
    """Resolve ``hostname`` and return its addresses.

    Raises ``socket.gaierror`` when the hostname cannot be resolved.
    """
    addresses = socket.getaddrinfo(hostname, None)
    return [ipaddress.ip_address(entry[4][0]) for entry in addresses]


def hostname_is_blocked(hostname: str) -> bool:
    """Whether ``hostname`` itself is on the static blocklist."""
    return hostname.lower().rstrip(".") in BLOCKED_HOSTNAMES
