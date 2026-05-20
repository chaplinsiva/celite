import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Check } from "lucide-react";

interface PricingCardProps {
  title: string;
  price: string;
  description: string;
  features: string[];
  highlight?: boolean;
  highlightLabel?: string;
  buttonVariant?: "default" | "outline";
  buttonHref?: string;
  buttonText?: string;
}

export function PricingCard({
  title,
  price,
  description,
  features,
  highlight = false,
  buttonVariant = "outline",
  buttonHref = "",
  buttonText = "Get Started",
}: PricingCardProps) {
  return (
    <div
      className={`flex flex-col justify-between h-full ${
        highlight 
          ? "bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-xl w-full md:w-[calc(33.333%-1rem)] p-6 md:p-8" 
          : "flex-1 border border-white/10 bg-black/20 rounded-lg p-6 w-full md:w-[calc(33.333%-1rem)]"
      }`}
    >
      <div className="space-y-4 mb-6">
        <div>
          <h2 className="font-medium text-white text-lg mb-2">{title}</h2>
          <span className="block text-2xl font-semibold text-white mb-2">{price}</span>
          <p className="text-zinc-400 text-sm">{description}</p>
        </div>

        <Button asChild className="w-full mt-4" variant={buttonVariant}>
          <Link href={buttonHref}>{buttonText}</Link>
        </Button>
      </div>

      {highlight && (
        <div className="mb-4">
          <div className="text-sm font-medium text-white">Includes:</div>
        </div>
      )}

      <ul className={`${highlight ? "mt-0" : "border-t border-white/10 pt-4"} space-y-3 text-sm flex-1`}>
        {features.map((item, index) => (
          <li key={index} className="flex items-start gap-2 text-zinc-300">
            <Check className="size-4 text-white flex-shrink-0 mt-0.5" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

