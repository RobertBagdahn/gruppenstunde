/**
 * Guest identity of a shopping list joined through an invitation link.
 * The secret lives only in this browser (localStorage); it is sent as `X-Guest-Token`.
 */
export interface GuestCredentials {
  /** Secret that proves this device joined the list. */
  guestToken: string;
  /** Name the others see next to entries and checkmarks. */
  name: string;
  /** Invitation link token, to find the way back to the join page. */
  shareToken: string;
}

const key = (listId: number) => `inspi.shopping.guest.${listId}`;

export function getGuestCredentials(listId: number): GuestCredentials | null {
  try {
    const raw = window.localStorage.getItem(key(listId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GuestCredentials>;
    if (typeof parsed.guestToken !== 'string' || typeof parsed.name !== 'string') return null;
    return { guestToken: parsed.guestToken, name: parsed.name, shareToken: parsed.shareToken ?? '' };
  } catch {
    return null;
  }
}

export function saveGuestCredentials(listId: number, credentials: GuestCredentials): void {
  try {
    window.localStorage.setItem(key(listId), JSON.stringify(credentials));
  } catch {
    // Private mode: the guest has to rejoin after a reload.
  }
}

export function clearGuestCredentials(listId: number): void {
  try {
    window.localStorage.removeItem(key(listId));
  } catch {
    // Nothing stored.
  }
}

/** Request headers that identify a guest on this list (empty for members). */
export function guestHeaders(listId: number): Record<string, string> {
  const credentials = getGuestCredentials(listId);
  return credentials ? { 'X-Guest-Token': credentials.guestToken } : {};
}
