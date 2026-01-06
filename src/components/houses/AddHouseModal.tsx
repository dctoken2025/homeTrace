'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface AddHouseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (url: string) => void;
}

export default function AddHouseModal({ isOpen, onClose, onAdd }: AddHouseModalProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    if (!url.includes('zillow.com')) {
      setError('Please enter a valid Zillow URL');
      return;
    }

    onAdd(url);
    setUrl('');
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add House" size="md">
      <form onSubmit={handleSubmit}>
        <p className="text-sm text-gray-600 mb-4">
          Paste the Zillow URL of the house you want to add to your list.
        </p>

        <Input
          label="Zillow URL"
          placeholder="https://www.zillow.com/homedetails/..."
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setError('');
          }}
          error={error}
        />

        <div className="flex justify-end gap-3 mt-6">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            Add House
          </Button>
        </div>
      </form>
    </Modal>
  );
}
