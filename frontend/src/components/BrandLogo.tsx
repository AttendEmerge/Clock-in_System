const LOGO_SRC = '/emerge-livelihoods-logo.png';

const variantClasses = {
  sidebar: 'h-[4.5rem] w-auto max-w-[360px]',
  auth: 'h-32 w-auto max-w-[560px]',
  mobile: 'h-24 w-auto max-w-[440px]',
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
