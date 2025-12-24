"use client"
import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  size?: number;
  totalStars?: number;
}

export const RatingInput = ({ value, onChange, className, size = 24, totalStars = 5 }: RatingInputProps) => {
  const [hoverValue, setHoverValue] = useState(0);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {[...Array(totalStars)].map((_, i) => {
        const ratingValue = i + 1;
        return (
          <button
            type="button"
            key={i}
            onClick={() => onChange(ratingValue)}
            onMouseEnter={() => setHoverValue(ratingValue)}
            onMouseLeave={() => setHoverValue(0)}
            className="focus:outline-none"
          >
            <Star
              size={size}
              className={cn(
                "cursor-pointer transition-colors",
                ratingValue <= (hoverValue || value) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
              )}
            />
          </button>
        )
      })}
    </div>
  )
}
