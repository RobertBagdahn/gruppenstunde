/**
 * CorporateIdentityPreview — Live preview of how CI will look in emails/letters.
 * Shows a miniature email mockup with the current CI settings applied.
 */

interface Props {
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
  slogan: string;
  greetingText: string;
  footerText: string;
  paymentInfo: string;
  signatureText: string;
}

export default function CorporateIdentityPreview({
  primaryColor,
  secondaryColor,
  logoUrl,
  slogan,
  greetingText,
  footerText,
  paymentInfo,
  signatureText,
}: Props) {
  const validPrimary = /^#[0-9a-fA-F]{6}$/.test(primaryColor) ? primaryColor : '#4a3a6b';
  const validSecondary = /^#[0-9a-fA-F]{6}$/.test(secondaryColor) ? secondaryColor : '#e8e4f0';

  return (
    <div className="rounded-xl border overflow-hidden shadow-sm max-w-md">
      {/* Email header */}
      <div
        className="px-4 py-3 flex items-center gap-3"
        style={{ backgroundColor: validPrimary }}
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Logo"
            className="w-10 h-10 object-contain rounded bg-white/20 p-0.5"
            loading="lazy"
          />
        ) : (
          <div className="w-10 h-10 rounded bg-white/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px] text-white/60">image</span>
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">Stammesname</p>
          {slogan && (
            <p className="text-xs text-white/70 truncate">{slogan}</p>
          )}
        </div>
      </div>

      {/* Email body */}
      <div className="p-4 space-y-3" style={{ backgroundColor: validSecondary }}>
        {greetingText ? (
          <p className="text-sm whitespace-pre-line">{greetingText}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">Liebe Pfadfinderinnen und Pfadfinder,</p>
        )}

        <div className="space-y-1.5">
          <div className="h-2.5 bg-foreground/10 rounded w-full" />
          <div className="h-2.5 bg-foreground/10 rounded w-5/6" />
          <div className="h-2.5 bg-foreground/10 rounded w-4/6" />
        </div>

        {signatureText && (
          <p className="text-sm whitespace-pre-line pt-2">{signatureText}</p>
        )}
      </div>

      {/* Email footer */}
      <div
        className="px-4 py-3 border-t space-y-1"
        style={{
          borderTopColor: validPrimary,
          borderTopWidth: '2px',
        }}
      >
        {footerText ? (
          <p className="text-xs text-muted-foreground whitespace-pre-line">{footerText}</p>
        ) : (
          <p className="text-xs text-muted-foreground italic">Impressum / Kontakt</p>
        )}
        {paymentInfo && (
          <p className="text-xs text-muted-foreground whitespace-pre-line border-t border-dashed pt-1 mt-1">
            {paymentInfo}
          </p>
        )}
      </div>
    </div>
  );
}
