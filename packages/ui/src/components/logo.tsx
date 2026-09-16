import { cn } from "@workspace/ui/lib/utils";
import logoImg from "../assets/logo.png";

interface LogoProps {
  className?: string;
  showText?: boolean;
  imageClassName?: string;
}

const Logo = ({ className, showText = true, imageClassName }: LogoProps) => {
  const logoSrc =
    typeof logoImg === "string"
      ? logoImg
      : (logoImg as { src?: string })?.src || logoImg;

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 select-none",
        className,
      )}
    >
      <img
        src={logoSrc}
        alt="Penna Logo"
        className={cn(
          "h-6 w-auto object-contain invert dark:invert-0",
          imageClassName,
        )}
      />
      {showText && (
        <span className="font-semibold text-xl leading-none tracking-tight text-black dark:text-white">
          penna
        </span>
      )}
    </div>
  );
};

export default Logo;
