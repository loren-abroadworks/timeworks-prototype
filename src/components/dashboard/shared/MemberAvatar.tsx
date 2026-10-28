import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { avatarBorder, cn, initial } from "@/lib/utils";

/**
 * Round avatar with an alternating ring color (amber on even rows, teal on odd rows),
 * as used in every Manager View list.
 */
export function MemberAvatar({
  name,
  src,
  index,
  className = "size-8 mr-2 border-2",
  fallbackClassName = "text-brand-blue text-xs font-semibold",
}: {
  name: string;
  src?: string | null;
  index: number;
  className?: string;
  fallbackClassName?: string;
}) {
  return (
    <Avatar className={cn(className, avatarBorder(index))}>
      {src ? <AvatarImage src={src} alt={name} /> : null}
      <AvatarFallback className={fallbackClassName}>{initial(name)}</AvatarFallback>
    </Avatar>
  );
}
