"use client";

interface CTAButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
}

export default function CTAButton({ children, onClick, href, className = "" }: CTAButtonProps) {
  const handleClick = () => {
    if (href) {
      window.open(href, "_blank");
    }
    onClick?.();
  };

  return (
    <button className={`glow-button w-full ${className}`} onClick={handleClick}>
      {children}
    </button>
  );
}
