const LOGO_SRC = '/emerge-livelihoods-logo.png';

const variantClasses = {
  sidebar: 'h-9 w-auto max-w-[180px]',
  auth: 'h-16 w-auto max-w-[280px]',
  mobile: 'h-12 w-auto max-w-[220px]',
} as const;

type BrandLogoVariant = keyof typeof variantClasses;

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  className?: string;
}

export default function BrandLogo({ variant = 'sidebar', className = '' }: BrandLogoProps) {
  return (
    <img
      src={LOGO_SRC}
      alt="Emerge Livelihoods"
      className={`object-contain ${variantClasses[variant]} ${className}`.trim()}
    />
  );
}
