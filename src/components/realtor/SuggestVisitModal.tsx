'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

const suggestVisitSchema = z.object({
  suggestedDate: z.string().min(1, 'Date is required'),
  suggestedTime: z.string().min(1, 'Time is required'),
  message: z.string().max(500).optional(),
});

type SuggestVisitFormData = z.infer<typeof suggestVisitSchema>;

interface HouseInfo {
  id: string;
  address: string;
  city: string;
  state: string;
  images?: string[];
  price?: number | null;
}

interface BuyerInfo {
  id: string;
  name: string;
  email: string;
}

interface SuggestVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  houseBuyerId: string;
  house: HouseInfo;
  buyer: BuyerInfo;
}

export default function SuggestVisitModal({
  isOpen,
  onClose,
  onSuccess,
  houseBuyerId,
  house,
  buyer,
}: SuggestVisitModalProps) {
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    setError,
    reset,
  } = useForm<SuggestVisitFormData>({
    resolver: zodResolver(suggestVisitSchema),
    mode: 'onBlur',
    defaultValues: {
      suggestedDate: '',
      suggestedTime: '',
      message: '',
    },
  });

  // Get tomorrow's date as minimum
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  const onSubmit = async (formData: SuggestVisitFormData) => {
    try {
      // Combine date and time into ISO string
      const suggestedAt = new Date(`${formData.suggestedDate}T${formData.suggestedTime}`).toISOString();

      const response = await fetch('/api/visits/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          houseBuyerId,
          suggestedAt,
          message: formData.message || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError('root', { message: data.error?.message || 'Failed to send suggestion' });
        return;
      }

      setSuccess(true);
      onSuccess?.();
    } catch {
      setError('root', { message: 'Failed to send suggestion' });
    }
  };

  const handleClose = () => {
    reset();
    setSuccess(false);
    onClose();
  };

  const formatPrice = (price: number | null | undefined) => {
    if (!price) return null;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={success ? 'Suggestion Sent!' : 'Suggest Visit'}
      description={success ? undefined : `Suggest a visit time for ${buyer.name || buyer.email}`}
      size="md"
    >
      {success ? (
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-gray-600 mb-2">
            Your visit suggestion has been sent to <strong>{buyer.name || buyer.email}</strong>.
          </p>
          <p className="text-gray-500 text-sm mb-6">
            They will receive an email notification and can accept or decline from their calendar.
          </p>
          <Button onClick={handleClose}>
            Done
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {errors.root && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {errors.root.message}
            </div>
          )}

          {/* House Preview */}
          <div className="bg-gray-50 rounded-lg p-4 flex gap-4">
            {house.images?.[0] && (
              <img
                src={house.images[0]}
                alt={house.address}
                className="w-20 h-20 object-cover rounded-lg"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{house.address}</p>
              <p className="text-sm text-gray-500">{house.city}, {house.state}</p>
              {house.price && (
                <p className="text-sm font-medium text-[#006AFF] mt-1">
                  {formatPrice(house.price)}
                </p>
              )}
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Suggested Date
              </label>
              <input
                type="date"
                min={minDate}
                {...register('suggestedDate')}
                className={`
                  w-full px-3 py-2 border rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-[#006AFF]
                  ${errors.suggestedDate ? 'border-red-500' : 'border-gray-300'}
                `}
              />
              {errors.suggestedDate && (
                <p className="text-red-500 text-xs mt-1">{errors.suggestedDate.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Suggested Time
              </label>
              <input
                type="time"
                {...register('suggestedTime')}
                className={`
                  w-full px-3 py-2 border rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-[#006AFF]
                  ${errors.suggestedTime ? 'border-red-500' : 'border-gray-300'}
                `}
              />
              {errors.suggestedTime && (
                <p className="text-red-500 text-xs mt-1">{errors.suggestedTime.message}</p>
              )}
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message (optional)
            </label>
            <textarea
              {...register('message')}
              rows={3}
              placeholder="Add a note for your client..."
              className={`
                w-full px-3 py-2 border rounded-lg resize-none
                focus:outline-none focus:ring-2 focus:ring-[#006AFF]
                ${errors.message ? 'border-red-500' : 'border-gray-300'}
              `}
            />
            {errors.message && (
              <p className="text-red-500 text-xs mt-1">{errors.message.message}</p>
            )}
          </div>

          {/* Note about expiration */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            <div className="flex gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p>
                This suggestion will expire automatically 24 hours before the suggested time if not responded.
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? (
                'Sending...'
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Send Suggestion
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
