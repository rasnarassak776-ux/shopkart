'use client';

import React from 'react';
import { Badge } from '@/components/ui';
import type { OrderStatus, PaymentStatus } from '../types';

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  switch (status) {
    case 'PENDING':
      return (
        <Badge variant="warning" className={className}>
          Pending
        </Badge>
      );
    case 'CONFIRMED':
      return (
        <Badge variant="accent" className={className}>
          Confirmed
        </Badge>
      );
    case 'PROCESSING':
      return (
        <Badge variant="accent" className={className}>
          Processing
        </Badge>
      );
    case 'SHIPPED':
      return (
        <Badge variant="accent" className={className}>
          Shipped
        </Badge>
      );
    case 'DELIVERED':
      return (
        <Badge variant="success" className={className}>
          Delivered
        </Badge>
      );
    case 'CANCELLED':
      return (
        <Badge variant="neutral" className={className}>
          Cancelled
        </Badge>
      );
    default:
      return (
        <Badge variant="neutral" className={className}>
          {status}
        </Badge>
      );
  }
}

interface PaymentStatusBadgeProps {
  status?: PaymentStatus;
  method?: string;
  className?: string;
}

export function PaymentStatusBadge({
  status,
  method,
  className,
}: PaymentStatusBadgeProps) {
  if (!status) return null;

  switch (status) {
    case 'COD_PENDING':
      return (
        <span
          className={`inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/20 ${className || ''}`}
        >
          COD • Pending
        </span>
      );
    case 'COD_COLLECTED':
    case 'PAID':
      return (
        <span
          className={`inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-600/20 ${className || ''}`}
        >
          {method === 'COD' ? 'COD • Collected' : 'Paid'}
        </span>
      );
    case 'FAILED':
      return (
        <span
          className={`inline-flex items-center rounded-md bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-800 ring-1 ring-inset ring-rose-600/20 ${className || ''}`}
        >
          Payment Failed
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center rounded-md bg-gray-50 px-2 py-0.5 text-xs font-semibold text-gray-700 ring-1 ring-inset ring-gray-600/20 ${className || ''}`}
        >
          {status}
        </span>
      );
  }
}
