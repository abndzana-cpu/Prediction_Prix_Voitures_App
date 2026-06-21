import { useState } from "react";
import { IconStar } from "../icons";

export default function RatingStars({ onRate, initialRating = 0, disabled = false }) {
  const [hover, setHover] = useState(0);
  const [rating, setRating] = useState(initialRating);

  const handleClick = (value) => {
    if (disabled) return;
    setRating(value);
    onRate?.(value);
  };

  return (
    <div className="stars">
      {[1, 2, 3, 4, 5].map((value) => (
        <button
          key={value}
          type="button"
          className={`star-btn${value <= (hover || rating) ? " active" : ""}`}
          onMouseEnter={() => !disabled && setHover(value)}
          onMouseLeave={() => !disabled && setHover(0)}
          onClick={() => handleClick(value)}
          disabled={disabled}
          aria-label={`Noter ${value} étoiles`}
        >
          <IconStar filled={value <= (hover || rating)} />
        </button>
      ))}
    </div>
  );
}
