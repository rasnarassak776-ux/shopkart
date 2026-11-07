import React from 'react';
import { StarIcon } from './icons';

const countFormat = new Intl.NumberFormat('en-IN');

export function Rating({ value, count }: { value: number; count: number }) {
  return (
    <div
      className="flex items-center gap-1.5 text-xs"
      aria-label={`Rated ${value.toFixed(1)} out of 5 from ${countFormat.format(count)} reviews`}
      role="img"
    >
      <span className="inline-flex items-center gap-0.5 rounded-md bg-success px-1.5 py-0.5 font-semibold text-white">
        {value.toFixed(1)}
        <StarIcon className="h-3 w-3" />
      </span>
      <span className="text-ink-muted">({countFormat.format(count)})</span>
    </div>
  );
}
