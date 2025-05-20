// src/components/booking-room/booking-details-form.tsx
"use client";

import type { FC } from 'react';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input as UiInput } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { ParsedBookingDetails } from '@/app/actions';
import { CheckCircle, Save } from 'lucide-react';

interface BookingDetailsFormProps {
  initialDetails: ParsedBookingDetails;
  onSubmit: (details: ParsedBookingDetails) => void;
  onCancel?: () => void; // Optional: if there's a cancel action
  isLoading?: boolean;
}

const BookingDetailsForm: FC<BookingDetailsFormProps> = ({ initialDetails, onSubmit, onCancel, isLoading }) => {
  const [formData, setFormData] = useState<ParsedBookingDetails>(initialDetails);

  useEffect(() => {
    setFormData(initialDetails);
  }, [initialDetails]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'estimated_number_of_attendees' ? (value === '' ? undefined : parseInt(value, 10)) : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const detailFields: Array<{ key: keyof ParsedBookingDetails; label: string; type?: string; component?: 'textarea' }> = [
    { key: 'room', label: 'Room' },
    { key: 'date', label: 'Date', type: 'text' }, // Could be Calendar input
    { key: 'time', label: 'Time' },
    { key: 'purpose', label: 'Purpose of Booking', component: 'textarea' },
    { key: 'estimated_number_of_attendees', label: 'Est. Attendees', type: 'number' },
    { key: 'special_requirements', label: 'Special Requirements', component: 'textarea' },
    { key: 'target_email', label: 'Target Email', type: 'email' },
    { key: 'cc_email', label: 'CC Email (Optional)', type: 'email' },
    { key: 'requestorName', label: 'Requestor Name' },
    { key: 'requestorMail', label: 'Requestor Email', type: 'email' },
    { key: 'requestorMSSV', label: 'Requestor MSSV/ID' },
    { key: 'requestorRole', label: 'Requestor Role' },
    { key: 'requestorDept', label: 'Requestor Department' },
    { key: 'CLB', label: 'Club/Organization' },
  ];

  return (
    <Card className="w-full shadow-xl border-primary/20">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <CheckCircle className="text-primary" /> Review Booking Details
        </CardTitle>
        <CardDescription>
          Please verify the information below. You can make changes if needed before submitting.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6 max-h-[60vh] overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {detailFields.map(field => (
              <div key={field.key} className={field.component === 'textarea' ? 'md:col-span-2' : ''}>
                <Label htmlFor={field.key} className="text-sm font-medium text-foreground/80">
                  {field.label}
                </Label>
                {field.component === 'textarea' ? (
                  <Textarea
                    id={field.key}
                    name={field.key}
                    value={formData[field.key]?.toString() || ''}
                    onChange={handleChange}
                    rows={3}
                    className="mt-1 bg-background/50 border-border focus:border-primary"
                    disabled={isLoading}
                  />
                ) : (
                  <UiInput
                    id={field.key}
                    name={field.key}
                    type={field.type || 'text'}
                    value={formData[field.key]?.toString() || ''}
                    onChange={handleChange}
                    className="mt-1 bg-background/50 border-border focus:border-primary"
                    disabled={isLoading}
                    min={field.type === 'number' ? 1 : undefined}
                  />
                )}
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3 pt-6 border-t border-border">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isLoading} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {isLoading ? 'Submitting...' : 'Confirm & Submit Request'}
            {!isLoading && <Save size={18} className="ml-2" />}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default BookingDetailsForm;
