
"use client"
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DisplayRatingProps {
  rating?: number;
  ratingCount?: number;
  className?: string;
  size?: number;
  totalStars?: number;
}

export const DisplayRating = ({ rating = 0, ratingCount = 0, className, size = 16, totalStars = 5 }: DisplayRatingProps) => {
  // If ratingCount is 0, display a default rating of 4.5. Otherwise, use the actual rating.
  const displayRating = ratingCount === 0 ? 4.5 : rating;
  const fullStars = Math.round(displayRating);
  const emptyStars = totalStars - fullStars;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex items-center">
        {[...Array(fullStars)].map((_, i) => (
          <Star key={`full-${i}`} className="text-yellow-400 fill-yellow-400" size={size} />
        ))}
        {[...Array(emptyStars)].map((_, i) => (
          <Star key={`empty-${i}`} className="text-gray-300" size={size} />
        ))}
      </div>
      {ratingCount > 0 && (
        <span className="text-sm text-muted-foreground">({ratingCount} reviews)</span>
      )}
    </div>
  );
};
