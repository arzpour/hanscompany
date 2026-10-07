type IconProps = {
  className?: string;
};

export function InstagramIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <circle cx="12" cy="12" r="3.2" />
      <circle cx="17.2" cy="6.8" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function WhatsAppIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d="M7.2 17.8 5 19.2l.7-2.6A7.2 7.2 0 1 1 12 19.2a7.2 7.2 0 0 1-3.3-.8l-1.5.4z" />
      <path d="M9.2 9.4c.2-.4.4-.4.6-.4h.5c.2 0 .4 0 .5.4.2.5.6 1.6.6 1.7.1.2 0 .3-.1.5l-.3.4c-.1.1-.2.3 0 .6.3.4.8 1.1 1.6 1.5.6.3 1 .4 1.2.2l.5-.5c.2-.2.3-.1.5-.1.3 0 1.4.7 1.6.8.2.1.3.2.2.5-.1.4-.8 1.1-1.3 1.2-.4.1-.9.2-2.6-.5-1.5-.6-2.6-1.8-3.4-3.1-.6-1-.9-1.8-.8-2.4.1-.3.3-.6.4-.8z" />
    </svg>
  );
}

export function PhoneIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d="M8.2 5.5h2.1l1.2 3-1.5 1a12 12 0 0 0 4.5 4.5l1-1.5 3 1.2v2.1c0 .7-.5 1.3-1.2 1.4A13.5 13.5 0 0 1 6.8 6.7c.1-.7.7-1.2 1.4-1.2z" />
    </svg>
  );
}
