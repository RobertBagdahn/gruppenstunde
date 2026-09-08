"""Tests for the shared SSRF address validation.

The regression driving these tests: on a DNS64/NAT64 network `www.chefkoch.de`
resolves to `64:ff9b::9765:c334`, which Python reports as `is_reserved`. The
previous check rejected it, so every recipe URL import failed with
`IMPORT_INVALID_URL`. Simply switching to `is_global` would have been worse,
because NAT64 addresses embedding loopback or the cloud metadata endpoint also
report `is_global == True`.
"""

import ipaddress

import pytest

from core.services.url_safety import (
    embedded_ipv4,
    hostname_is_blocked,
    is_blocked_address,
)


def _ip(value: str):
    return ipaddress.ip_address(value)


class TestEmbeddedIpv4:
    @pytest.mark.parametrize(
        ("address", "expected"),
        [
            ("64:ff9b::9765:c334", "151.101.195.52"),
            ("64:ff9b::7f00:1", "127.0.0.1"),
            ("64:ff9b::a9fe:a9fe", "169.254.169.254"),
            ("::ffff:192.168.0.1", "192.168.0.1"),
            ("2002:9765:c334::1", "151.101.195.52"),
        ],
    )
    def test_decodes_embedded_ipv4(self, address, expected):
        assert embedded_ipv4(_ip(address)) == ipaddress.IPv4Address(expected)

    @pytest.mark.parametrize("address", ["2606:4700::1111", "192.0.2.1"])
    def test_returns_none_without_embedded_ipv4(self, address):
        assert embedded_ipv4(_ip(address)) is None


class TestIsBlockedAddress:
    @pytest.mark.parametrize(
        "address",
        [
            "151.101.195.52",
            "8.8.8.8",
            "2606:4700::1111",
            # NAT64 wrapping a public IPv4 must be allowed, otherwise the
            # import is unusable on IPv6-only networks.
            "64:ff9b::9765:c334",
            "2002:9765:c334::1",
        ],
    )
    def test_allows_public_addresses(self, address):
        assert is_blocked_address(_ip(address)) is False

    @pytest.mark.parametrize(
        "address",
        [
            "127.0.0.1",
            "10.0.0.1",
            "192.168.0.1",
            "172.16.0.1",
            "169.254.169.254",
            "0.0.0.0",  # noqa: S104
            "224.0.0.1",
            "::1",
            "fe80::1",
            "fc00::1",
            "::",
        ],
    )
    def test_blocks_internal_addresses(self, address):
        assert is_blocked_address(_ip(address)) is True

    @pytest.mark.parametrize(
        ("address", "reason"),
        [
            ("64:ff9b::7f00:1", "NAT64 wrapping loopback"),
            ("64:ff9b::a9fe:a9fe", "NAT64 wrapping cloud metadata"),
            ("64:ff9b::c0a8:1", "NAT64 wrapping a private network"),
            ("64:ff9b::a00:1", "NAT64 wrapping 10.0.0.1"),
            ("::ffff:127.0.0.1", "IPv4-mapped loopback"),
            ("::ffff:169.254.169.254", "IPv4-mapped cloud metadata"),
            ("2002:7f00:1::1", "6to4 wrapping loopback"),
            ("64:ff9b:1::1", "NAT64 local-use prefix"),
            ("2001:0:1234::1", "Teredo tunnel"),
        ],
    )
    def test_blocks_tunnelled_internal_addresses(self, address, reason):
        assert is_blocked_address(_ip(address)) is True, reason


class TestHostnameIsBlocked:
    @pytest.mark.parametrize(
        "hostname",
        ["localhost", "LOCALHOST", "metadata", "metadata.google.internal", "metadata.google.internal."],
    )
    def test_blocks_known_hostnames(self, hostname):
        assert hostname_is_blocked(hostname) is True

    @pytest.mark.parametrize("hostname", ["www.chefkoch.de", "example.com"])
    def test_allows_regular_hostnames(self, hostname):
        assert hostname_is_blocked(hostname) is False
