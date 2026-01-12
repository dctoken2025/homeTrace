'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { FormInput } from '@/components/ui/FormInput';
import { formatPhoneNumber } from '@/lib/phone-mask';
import { emailSchema, nameSchema, phoneSchema } from '@/lib/validations';

const inviteClientSchema = z.object({
  name: nameSchema.optional().or(z.literal('')),
  email: emailSchema,
  phone: phoneSchema.or(z.literal('')),
  expiresInDays: z.number().min(1).max(30),
});

type InviteClientFormData = z.infer<typeof inviteClientSchema>;

interface InviteClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialEmail?: string;
}

interface InviteResult {
  token: string;
  email: string;
  name: string | null;
}

export default function InviteClientModal({
  isOpen,
  onClose,
  onSuccess,
  initialEmail = '',
}: InviteClientModalProps) {
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null);
  const [copied, setCopied] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    setError,
    reset,
    setValue,
  } = useForm<InviteClientFormData>({
    resolver: zodResolver(inviteClientSchema),
    mode: 'onBlur',
    defaultValues: {
      name: '',
      email: initialEmail,
      phone: '',
      expiresInDays: 7,
    },
  });

  useEffect(() => {
    if (initialEmail) {
      setValue('email', initialEmail);
    }
  }, [initialEmail, setValue]);

  const onSubmit = async (formData: InviteClientFormData) => {
    try {
      const response = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name || undefined,
          phone: formData.phone || undefined,
          expiresInDays: formData.expiresInDays,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError('root', { message: data.error?.message || 'Failed to send invite' });
        return;
      }

      setInviteResult({
        token: data.data.invite.token,
        email: data.data.invite.email,
        name: data.data.invite.name,
      });
      onSuccess?.();
    } catch {
      setError('root', { message: 'Failed to send invite' });
    }
  };

  const copyInviteLink = () => {
    if (!inviteResult) return;
    const link = `${window.location.origin}/accept-invite?token=${inviteResult.token}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    reset({ name: '', email: '', phone: '', expiresInDays: 7 });
    setInviteResult(null);
    setCopied(false);
    onClose();
  };

  const handleSendAnother = () => {
    reset({ name: '', email: '', phone: '', expiresInDays: 7 });
    setInviteResult(null);
    setCopied(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={inviteResult ? 'Invitation Created!' : 'Invite Client'}
      description={inviteResult ? undefined : 'Send an invitation to your client to join HomeTrace'}
      size="md"
    >
      {inviteResult ? (
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-gray-600 mb-4">
            Share this link with {inviteResult.name || inviteResult.email}:
          </p>
          <div className="bg-gray-50 p-3 rounded-lg mb-4">
            <code className="text-sm text-gray-800 break-all">
              {typeof window !== 'undefined' && `${window.location.origin}/accept-invite?token=${inviteResult.token}`}
            </code>
          </div>
          <div className="flex gap-3 justify-center">
            <Button onClick={copyInviteLink} variant="outline">
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>
            <Button onClick={handleSendAnother} variant="secondary">
              Send Another
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {errors.root && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {errors.root.message}
            </div>
          )}

          <FormInput
            id="name"
            label="Client Name"
            placeholder="John Smith"
            {...register('name')}
            error={errors.name}
          />

          <FormInput
            id="email"
            label="Email Address"
            type="email"
            placeholder="john@example.com"
            {...register('email')}
            error={errors.email}
          />

          <Controller
            name="phone"
            control={control}
            render={({ field }) => (
              <FormInput
                id="phone"
                label="Phone Number"
                type="tel"
                placeholder="(512) 555-0123"
                value={field.value || ''}
                onChange={(e) => field.onChange(formatPhoneNumber(e.target.value))}
                onBlur={field.onBlur}
                error={errors.phone}
              />
            )}
          />

          <Controller
            name="expiresInDays"
            control={control}
            render={({ field }) => (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expires In
                </label>
                <select
                  value={field.value}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006AFF]"
                >
                  <option value={1}>1 day</option>
                  <option value={3}>3 days</option>
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                </select>
              </div>
            )}
          />

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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Send Invitation
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
